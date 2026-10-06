import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {adminApi,administrator} from '../admin-api.mjs';
import worker from '../worker.mjs';
import {announcementVisible} from '../website-content.mjs';
import {catalogPage,serviceCards} from '../catalog.mjs';
const origin='https://www.nathonline.com.np',actor={email:'owner@example.test',sub:'owner'};
async function setup(){const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const file of ['0001_enquiries.sql','0002_management.sql','0003_seed_catalog.sql','0005_request_finance.sql','0006_customer_experience.sql','0007_followups.sql','0008_service_availability.sql','0009_request_conversation.sql','0010_suggestions.sql'])sqlite.exec(await readFile('migrations/'+file,'utf8'));
 const statement=(sql,args=[])=>({sql,args,bind(...values){return statement(sql,values);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}});
 const DB={prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 return {sqlite,env:{DB,APP_ENV:'production',MANAGEMENT_ENABLED:'true',SUBMISSIONS_ENABLED:'true',REQUEST_LIMITER:{limit:async()=>({success:true})}}};}
const request=(path,method='GET',data)=>new Request(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json','X-Nath-Admin':'1','Idempotency-Key':crypto.randomUUID()},body:data?JSON.stringify(data):undefined});
const read=async req=>({data:await req.json()});
const call=(env,path,method='GET',data)=>{const r=request('/admin/api'+path,method,data);return adminApi(r,env,new URL(r.url),actor,read);};
const payload={name:'Synthetic Test',phone:'9800000000',service:'education',message:'Please help with my education form',consent:true};

test('reply templates support versioned edits, hide and restore without sending messages',async()=>{
 const {env,sqlite}=await setup();const initial=await(await call(env,'/reply-templates')).json();assert.equal(initial.templates.length,4);
 const template={...initial.templates[0],title:'Ask about education',category:'education',body:'Please name the application.\nकृपया आवेदनको नाम बताउनुहोस्।'};
 assert.equal((await call(env,'/reply-templates','POST',{version:0,template})).status,200);
 assert.equal((await call(env,'/reply-templates','POST',{version:0,template:{...template,body:'Stale'}})).status,409);
 assert.equal((await call(env,'/reply-templates','POST',{version:1,template:{...template,active:false}})).status,200);
 let stored=(await(await call(env,'/reply-templates')).json()).templates.find(t=>t.id===template.id);assert.equal(stored.active,false);assert.equal(stored.version,2);assert.equal(stored.body,template.body);
 assert.equal((await call(env,'/reply-templates','POST',{version:2,template:{...template,active:true}})).status,200);
 stored=(await(await call(env,'/reply-templates')).json()).templates.find(t=>t.id===template.id);assert.equal(stored.active,true);assert.equal(stored.version,3);
 assert.equal(sqlite.prepare('SELECT count(*) n FROM request_messages').get().n,0);sqlite.close();
});

test('reply templates stay private and reject invalid or unauthorised writes',async()=>{
 const {env,sqlite}=await setup();const template={id:'private-example',title:'Internal library example',body:'DO_NOT_PUBLISH_TEMPLATE',category:'all',waiting:false,active:true};
 assert.equal((await call(env,'/reply-templates','POST',{version:0,template})).status,200);
 const content=await(await call(env,'/website-content')).json();assert.ok(!JSON.stringify(content).includes(template.body));
 const {enrichWebsite}=await import('../website-content.mjs');const html=await(await enrichWebsite(new Response('<main id="main" tabindex="-1"></main>',{headers:{'Content-Type':'text/html'}}),env,new URL(origin))).text();assert.ok(!html.includes(template.body));
 for(const change of [{body:''},{body:'x'.repeat(1501)},{category:'invalid'},{active:'true'},{id:'../home'}])assert.equal((await call(env,'/reply-templates','POST',{version:1,template:{...template,...change}})).status,422);
 assert.equal((await worker.fetch(request('/admin/api/reply-templates'),env)).status,401);
 const req=new Request(origin+'/admin/api/reply-templates',{method:'POST',headers:{Origin:'https://evil.example','X-Nath-Admin':'1'}});assert.equal((await adminApi(req,env,new URL(req.url),actor,read)).status,403);sqlite.close();
});

test('guided choices use catalogue tasks in the selected language and escape HTML in attributes',async()=>{
 const {sqlite}=await setup();const service=sqlite.prepare("SELECT * FROM service_catalog WHERE id='travel'").get();
 service.items_json=JSON.stringify([['Ticket "quote" <script>','टिकट']]);service.availability='paused';
 const en=serviceCards([service]);assert.ok(en.includes('data-tasks="[&quot;Ticket'));assert.ok(en.includes('&lt;script&gt;'));assert.ok(!en.includes('<script>'));assert.ok(en.includes('data-available="false"'));
 const ne=serviceCards([service],true);assert.ok(ne.includes('data-tasks="[&quot;टिकट&quot;]"'));assert.ok(ne.includes('/ne/services/travel'));sqlite.close();
});

test('work filters match CSV exports and never treat payment as automatic completion',async()=>{
 const {env,sqlite}=await setup();const refs=[];
 for(let i=0;i<4;i++)refs.push((await(await worker.fetch(request('/api/requests','POST',{...payload,message:payload.message+' '+i}),env)).json()).reference);
 sqlite.prepare("UPDATE enquiries SET status='contacted',waiting_customer=1 WHERE reference=?").run(refs[1]);
 sqlite.prepare("UPDATE enquiries SET status='contacted',follow_up_at=datetime('now','-1 hour') WHERE reference=?").run(refs[2]);
 sqlite.prepare("UPDATE enquiries SET status='in_progress',quote_json=?,paid_paisa=10000,quote_shared=1,quote_revision=1,accepted_revision=1,accepted_at=datetime('now') WHERE reference=?").run(JSON.stringify([{description:'Help',kind:'service',paisa:10000}]),refs[3]);
 for(const [work,index] of [['reply',0],['waiting',1],['overdue',2],['closure',3]]){
  const data=await(await call(env,'/requests?work='+work)).json();assert.deepEqual(data.requests.map(r=>r.reference),[refs[index]]);
  const csv=await(await call(env,'/exports/requests.csv?work='+work)).text();for(let i=0;i<4;i++)assert.equal(csv.includes(refs[i]),i===index);
 }
 assert.equal(sqlite.prepare('SELECT status FROM enquiries WHERE reference=?').get(refs[3]).status,'in_progress');
 sqlite.prepare("UPDATE enquiries SET paid_paisa=5000 WHERE reference=?").run(refs[3]);assert.equal((await(await call(env,'/requests?work=closure')).json()).requests.length,0);
 assert.equal((await(await call(env,'/requests?work=waiting&status=new')).json()).requests.length,0);
 assert.equal((await call(env,'/requests?work=invalid')).status,400);assert.equal((await call(env,'/exports/requests.csv?work=invalid')).status,400);
 sqlite.exec("UPDATE enquiries SET status='closed'");for(const work of ['reply','waiting','overdue','closure'])assert.equal((await(await call(env,'/requests?work='+work)).json()).requests.length,0);
 sqlite.close();
});

test('announcement scheduling validates dates and honours exact start and expiry boundaries',async()=>{
 const {env,sqlite}=await setup();const content={text_en:'Scheduled notice',text_ne:'सूचना',published:true,confirmed:true,starts_at:'2026-10-04T03:15:00.000Z',ends_at:'2026-10-05T12:15:00.000Z'};
 assert.equal(announcementVisible(content,Date.parse(content.starts_at)-1),false);assert.equal(announcementVisible(content,Date.parse(content.starts_at)),true);assert.equal(announcementVisible(content,Date.parse(content.ends_at)),false);
 for(const invalid of [{starts_at:'2026-02-30T03:15:00.000Z'},{ends_at:content.starts_at},{ends_at:'bad'},{starts_at:42}])assert.equal((await call(env,'/website-content','POST',{id:'announcement',version:0,content:{...content,...invalid}})).status,422);
 assert.equal((await call(env,'/website-content','POST',{id:'announcement',version:0,content})).status,200);
 const stored=JSON.parse(sqlite.prepare("SELECT data_json FROM website_content WHERE id='announcement'").get().data_json);assert.equal(stored.starts_at,content.starts_at);assert.equal(stored.ends_at,content.ends_at);
 assert.equal(announcementVisible({...content,published:false},Date.parse(content.starts_at)),false);assert.equal(announcementVisible({...content,starts_at:'',ends_at:''}),true);sqlite.close();
});

test('service ordering is versioned and draft copies stay hidden from public requests',async()=>{
 const {env,sqlite}=await setup();const source=sqlite.prepare("SELECT * FROM service_catalog WHERE id='education'").get();const data={...source,items:JSON.parse(source.items_json),active:true,sort_order:99};
 assert.equal((await call(env,'/services','POST',data)).status,200);assert.equal((await call(env,'/services','POST',data)).status,409);
 assert.equal(sqlite.prepare("SELECT sort_order FROM service_catalog WHERE id='education'").get().sort_order,99);
 for(const sort_order of [-1,1.5,10000,'1'])assert.equal((await call(env,'/services','POST',{...data,version:2,sort_order})).status,422);
 const copy={...data,id:'education-copy',active:false,version:0,sort_order:100};assert.equal((await call(env,'/services','POST',copy)).status,200);
 assert.equal((await worker.fetch(request('/api/requests','POST',{...payload,service:copy.id}),env)).status,422);
 const services=(await(await call(env,'/services')).json()).services;assert.equal(services.at(-1).id,copy.id);
 assert.equal(sqlite.prepare("SELECT active FROM service_catalog WHERE id='education'").get().active,1);sqlite.close();
});
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

test('callback preferences and private follow-ups validate and preserve concurrency',async()=>{
 const {env,sqlite}=await setup();
 assert.equal((await worker.fetch(request('/api/requests','POST',{...payload,callback_window:'midnight'}),env)).status,422);
 const {reference}=await(await worker.fetch(request('/api/requests','POST',{...payload,callback_window:'afternoon'}),env)).json();
 const record=(await(await call(env,'/requests/'+reference)).json()).record;assert.equal(record.callback_window,'afternoon');
 const update={version:record.version,status:'new',outcome:'',internal_note:'',follow_up_at:'2026-01-01T04:15:00.000Z'};
 assert.equal((await call(env,'/requests/'+reference,'PATCH',{...update,follow_up_at:'2026-02-30T00:00:00.000Z'})).status,422);
 assert.equal((await call(env,'/requests/'+reference,'PATCH',update)).status,200);
 assert.equal((await call(env,'/requests/'+reference,'PATCH',update)).status,409);
 assert.equal((await(await call(env,'/follow-ups')).json()).reminders[0].reference,reference);
 const tracking=await(await worker.fetch(request('/api/track','POST',{reference,phone:payload.phone}),env)).json();assert.equal(tracking.follow_up_at,undefined);assert.equal(tracking.callback_window,undefined);
 assert.equal((await call(env,'/requests/'+reference,'PATCH',{...update,version:2,status:'closed',outcome:'completed'})).status,200);
 assert.equal((await(await call(env,'/follow-ups')).json()).reminders.length,0);
 assert.equal((await call(env,'/requests/'+reference,'PATCH',{...update,version:3,follow_up_at:null})).status,200);
 assert.equal((await(await call(env,'/requests/'+reference)).json()).record.follow_up_at,null);sqlite.close();
});

test('availability remains visible but blocks new requests until restored',async()=>{
 const {env,sqlite}=await setup();const s=sqlite.prepare("SELECT * FROM service_catalog WHERE id='travel'").get();const data={...s,items:JSON.parse(s.items_json),active:true,availability:'paused'};
 assert.equal((await call(env,'/services','POST',data)).status,200);
 assert.equal((await worker.fetch(request('/api/requests','POST',{...payload,service:'travel'}),env)).status,422);
 const {serviceCards,serviceDetail}=await import('../catalog.mjs');const paused=sqlite.prepare("SELECT * FROM service_catalog WHERE id='travel'").get();assert.match(serviceCards([paused]),/Temporarily unavailable/);assert.ok(!serviceCards([paused]).includes('/request?service=travel'));assert.ok(!serviceDetail(paused).includes('/request?service=travel'));assert.match(serviceDetail(paused),/id="process"/);
 assert.equal((await call(env,'/services','POST',{...data,version:2,availability:'invalid'})).status,422);
 assert.equal((await call(env,'/services','POST',{...data,version:2,availability:'available'})).status,200);
 assert.equal((await worker.fetch(request('/api/requests','POST',{...payload,service:'travel'}),env)).status,201);sqlite.close();
});

test('request conversation requires matching phone, protects staff notes, retries once and respects closure',async()=>{
 const {env,sqlite}=await setup();const {reference}=await(await worker.fetch(request('/api/requests','POST',payload),env)).json();
 const message={message:'Please confirm your route.',waiting:true,version:0,key:crypto.randomUUID()};
 assert.equal((await call(env,'/requests/'+reference+'/messages','POST',message)).status,200);
 assert.equal((await call(env,'/requests/'+reference+'/messages','POST',message)).status,200);
 assert.equal((await call(env,'/requests/'+reference+'/messages','POST',{...message,waiting:false})).status,409);
 const track=await(await worker.fetch(request('/api/track','POST',{reference,phone:payload.phone}),env)).json();assert.equal(track.conversation.waiting,true);assert.equal(track.conversation.messages.length,1);assert.ok(!JSON.stringify(track).includes(actor.email));
 const reply={reference,phone:payload.phone,message:'Butwal to Kathmandu',version:1,key:crypto.randomUUID()};
 const wrong=await(await worker.fetch(request('/api/reply','POST',{...reply,phone:'9811111111'}),env)).json();assert.ok(!wrong.saved);
 assert.equal((await worker.fetch(request('/api/reply','POST',{...reply,message:''}),env)).status,422);
 assert.equal((await worker.fetch(request('/api/reply','POST',reply),env)).status,200);assert.equal((await worker.fetch(request('/api/reply','POST',reply),env)).status,200);
 const conversation=(await(await call(env,'/requests/'+reference+'/messages')).json());assert.equal(conversation.messages.length,2);assert.equal(conversation.waiting,false);
 assert.equal((await worker.fetch(request('/api/reply','POST',{...reply,key:crypto.randomUUID()}),env)).status,409);
 const exported=await(await call(env,'/exports/'+reference+'.json')).json();assert.equal(exported.messages.length,2);
 sqlite.prepare("UPDATE enquiries SET status='closed',closed_at=datetime('now','-91 days') WHERE reference=?").run(reference);
 assert.equal((await worker.fetch(request('/api/reply','POST',{...reply,version:2,key:crypto.randomUUID()}),env)).status,409);
 await worker.scheduled({},env);assert.equal(sqlite.prepare('SELECT count(*) n FROM request_messages').get().n,0);sqlite.close();
});

test('homepage edits require confirmation and escape published text; attention excludes closed requests',async()=>{const {env,sqlite}=await setup();const content={title_en:'Help <script>bad</script>',title_ne:'नेपाली शीर्षक',intro_en:'Clear support',intro_ne:'स्पष्ट सहयोग',published:true,confirmed:false};assert.equal((await call(env,'/website-content','POST',{id:'home',version:0,content})).status,422);content.confirmed=true;assert.equal((await call(env,'/website-content','POST',{id:'home',version:0,content})).status,200);assert.equal((await call(env,'/website-content','POST',{id:'home',version:0,content})).status,409);const {enrichWebsite}=await import('../website-content.mjs');const render=()=>new Response('<div class="hero-copy"><h1>Old</h1><p class="lead">Old intro</p></div>',{headers:{'Content-Type':'text/html'}});const html=await(await enrichWebsite(render(),env,new URL(origin))).text();assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('Clear support'));const ne=await(await enrichWebsite(render(),env,new URL(origin+'/ne'))).text();assert.ok(ne.includes('नेपाली शीर्षक'));const saved=await(await worker.fetch(request('/api/requests','POST',payload),env)).json();let attention=await(await call(env,'/attention')).json();assert.equal(attention.requests[0].reference,saved.reference);assert.ok(!JSON.stringify(attention).includes(payload.phone));await call(env,'/requests/'+saved.reference,'PATCH',{version:1,status:'closed',outcome:'completed',internal_note:''});attention=await(await call(env,'/attention')).json();assert.equal(attention.requests.length,0);sqlite.close();});

