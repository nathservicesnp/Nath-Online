const interests = new Set(['Government & documents','Education & scholarships','Bills & digital payments','Travel & entertainment','Websites & creative design','Online marketing','Other online assistance','Careers — expression of interest']);
const origins = new Set(['https://www.nathonline.com.np','https://nathonline.com.np','https://nath-online.nathservicesnp.workers.dev']);
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  if(url.pathname!=='/api/requests')return json({error:'Not found'},404);
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  if(!origins.has(request.headers.get('Origin')))return json({error:'Origin not allowed'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'JSON required'},415);
  if(!env.DB||!env.REQUEST_LIMITER)return json({error:'Submission unavailable'},503);
  try {
   const {success}=await env.REQUEST_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'});
   if(!success)return json({error:'Please wait a minute and try again.'},429);
   // Enforce the size limit while reading, including requests without Content-Length.
   const reader=request.body?.getReader();if(!reader)return json({error:'Missing data'},400);
   let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();return json({error:'Request too large'},413);}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.byteLength;}
   let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{return json({error:'Invalid data'},400);}
   if(!data||typeof data!=='object'||Array.isArray(data))return json({error:'Invalid data'},400);
   if(data.website)return json({error:'Invalid request'},400);
   for(const field of ['name','phone','interest','message'])if(typeof data[field]!=='string')return json({error:'Complete all fields'},400);
   const name=data.name.trim(),phone=data.phone.trim(),interest=data.interest.trim(),message=data.message.trim();
   if(name.length<2||name.length>100||!/^[+\d\s().-]{7,25}$/.test(phone)||phone.replace(/\D/g,'').length<7||!interests.has(interest)||message.length<3||message.length>1500||data.consent!==true)return json({error:'Please check the form details and consent.'},400);
   const id=crypto.randomUUID();
   await env.DB.prepare('INSERT INTO requests (id, kind, name, phone, interest, message, consent_version) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id,interest.startsWith('Careers')?'career':'service',name,phone,interest,message,'2026-09-09-v2').run();
   return json({id},201);
  }catch{return json({error:'Unable to save your request. Please contact Nath on WhatsApp.'},503);}
 }
};
