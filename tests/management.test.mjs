import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {adminApi,administrator} from '../admin-api.mjs';
import worker from '../worker.mjs';
import {catalogPage} from '../catalog.mjs';
const origin='https://www.nathonline.com.np',actor={email:'owner@example.test',sub:'owner'};
async function setup(){const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const file of ['0001_enquiries.sql','0002_management.sql','0003_seed_catalog.sql','0005_request_finance.sql','0006_customer_experience.sql'])sqlite.exec(await readFile('migrations/'+file,'utf8'));
 const statement=(sql,args=[])=>({sql,args,bind(...values){return statement(sql,values);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}});
 const DB={prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 return {sqlite,env:{DB,APP_ENV:'production',MANAGEMENT_ENABLED:'true',SUBMISSIONS_ENABLED:'true',REQUEST_LIMITER:{limit:async()=>({success:true})}}};}
const request=(path,method='GET',data)=>new Request(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json','X-Nath-Admin':'1','Idempotency-Key':crypto.randomUUID()},body:data?JSON.stringify(data):undefined});
const read=async req=>({data:await req.json()});
const call=(env,path,method='GET',data)=>{const r=request('/admin/api'+path,method,data);return adminApi(r,env,new URL(r.url),actor,read);};
const payload={name:'Synthetic Test',phone:'9800000000',service:'education',message:'Please help with my education form',consent:true};
test('admin routes fail closed without configured authentication, including forged identity headers',async()=>{const {env,sqlite}=await setup();for(const path of ['/admin','/admin/api/requests','/admin/index.html']){const r=new Request(origin+path,{headers:{'Cf-Access-Authenticated-User-Email':actor.email,'Cf-Access-Jwt-Assertion':'forged'}});assert.equal((await worker.fetch(r,env)).status,401);}assert.equal(await administrator(request('/admin'),{ADMIN_ENABLED:'true'}),null);assert.equal(await administrator(new Request(origin+'/admin',{headers:{'Cf-Access-Jwt-Assertion':'not.a.valid-jwt'}}),{ADMIN_ENABLED:'true',ACCESS_TEAM_DOMAIN:'example.cloudflareaccess.com',ACCESS_AUD:'expected',ADMIN_EMAILS:actor.email}),null);sqlite.close();});
test('admin can read request content, update completion, reopen, and cannot overwrite a newer change',async()=>{const {env,sqlite}=await setup();const saved=await(await worker.fetch(request('/api/requests','POST',payload),env)).json();const ref=saved.reference;assert.ok(ref);
 const original=await(await call(env,'/requests/'+ref)).json();assert.equal(original.record.message,payload.message);assert.equal(original.record.service_id,'education');
 const update={version:1,status:'closed',outcome:'completed',internal_note:'Private staff note'};
 assert.equal((await call(env,'/requests/'+ref,'PATCH',update)).status,200);assert.equal((await call(env,'/requests/'+ref,'PATCH',update)).status,409);
 assert.equal(sqlite.prepare('SELECT count(*) n FROM request_events').get().n,1);
 const track=await(await worker.fetch(request('/api/track','POST',{reference:ref,phone:payload.phone}),env)).json();assert.equal(track.outcome,'completed');assert.ok(!JSON.stringify(track).includes('Private'));assert.ok(!JSON.stringify(track).includes(actor.email));assert.ok(!JSON.stringify(track).includes(payload.name));
 assert.equal((await call(env,'/requests/'+ref,'PATCH',{version:2,status:'in_progress',outcome:'',internal_note:'Reopened'})).status,200);assert.equal(sqlite.prepare('SELECT closed_at FROM enquiries').get().closed_at,null);sqlite.close();});
test('service create, edit and removal preserve history and block new requests for hidden services',async()=>{const {env,sqlite}=await setup();const service={id:'passport-help',category:'government',icon:'building',title_en:'Passport help',title_ne:'राहदानी सहयोग',description_en:'Prepare your form',description_ne:'फाराम तयारी',note_en:'Attendance may be needed',note_ne:'उपस्थिति आवश्यक हुन सक्छ',items:[['Forms','फाराम']],starting_price:100,active:true,version:0};
 assert.equal((await call(env,'/services','POST',service)).status,200);assert.equal((await call(env,'/services','POST',service)).status,409);
 const saved=await(await worker.fetch(request('/api/requests','POST',{...payload,service:service.id}),env)).json();assert.ok(saved.reference);
 assert.equal((await call(env,'/services','POST',{...service,version:1,title_en:'Updated help'})).status,200);
 assert.equal((await call(env,'/services/'+service.id,'DELETE',{version:2})).status,200);
 assert.equal((await worker.fetch(request('/api/requests','POST',{...payload,service:service.id}),env)).status,422);
 assert.equal(sqlite.prepare('SELECT service_title FROM enquiries').get().service_title,'Passport help');assert.equal(sqlite.prepare('SELECT count(*) n FROM service_events').get().n,3);sqlite.close();});
test('admin rejects cross-origin edits, invalid prices and invalid closed outcomes',async()=>{const {env,sqlite}=await setup();const req=new Request(origin+'/admin/api/services',{method:'POST',headers:{Origin:'https://evil.example','X-Nath-Admin':'1'}});assert.equal((await adminApi(req,env,new URL(req.url),actor,read)).status,403);assert.equal((await call(env,'/services','POST',{id:'invalid'})).status,422);const saved=await(await worker.fetch(request('/api/requests','POST',payload),env)).json();assert.equal((await call(env,'/requests/'+saved.reference,'PATCH',{version:1,status:'closed',outcome:'',internal_note:''})).status,422);sqlite.close();});
test('catalogue renders escaped database content and hidden service returns 404',async()=>{const {env,sqlite}=await setup();sqlite.prepare('UPDATE service_catalog SET title_en=? WHERE id=?').run('<script>alert(1)</script>','education');const response=new Response('<main id="main" tabindex="-1"><!--catalog-start--><!--catalog-end--></main>',{headers:{'Content-Type':'text/html'}});const result=await catalogPage(response,env,new URL(origin+'/services'));const html=await result.text();assert.match(html,/&lt;script&gt;/);assert.ok(!html.includes('<script>'));sqlite.prepare('UPDATE service_catalog SET active=0 WHERE id=?').run('education');assert.equal((await catalogPage(new Response('<main id="main" tabindex="-1"></main>',{headers:{'Content-Type':'text/html'}}),env,new URL(origin+'/services/education'))).status,404);sqlite.close();});
test('retention also removes request history while keeping open work',async()=>{const {env,sqlite}=await setup();const saved=await(await worker.fetch(request('/api/requests','POST',payload),env)).json();await call(env,'/requests/'+saved.reference,'PATCH',{version:1,status:'closed',outcome:'completed',internal_note:''});sqlite.exec("UPDATE enquiries SET closed_at=datetime('now','-91 days')");await worker.scheduled({},env);assert.equal(sqlite.prepare('SELECT count(*) n FROM request_events').get().n,0);sqlite.close();});

test('pricing reflects edited fees and hides removed services; language switch keeps service identity',async()=>{
 const {env,sqlite}=await setup();sqlite.prepare('UPDATE service_catalog SET starting_price=275 WHERE id=?').run('education');sqlite.prepare('UPDATE service_catalog SET active=0 WHERE id=?').run('travel');
 const asset=()=>new Response('<main id="main" tabindex="-1"></main><a class="language" href="/ne/services/government">नेपाली</a>',{headers:{'Content-Type':'text/html'}});
 const pricing=await(await catalogPage(asset(),env,new URL(origin+'/pricing'))).text();assert.match(pricing,/275/);assert.ok(!pricing.includes('/services/travel'));
 const detail=await(await catalogPage(asset(),env,new URL(origin+'/services/education'))).text();assert.ok(detail.includes('href="/ne/services/education"'));sqlite.close();
});

test('quotes track verified totals, reject invalid amounts and preserve audit history on stale edits',async()=>{
 const {env,sqlite}=await setup();const saved=await(await worker.fetch(request('/api/requests','POST',payload),env)).json();const ref=saved.reference;
 const overview=await(await call(env,'/overview')).json();assert.equal(overview.counts.new,1);
 const body={version:0,items:[{description:'Assistance',kind:'service',paisa:10000},{description:'Provider fee',kind:'provider',paisa:20000}],paid_paisa:5000,payment_note:'Verified cash payment'};
 assert.equal((await call(env,'/requests/'+ref+'/finance','PATCH',body)).status,200);
 assert.equal((await call(env,'/requests/'+ref+'/finance','PATCH',body)).status,409);
 for(const invalid of [{...body,version:1,paid_paisa:30001},{...body,version:1,paid_paisa:-1},{...body,version:1,items:[{description:'Bad',kind:'service',paisa:1.5}]},{...body,version:1,payment_note:''}])assert.equal((await call(env,'/requests/'+ref+'/finance','PATCH',invalid)).status,422);
 const record=await(await call(env,'/requests/'+ref+'/finance')).json();assert.equal(record.version,1);assert.equal(record.paid_paisa,5000);assert.equal(record.history.length,1);
 assert.equal((await call(env,'/requests/'+ref+'/finance','PATCH',{...body,version:1,paid_paisa:30000,payment_note:'Balance verified'})).status,200);
 const final=await(await call(env,'/requests/'+ref+'/finance')).json();assert.equal(final.history.length,2);assert.equal(final.paid_paisa,30000);
 const track=await(await worker.fetch(request('/api/track','POST',{reference:ref,phone:payload.phone}),env)).json();assert.ok(!JSON.stringify(track).includes('Verified'));assert.ok(!('paid_paisa' in track));sqlite.close();
});

test('private exports include financial history, neutralize spreadsheet formulas and report retention',async()=>{
 const {env,sqlite}=await setup();const saved=await(await worker.fetch(request('/api/requests','POST',{...payload,name:'=1+1'}),env)).json();const ref=saved.reference;
 await call(env,'/requests/'+ref+'/finance','PATCH',{version:0,items:[{description:'Help',kind:'service',paisa:10000}],paid_paisa:2500,payment_note:'Verified cash'});
 const csv=await call(env,'/exports/requests.csv');assert.equal(csv.status,200);assert.equal(csv.headers.get('Cache-Control'),'no-store');assert.match(csv.headers.get('Content-Disposition'),/attachment/);const body=await csv.text();assert.ok(body.includes("'=1+1"));assert.ok(body.includes('100.00'));assert.ok(body.includes('25.00'));assert.ok(body.includes('75.00'));
 const full=await(await call(env,'/exports/'+ref+'.json')).json();assert.equal(full.record.reference,ref);assert.equal(full.finance_history.length,1);assert.ok(!('idempotency_key' in full.record));
 sqlite.prepare("UPDATE enquiries SET status='closed',closed_at=datetime('now','-85 days') WHERE reference=?").run(ref);const retention=await(await call(env,'/retention')).json();assert.equal(retention.days,90);assert.equal(retention.due_soon,1);assert.equal(retention.eligible,0);
 const unsigned=await worker.fetch(request('/admin/api/exports/'+ref+'.json'),env);assert.equal(unsigned.status,401);sqlite.close();
});

test('customers see only shared quotes; acceptance is versioned, idempotent and hides payment instructions until agreed',async()=>{
 const {env,sqlite}=await setup();const {reference}=await(await worker.fetch(request('/api/requests','POST',payload),env)).json();const track=()=>worker.fetch(request('/api/track','POST',{reference,phone:payload.phone}),env);
 const quote={version:0,items:[{description:'Help',kind:'service',paisa:10000}],paid_paisa:0,payment_note:'Draft',quote_shared:false,payment_instructions:'Verified recipient details'};
 await call(env,'/requests/'+reference+'/finance','PATCH',quote);assert.equal((await(await track()).json()).quote,null);
 await call(env,'/requests/'+reference+'/finance','PATCH',{...quote,version:1,quote_shared:true});const shown=(await(await track()).json()).quote;assert.equal(shown.payment_instructions,'');
 const accept=(revision,phone=payload.phone)=>worker.fetch(request('/api/quote-accept','POST',{reference,phone,revision,accept:true}),env);
 assert.equal((await accept(shown.revision-1)).status,409);assert.equal((await(await accept(shown.revision,'9800000001')).json()).accepted,undefined);
 assert.equal((await accept(shown.revision)).status,200);assert.equal((await accept(shown.revision)).status,200);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM quote_acceptances').get().n,1);assert.equal((await(await track()).json()).quote.payment_instructions,'Verified recipient details');
 await call(env,'/requests/'+reference+'/finance','PATCH',{...quote,version:2,quote_shared:true,paid_paisa:5000});assert.equal((await(await track()).json()).quote.accepted,true);
 await call(env,'/requests/'+reference+'/finance','PATCH',{...quote,version:3,quote_shared:true,items:[{description:'Changed fee',kind:'service',paisa:12000}]});assert.equal((await(await track()).json()).quote.accepted,false);assert.equal((await accept(shown.revision)).status,409);sqlite.close();
});

test('website guidance and reviews require confirmation, support drafts and reject stale edits',async()=>{
 const {env,sqlite}=await setup();const review={name:'Example',text_en:'Approved feedback',text_ne:'प्रतिक्रिया',published:true,confirmed:false};
 assert.equal((await call(env,'/website-content','POST',{id:'review',version:0,content:review})).status,422);
 assert.equal((await call(env,'/website-content','POST',{id:'review',version:0,content:{...review,published:false}})).status,200);
 assert.equal((await call(env,'/website-content','POST',{id:'review',version:0,content:review})).status,422);
 assert.equal((await call(env,'/website-content','POST',{id:'review',version:1,content:{...review,confirmed:true}})).status,200);
 assert.equal((await call(env,'/website-content','POST',{id:'review',version:1,content:{...review,confirmed:true}})).status,409);sqlite.close();
});
