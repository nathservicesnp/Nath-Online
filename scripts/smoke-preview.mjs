import assert from 'node:assert/strict';
const base='https://nath-official-preview.nathservicesnp.workers.dev';
for(const path of ['/','/ne','/services/government','/request','/privacy','/sitemap.xml']){const r=await fetch(base+path);assert.equal(r.status,200,path);assert.equal(r.headers.get('X-Robots-Tag'),'noindex, nofollow');assert.ok(r.headers.get('Content-Security-Policy'));console.log(path,'200');}
assert.equal((await fetch(base+'/not-a-real-page')).status,404);
const key=crypto.randomUUID(),payload={name:'Synthetic preview check',phone:'9800000000',service:'other',message:'Synthetic automated preview check. No real service requested.',consent:true};
const send=()=>fetch(base+'/api/requests',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(payload)});
const first=await send();assert.equal(first.status,201);const saved=await first.json();const second=await send();assert.equal(second.status,200);assert.equal((await second.json()).reference,saved.reference);
const track=await fetch(base+'/api/track',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({reference:saved.reference,phone:payload.phone})});assert.deepEqual(await track.json(),{status:'new'});
console.log('Preview: durable submission, duplicate prevention, generic status and 404 passed.');
