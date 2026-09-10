import assert from 'node:assert/strict';
import worker from '../worker.mjs';
let rows=[];
const env={ASSETS:{fetch:()=>new Response('asset')},REQUEST_LIMITER:{limit:async()=>({success:true})},DB:{prepare:sql=>({bind:(...values)=>({run:async()=>{rows.push({sql,values});return {success:true};}})})}};
const valid={name:'Test Customer',phone:'+977 9800000000',interest:'Education & scholarships',message:'Synthetic enquiry test',consent:true};
const req=(body=valid,extra={})=>new Request('https://www.nathonline.com.np/api/requests',{method:'POST',headers:{Origin:'https://www.nathonline.com.np','Content-Type':'application/json',...extra},body:JSON.stringify(body)});
assert.equal((await worker.fetch(req(),env)).status,201);
assert.equal(rows.length,1);assert.equal(rows[0].values[1],'service');
assert.equal((await worker.fetch(req({...valid,interest:'Careers — expression of interest'}),env)).status,201);assert.equal(rows[1].values[1],'career');
for(const data of [{...valid,consent:false},{...valid,phone:'abc'},{...valid,interest:'invented'},{...valid,message:'x'.repeat(1501)},{...valid,website:'spam'},null])assert.equal((await worker.fetch(req(data),env)).status,400);
assert.equal((await worker.fetch(req(valid,{Origin:'https://evil.example'}),env)).status,403);
assert.equal((await worker.fetch(req(valid,{'Content-Type':'text/plain'}),env)).status,415);
assert.equal((await worker.fetch(req({...valid,message:'x'.repeat(9000)}),env)).status,413);
assert.equal((await worker.fetch(req(),{...env,REQUEST_LIMITER:{limit:async()=>({success:false})}})).status,429);
assert.equal((await worker.fetch(req(),{})).status,503);
assert.equal((await worker.fetch(new Request('https://www.nathonline.com.np/api/requests'),env)).status,405);
assert.equal(await (await worker.fetch(new Request('https://www.nathonline.com.np/'),env)).text(),'asset');
assert.equal(rows.length,2);console.log('Worker validation, consent, private API, size limits, rate limits and storage tests passed.');