test('announcements require confirmation, escape text and featured services omit unavailable entries',async()=>{const {env,sqlite}=await setup();const {enrichWebsite}=await import('../website-content.mjs');const page=()=>new Response('<main id="main" tabindex="-1"><section class="wrap section"><div class="section-head">Services</div></section></main>',{headers:{'Content-Type':'text/html'}});const content={text_en:'Holiday <script>alert(1)</script>',text_ne:'सूचना',published:true,confirmed:false};assert.equal((await call(env,'/website-content','POST',{id:'announcement',version:0,content})).status,422);content.confirmed=true;assert.equal((await call(env,'/website-content','POST',{id:'announcement',version:0,content})).status,200);let html=await(await enrichWebsite(page(),env,new URL(origin+'/track'))).text();assert.ok(html.includes('site-announcement'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.equal((await call(env,'/website-content','POST',{id:'featured',version:0,content:{service_ids:'travel,travel',published:true,confirmed:true}})).status,422);assert.equal((await call(env,'/website-content','POST',{id:'featured',version:0,content:{service_ids:'missing',published:true,confirmed:true}})).status,422);assert.equal((await call(env,'/website-content','POST',{id:'featured',version:0,content:{service_ids:'travel,education',published:true,confirmed:true}})).status,200);html=await(await enrichWebsite(page(),env,new URL(origin))).text();assert.ok(html.includes('featured-services'));sqlite.exec("UPDATE service_catalog SET availability='paused' WHERE id IN ('travel','education')");html=await(await enrichWebsite(page(),env,new URL(origin))).text();assert.ok(!html.includes('featured-services'));assert.equal((await call(env,'/website-content','POST',{id:'announcement',version:1,content:{...content,published:false}})).status,200);html=await(await enrichWebsite(page(),env,new URL(origin+'/track'))).text();assert.ok(!html.includes('site-announcement'));sqlite.close();});

test('suggestions are private, idempotent, validated and versioned',async()=>{
 const {env,sqlite}=await setup();const id=crypto.randomUUID(),body={category:'service',message:'Please offer printing assistance',reply:false,phone:'9800000000',consent:true};
 const submit=(data=body,key=id)=>worker.fetch(new Request(origin+'/api/suggestions',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(data)}),env);
 assert.equal((await submit()).status,201);assert.equal((await submit()).status,201);assert.equal(sqlite.prepare('SELECT count(*) n FROM suggestions').get().n,1);assert.equal(sqlite.prepare('SELECT phone FROM suggestions').get().phone,'');
 assert.equal((await submit({...body,message:'Different suggestion'})).status,409);assert.equal((await submit({...body,reply:true,phone:''},crypto.randomUUID())).status,422);
 const list=await(await call(env,'/suggestions')).json();assert.equal(list.suggestions.length,1);
 const change={id,version:1,status:'planned',note:'Private team note',duplicate_of:''};assert.equal((await call(env,'/suggestions','POST',change)).status,200);assert.equal((await call(env,'/suggestions','POST',change)).status,409);
 const publicRead=await worker.fetch(new Request(origin+'/api/suggestions'),env);assert.equal(publicRead.status,405);
 const noAuth=request('/admin/api/suggestions');assert.equal((await adminApi(noAuth,env,new URL(noAuth.url),null,read)).status,401);
 const foreign=new Request(origin+'/api/suggestions',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal((await worker.fetch(foreign,env)).status,403);sqlite.close();
});

test('six public groups preserve legacy categories and service guidance order',async()=>{
 const {serviceGroup,serviceGroups}=await import('../service-groups.mjs');const {serviceDetail}=await import('../catalog.mjs');assert.equal(serviceGroups.length,6);assert.equal(serviceGroup({id:'business-pan',category:'government'}),'business');assert.equal(serviceGroup({id:'utilities',category:'utilities'}),'banking');assert.equal(serviceGroup({id:'land-help',category:'other'}),'property');
 const {sqlite}=await setup();const html=serviceDetail(sqlite.prepare("SELECT * FROM service_catalog WHERE id='government'").get());let previous=-1;for(const id of ['documents','process','charge','apply','support']){const position=html.indexOf('id="'+id+'"');assert.ok(position>previous);previous=position;}assert.match(html,/Documents, approvals and decisions are issued by the relevant authority/);sqlite.close();
});
