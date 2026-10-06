import {suggestionAdmin} from './suggestions.mjs';
import {requestFilters} from './request-filters.mjs';
import {replyTemplateApi} from './reply-templates.mjs';
import {conversationApi} from './conversation.mjs';
import {contentApi} from './website-content.mjs';
import {recordsApi} from './records-api.mjs';
import {financeApi} from './finance-api.mjs';
import {passkeyAdministrator} from './passkey-auth.mjs';
import {createRemoteJWKSet,jwtVerify} from 'jose';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
const statuses=new Set(['new','contacted','in_progress','closed']);
const outcomes=new Set(['','completed','cancelled','declined']);
const categories=new Set(['government','utilities','travel','banking','education','other']);
const icons=new Set(['building','bolt','ticket','wallet','book','chat']);
const slug=/^[a-z][a-z0-9-]{1,59}$/;
export async function administrator(request,env){
 if(env.ADMIN_AUTH==='passkey')return passkeyAdministrator(request,env);
 if(env.ADMIN_ENABLED!=='true'||!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD||!env.ADMIN_EMAILS)return null;
 if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN))return null;
 const token=request.headers.get('Cf-Access-Jwt-Assertion');if(!token)return null;
 try{
  const issuer=`https://${env.ACCESS_TEAM_DOMAIN}`;
  const keys=createRemoteJWKSet(new URL(issuer+'/cdn-cgi/access/certs'),{timeoutDuration:5000});
  const {payload}=await jwtVerify(token,keys,{issuer,audience:env.ACCESS_AUD,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email']});
  const email=typeof payload.email==='string'?payload.email.toLowerCase():'';
  if(!env.ADMIN_EMAILS.split(',').map(x=>x.trim().toLowerCase()).includes(email))return null;
  return {email,sub:payload.sub};
 }catch{return null;}
}
export function validateService(d){
 const fields=['title_en','title_ne','description_en','description_ne','note_en','note_ne'];
 if(!slug.test(d.id||'')||!categories.has(d.category)||!icons.has(d.icon)||!Number.isInteger(d.version)||d.version<0||typeof d.active!=='boolean')return null;
 if(fields.some(k=>typeof d[k]!=='string'||!d[k].trim()||d[k].length>(k.startsWith('title')?120:1500)))return null;
 if(!Array.isArray(d.items)||d.items.length<1||d.items.length>20||d.items.some(a=>!Array.isArray(a)||a.length!==2||a.some(x=>typeof x!=='string'||!x.trim()||x.length>200)))return null;
 if(!Number.isInteger(d.starting_price)||d.starting_price<100||d.starting_price>1000000)return null;
 if(d.sort_order!==undefined&&(!Number.isInteger(d.sort_order)||d.sort_order<0||d.sort_order>9999))return null;
 if(!['available','paused','soon'].includes(d.availability??'available'))return null;
 return {...d,availability:d.availability??'available',...Object.fromEntries(fields.map(k=>[k,d[k].trim()]))};
}
// This handler is called only after signature, audience and owner allowlist validation.
export async function adminApi(request,env,url,actor,readBody){
 if(!actor)return reply({error:'Admin sign-in required'},401);
 if(!env.DB||env.MANAGEMENT_ENABLED!=='true')return reply({error:'Request management is not enabled yet'},503);
 const mutation=!['GET','HEAD'].includes(request.method);
 if(mutation&&(request.headers.get('Origin')!==url.origin||request.headers.get('X-Nath-Admin')!=='1'))return reply({error:'Request not allowed'},403);
 const path=url.pathname.replace(/^\/admin\/api/,'');
 const suggestions=await suggestionAdmin(request,env,url,readBody);if(suggestions)return suggestions;
 const templates=await replyTemplateApi(request,env,path,readBody);if(templates)return templates;
 const messages=await conversationApi(request,env,path,actor,readBody);if(messages)return messages;
 const content=await contentApi(request,env,path,readBody);if(content)return content;
 const records=await recordsApi(request,env,url);if(records)return records;
 const finance=await financeApi(request,env,path,actor,readBody);if(finance)return finance;
 if(path==='/attention'&&request.method==='GET'){const rows=await env.DB.prepare("SELECT reference,status,follow_up_at,updated_at,(SELECT sender FROM request_messages m WHERE m.reference=enquiries.reference ORDER BY id DESC LIMIT 1) AS last_sender FROM enquiries WHERE status<>'closed' AND (status='new' OR follow_up_at<=datetime('now') OR (SELECT sender FROM request_messages m WHERE m.reference=enquiries.reference ORDER BY id DESC LIMIT 1)='customer') ORDER BY CASE WHEN follow_up_at<=datetime('now') THEN 0 WHEN (SELECT sender FROM request_messages m WHERE m.reference=enquiries.reference ORDER BY id DESC LIMIT 1)='customer' THEN 1 ELSE 2 END,updated_at,reference LIMIT 51").all();return reply({requests:rows.results.slice(0,50),hasMore:rows.results.length>50});}
 if(path==='/follow-ups'&&request.method==='GET'){const rows=await env.DB.prepare("SELECT reference,follow_up_at FROM enquiries WHERE status<>'closed' AND follow_up_at IS NOT NULL AND follow_up_at<=datetime('now','+1 day') ORDER BY follow_up_at,reference LIMIT 51").all();return reply({reminders:rows.results.slice(0,50),hasMore:rows.results.length>50});}
 if(path==='/me'&&request.method==='GET')return reply({email:actor.email});
 if(path==='/requests'&&request.method==='GET'){
  const filter=requestFilters(url.searchParams);if(filter.error)return reply({error:filter.error},400);
  const {where,page,args}=filter;
  const rows=await env.DB.prepare(`SELECT (SELECT sender FROM request_messages m WHERE m.reference=enquiries.reference ORDER BY id DESC LIMIT 1) AS last_message_sender,reference,name,phone,service,service_id,status,outcome,waiting_customer,created_at,updated_at,version FROM enquiries ${where} ORDER BY created_at DESC,reference DESC LIMIT 51 OFFSET ?`).bind(...args,page*50).all();
  return reply({requests:rows.results.slice(0,50),hasMore:rows.results.length>50});
 }
 const match=path.match(/^\/requests\/(NOS-[A-F0-9]{24})$/);
 if(match&&request.method==='GET'){
  const record=await env.DB.prepare('SELECT reference,name,phone,service,service_id,service_title,message,status,outcome,internal_note,callback_window,follow_up_at,version,created_at,updated_at,closed_at FROM enquiries WHERE reference=?').bind(match[1]).first();
  if(!record)return reply({error:'Request not found'},404);
  const events=await env.DB.prepare('SELECT actor,action,from_status,to_status,outcome,created_at FROM request_events WHERE reference=? ORDER BY id DESC LIMIT 100').bind(match[1]).all();
  return reply({record,events:events.results});
 }
 if(match&&request.method==='PATCH'){
  const parsed=await readBody(request);if(parsed.error)return parsed.error;const d=parsed.data;
  if(!statuses.has(d.status)||!outcomes.has(d.outcome)||!Number.isInteger(d.version)||d.version<0||typeof d.internal_note!=='string'||d.internal_note.length>3000||(d.status!=='closed'&&d.outcome!=='')||(d.status==='closed'&&!d.outcome))return reply({error:'Check status, closing result and notes'},422);
  let follow=d.follow_up_at;if(follow!==undefined&&follow!==null&&(typeof follow!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(follow)||!Number.isFinite(Date.parse(follow))||new Date(follow).toISOString()!==follow))return reply({error:'Invalid follow-up time'},422);
  follow=follow?follow.replace('T',' ').slice(0,19):null;
  const batch=await env.DB.batch([
   env.DB.prepare("INSERT INTO request_events(reference,actor,action,from_status,to_status,outcome) SELECT reference,?,'update',status,?,? FROM enquiries WHERE reference=? AND version=?").bind(actor.email,d.status,d.outcome,match[1],d.version),
   env.DB.prepare("UPDATE enquiries SET status=?,outcome=?,internal_note=?,follow_up_at=CASE WHEN ?=1 THEN ? ELSE follow_up_at END,version=version+1,updated_at=datetime('now'),closed_at=CASE WHEN ?='closed' THEN COALESCE(closed_at,datetime('now')) ELSE NULL END WHERE reference=? AND version=?").bind(d.status,d.outcome,d.internal_note,d.follow_up_at===undefined?0:1,follow,d.status,match[1],d.version)
  ]);
  if(batch[1].meta.changes!==1)return reply({error:'This request changed. Reload before saving.'},409);
  return reply({saved:true});
 }
 if(path==='/services'&&request.method==='GET')return reply({services:(await env.DB.prepare('SELECT * FROM service_catalog ORDER BY sort_order,id').all()).results});
 if(path==='/services'&&request.method==='POST'){
  const parsed=await readBody(request);if(parsed.error)return parsed.error;const d=validateService(parsed.data);if(!d)return reply({error:'Check both languages, category, price and service items'},422);
  if(d.version===0){
   const result=await env.DB.batch([
    env.DB.prepare('INSERT INTO service_catalog(id,category,icon,title_en,title_ne,description_en,description_ne,note_en,note_ne,items_json,starting_price,active,version,last_actor,availability,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?) ON CONFLICT(id) DO NOTHING').bind(d.id,d.category,d.icon,d.title_en,d.title_ne,d.description_en,d.description_ne,d.note_en,d.note_ne,JSON.stringify(d.items),d.starting_price,+d.active,actor.email,d.availability,d.sort_order??0),
    env.DB.prepare("INSERT INTO service_events(service_id,actor,action,version) SELECT id,?,'create',version FROM service_catalog WHERE id=? AND changes()=1").bind(actor.email,d.id)
   ]);if(result[0].meta.changes!==1)return reply({error:'That service ID already exists'},409);
  }else{
   const result=await env.DB.batch([
    env.DB.prepare("UPDATE service_catalog SET category=?,icon=?,title_en=?,title_ne=?,description_en=?,description_ne=?,note_en=?,note_ne=?,items_json=?,starting_price=?,active=?,availability=?,sort_order=COALESCE(?,sort_order),version=version+1,last_actor=?,updated_at=datetime('now') WHERE id=? AND version=?").bind(d.category,d.icon,d.title_en,d.title_ne,d.description_en,d.description_ne,d.note_en,d.note_ne,JSON.stringify(d.items),d.starting_price,+d.active,d.availability,d.sort_order??null,actor.email,d.id,d.version),
    env.DB.prepare("INSERT INTO service_events(service_id,actor,action,version) SELECT id,?,'update',version FROM service_catalog WHERE id=? AND changes()=1").bind(actor.email,d.id)
   ]);if(result[0].meta.changes!==1)return reply({error:'This service changed. Reload before saving.'},409);
  }return reply({saved:true});
 }
 const serviceMatch=path.match(/^\/services\/([a-z][a-z0-9-]{1,59})$/);
 if(serviceMatch&&request.method==='DELETE'){
  const parsed=await readBody(request);if(parsed.error)return parsed.error;const d=parsed.data;if(!Number.isInteger(d.version))return reply({error:'Version required'},422);
  const result=await env.DB.batch([
   env.DB.prepare("UPDATE service_catalog SET active=0,version=version+1,last_actor=?,updated_at=datetime('now') WHERE id=? AND version=?").bind(actor.email,serviceMatch[1],d.version),
   env.DB.prepare("INSERT INTO service_events(service_id,actor,action,version) SELECT id,?,'remove_from_catalog',version FROM service_catalog WHERE id=? AND changes()=1").bind(actor.email,serviceMatch[1])
  ]);return result[0].meta.changes===1?reply({saved:true}):reply({error:'This service changed. Reload before removing.'},409);
 }
 return reply({error:'Not found'},404);
}
