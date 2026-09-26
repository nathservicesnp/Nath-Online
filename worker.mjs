import {passkeyAuth,cleanAuth} from './passkey-auth.mjs';
import {administrator,adminApi} from './admin-api.mjs';
import {catalogPage} from './catalog.mjs';
const allowedServices=new Set(['government','utilities','travel','banking','education','other']);
const origin='https://www.nathonline.com.np';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const phoneOf=value=>typeof value==='string'?value.replace(/[\s()-]/g,'').replace(/^\+977/,''):'';
const digest=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function readBody(request){
 if(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()!=='application/json')return {error:json({error:'JSON required'},415)};
 const reader=request.body?.getReader();if(!reader)return {error:json({error:'Body required'},400)};let length=0;const chunks=[];
 while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>8192){await reader.cancel();return {error:json({error:'Request too large'},413)};}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}try{const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));return data&&typeof data==='object'&&!Array.isArray(data)?{data}:{error:json({error:'Invalid body'},400)};}catch{return {error:json({error:'Invalid JSON'},400)};}
}
async function api(request,env,url){
 if(!['/api/requests','/api/track'].includes(url.pathname))return json({error:'Not found'},404);
 if(request.method!=='POST'){const r=json({error:'Method not allowed'},405);r.headers.set('Allow','POST');return r;}
 if(request.headers.get('Origin')!==(env.APP_ENV==='production'?origin:url.origin))return json({error:'Origin not allowed'},403);
 if(!env.DB||!env.REQUEST_LIMITER||env.SUBMISSIONS_ENABLED!=='true')return json({error:'Temporarily unavailable'},503);
 const limit=await env.REQUEST_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'local'});if(!limit.success){const r=json({error:'Please wait'},429);r.headers.set('Retry-After','60');return r;}
 const parsed=await readBody(request);if(parsed.error)return parsed.error;const d=parsed.data,phone=phoneOf(d.phone);
 if(url.pathname==='/api/track'){
  if(typeof d.reference!=='string'||!/^NOS-[A-F0-9]{24}$/i.test(d.reference.trim())||!/^9[678]\d{8}$/.test(phone))return json({status:null});
  const reference=d.reference.trim().toUpperCase();
  if(env.MANAGEMENT_ENABLED==='true'){
   const row=await env.DB.prepare('SELECT status,outcome,created_at,updated_at FROM enquiries WHERE reference=? AND phone=?').bind(reference,phone).first();
   if(!row)return json({status:null});
   const history=await env.DB.prepare('SELECT to_status AS status,outcome,created_at FROM request_events WHERE reference=? ORDER BY id DESC LIMIT 30').bind(reference).all();
   return json({...row,history:history.results});
  }
  const row=await env.DB.prepare('SELECT status FROM enquiries WHERE reference = ? AND phone = ?').bind(reference,phone).first();return json({status:row?.status||null});
 }
 const key=request.headers.get('Idempotency-Key');if(!key||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))return json({error:'Invalid retry identifier'},400);
 const name=typeof d.name==='string'?d.name.trim():'',message=typeof d.message==='string'?d.message.trim():'';const fields={};
 if(name.length<2||name.length>100)fields.name=true;if(!/^9[678]\d{8}$/.test(phone))fields.phone=true;if(env.MANAGEMENT_ENABLED!=='true'&&!allowedServices.has(d.service))fields.service=true;if(message.length<3||message.length>1500)fields.message=true;if(d.consent!==true)fields.consent=true;
 if(d.website)return json({error:'Invalid request'},400);if(Object.keys(fields).length)return json({error:'Please check your details',fields},422);
 if(typeof d.service!=='string'||!/^[a-z][a-z0-9-]{1,59}$/.test(d.service))return json({error:'Invalid service',fields:{service:true}},422);
 const hash=await digest(JSON.stringify({name,phone,service:d.service,message,consent:true}));
 if(env.MANAGEMENT_ENABLED==='true'){const prior=await env.DB.prepare('SELECT reference,payload_hash FROM enquiries WHERE idempotency_key=?').bind(key).first();if(prior)return prior.payload_hash===hash?json({reference:prior.reference}):json({error:'Earlier attempt used different details'},409);}
 let selectedService=null;if(env.MANAGEMENT_ENABLED==='true'){selectedService=await env.DB.prepare('SELECT id,category,title_en FROM service_catalog WHERE id=? AND active=1').bind(d.service).first();if(!selectedService)return json({error:'This service is unavailable',fields:{service:true}},422);}
 const reference='NOS-'+crypto.randomUUID().replaceAll('-','').slice(0,24).toUpperCase();
 const row=selectedService?
  await env.DB.prepare("INSERT INTO enquiries(reference,name,phone,service,message,consent_version,idempotency_key,payload_hash,service_id,service_title) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(idempotency_key) DO NOTHING RETURNING reference,payload_hash").bind(reference,name,phone,selectedService.category,message,'2026-09-21',key,hash,selectedService.id,selectedService.title_en).first():
  await env.DB.prepare("INSERT INTO enquiries (reference,name,phone,service,message,consent_version,idempotency_key,payload_hash) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(idempotency_key) DO NOTHING RETURNING reference,payload_hash").bind(reference,name,phone,d.service,message,'2026-09-21',key,hash).first();
 const saved=row||await env.DB.prepare('SELECT reference,payload_hash FROM enquiries WHERE idempotency_key = ?').bind(key).first();
 if(!saved)throw Error('Storage failed');if(saved.payload_hash!==hash)return json({error:'Earlier attempt used different details'},409);return json({reference:saved.reference},row?201:200);
}
function secured(response,env,url){const headers=new Headers(response.headers);headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");headers.set('X-Content-Type-Options','nosniff');headers.set('X-Frame-Options','DENY');headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');if(env.APP_ENV!=='production')headers.set('X-Robots-Tag','noindex, nofollow');if(url.protocol==='https:')headers.set('Strict-Transport-Security','max-age=86400');if(headers.get('Content-Type')?.includes('text/html'))headers.set('Cache-Control','no-cache');if(url.pathname.startsWith('/admin')){headers.set('Cache-Control','no-store');headers.set('X-Robots-Tag','noindex, nofollow');headers.set('Referrer-Policy','no-referrer');}return new Response(response.body,{status:response.status,headers});}
export default {
 async fetch(request,env){const url=new URL(request.url);let response;try{
  if(env.APP_ENV==='production'&&url.origin!==origin){response=['GET','HEAD'].includes(request.method)?Response.redirect(origin+url.pathname+url.search,308):json({error:'Use the secure website'},400);}
  else if(url.pathname==='/admin/login'&&env.ADMIN_AUTH==='passkey'&&['GET','HEAD'].includes(request.method))response=await env.ASSETS.fetch(new Request(url.origin+'/admin/login',request));
  else if(url.pathname.startsWith('/admin/auth/'))response=await passkeyAuth(request,env,url,readBody);
  else if(url.pathname==='/admin'||url.pathname.startsWith('/admin/')){const actor=await administrator(request,env);if(!actor&&env.ADMIN_AUTH==='passkey'&&!url.pathname.startsWith('/admin/api/')&&['GET','HEAD'].includes(request.method))response=Response.redirect(url.origin+'/admin/login',303);else if(!actor)response=new Response('Admin access is not configured or sign-in is required. Contact the site owner.',{status:401,headers:{'Cache-Control':'no-store','Content-Type':'text/plain;charset=utf-8'}});else if(url.pathname.startsWith('/admin/api/'))response=await adminApi(request,env,url,actor,readBody);else if(['GET','HEAD'].includes(request.method))response=await env.ASSETS.fetch(request);else response=json({error:'Method not allowed'},405);}
  else if(url.pathname.startsWith('/api/'))response=await api(request,env,url);
  else if(!['GET','HEAD'].includes(request.method))response=json({error:'Method not allowed'},405);
  else if(url.pathname.endsWith('.html')&&url.pathname!=='/404.html')response=Response.redirect(url.origin+(url.pathname==='/index.html'?'/':url.pathname.slice(0,-5))+url.search,308);
  else {let assetRequest=request;if(env.MANAGEMENT_ENABLED==='true'&&/^\/(ne\/)?services\/[a-z][a-z0-9-]+$/.test(url.pathname))assetRequest=new Request(url.origin+(url.pathname.startsWith('/ne/')?'/ne':'')+'/services/government',request);response=await catalogPage(await env.ASSETS.fetch(assetRequest),env,url);}
 }catch{console.error(JSON.stringify({event:'request_failed',path:url.pathname.startsWith('/api/')?'api':'page'}));response=json({error:'Temporarily unavailable. Please contact Nath on +977 9867302353.'},503);}return secured(response,env,url);},
 async scheduled(_controller,env){await cleanAuth(env);if(env.DB)await env.DB.prepare("DELETE FROM enquiries WHERE status='closed' AND closed_at IS NOT NULL AND closed_at < datetime('now','-90 days')").run();}
};
