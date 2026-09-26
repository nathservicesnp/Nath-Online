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
 return {...d,...Object.fromEntries(fields.map(k=>[k,d[k].trim()]))};
}
// This handler is called only after signature, audience and owner allowlist validation.
export async function adminApi(request,env,url,actor,readBody){
 if(!actor)return reply({error:'Admin sign-in required'},401);
 if(!env.DB||env.MANAGEMENT_ENABLED!=='true')return reply({error:'Request management is not enabled yet'},503);
 const mutation=!['GET','HEAD'].includes(request.method);
 if(mutation&&(request.headers.get('Origin')!==url.origin||request.headers.get('X-Nath-Admin')!=='1'))return reply({error:'Request not allowed'},403);
 const path=url.pathname.replace(/^\/admin\/api/,'');
 const finance=await financeApi(request,env,path,actor,readBody);if(finance)return finance;
 if(path==='/me'&&request.method==='GET')return reply({email:actor.email});
 if(path==='/requests'&&request.method==='GET'){
  const q=(url.searchParams.get('q')||'').trim().slice(0,100),status=url.searchParams.get('status')||'';
  if(status&&!statuses.has(status))return reply({error:'Invalid status'},400);
  const page=Math.max(0,Math.min(10000,Number(url.searchParams.get('page'))||0));
  const where="WHERE (?='' OR status=?) AND (?='' OR instr(lower(reference),lower(?))>0 OR instr(phone,?)>0 OR instr(lower(name),lower(?))>0)";
  const rows=await env.DB.prepare(`SELECT reference,name,phone,service,service_id,status,outcome,created_at,updated_at,version FROM enquiries ${where} ORDER BY created_at DESC,reference DESC LIMIT 51 OFFSET ?`).bind(status,status,q,q,q,q,Math.floor(page)*50).all();
  return reply({requests:rows.results.slice(0,50),hasMore:rows.results.length>50});
 }
 const match=path.match(/^\/requests\/(NOS-[A-F0-9]{24})$/);
 if(match&&request.method==='GET'){
  const record=await env.DB.prepare('SELECT reference,name,phone,service,service_id,service_title,message,status,outcome,internal_note,version,created_at,updated_at,closed_at FROM enquiries WHERE reference=?').bind(match[1]).first();
  if(!record)return reply({error:'Request not found'},404);
  const events=await env.DB.prepare('SELECT actor,action,from_status,to_status,outcome,created_at FROM request_events WHERE reference=? ORDER BY id DESC LIMIT 100').bind(match[1]).all();
  return reply({record,events:events.results});
 }
 if(match&&request.method==='PATCH'){
  const parsed=await readBody(request);if(parsed.error)return parsed.error;const d=parsed.data;
  if(!statuses.has(d.status)||!outcomes.has(d.outcome)||!Number.isInteger(d.version)||d.version<0||typeof d.internal_note!=='string'||d.internal_note.length>3000||(d.status!=='closed'&&d.outcome!=='')||(d.status==='closed'&&!d.outcome))return reply({error:'Check status, closing result and notes'},422);
  const batch=await env.DB.batch([
   env.DB.prepare("INSERT INTO request_events(reference,actor,action,from_status,to_status,outcome) SELECT reference,?,'update',status,?,? FROM enquiries WHERE reference=? AND version=?").bind(actor.email,d.status,d.outcome,match[1],d.version),
   env.DB.prepare("UPDATE enquiries SET status=?,outcome=?,internal_note=?,version=version+1,updated_at=datetime('now'),closed_at=CASE WHEN ?='closed' THEN COALESCE(closed_at,datetime('now')) ELSE NULL END WHERE reference=? AND version=?").bind(d.status,d.outcome,d.internal_note,d.status,match[1],d.version)
  ]);
  if(batch[1].meta.changes!==1)return reply({error:'This request changed. Reload before saving.'},409);
  return reply({saved:true});
 }
 if(path==='/services'&&request.method==='GET')return reply({services:(await env.DB.prepare('SELECT * FROM service_catalog ORDER BY sort_order,id').all()).results});
 if(path==='/services'&&request.method==='POST'){
  const parsed=await readBody(request);if(parsed.error)return parsed.error;const d=validateService(parsed.data);if(!d)return reply({error:'Check both languages, category, price and service items'},422);
  if(d.version===0){
   const result=await env.DB.batch([
    env.DB.prepare('INSERT INTO service_catalog(id,category,icon,title_en,title_ne,description_en,description_ne,note_en,note_ne,items_json,starting_price,active,version,last_actor) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,?) ON CONFLICT(id) DO NOTHING').bind(d.id,d.category,d.icon,d.title_en,d.title_ne,d.description_en,d.description_ne,d.note_en,d.note_ne,JSON.stringify(d.items),d.starting_price,+d.active,actor.email),
    env.DB.prepare("INSERT INTO service_events(service_id,actor,action,version) SELECT id,?,'create',version FROM service_catalog WHERE id=? AND changes()=1").bind(actor.email,d.id)
   ]);if(result[0].meta.changes!==1)return reply({error:'That service ID already exists'},409);
  }else{
   const result=await env.DB.batch([
    env.DB.prepare("UPDATE service_catalog SET category=?,icon=?,title_en=?,title_ne=?,description_en=?,description_ne=?,note_en=?,note_ne=?,items_json=?,starting_price=?,active=?,version=version+1,last_actor=?,updated_at=datetime('now') WHERE id=? AND version=?").bind(d.category,d.icon,d.title_en,d.title_ne,d.description_en,d.description_ne,d.note_en,d.note_ne,JSON.stringify(d.items),d.starting_price,+d.active,actor.email,d.id,d.version),
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
