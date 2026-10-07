import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {discoveryGroups,discoveryGroupsFor} from '../service-discovery.mjs';
import {serviceDetail} from '../catalog.mjs';
test('discovery preserves government PAN guidance and groups utility payments',()=>{
 assert.equal(discoveryGroups.length,6);
 assert.deepEqual(discoveryGroupsFor({id:'government',category:'government',items_json:'[["PAN registration guidance",""]]'}),['government','business']);
 assert.deepEqual(discoveryGroupsFor({id:'utilities',category:'utilities'}),['banking']);
 const html=serviceDetail({id:'other',title_en:'Test',description_en:'Test',note_en:'Check first',items_json:'[]',starting_price:100});
 assert.match(html,/Is this the right service for me/);assert.match(html,/Official documents and approvals come from/);
});
test('draft warnings preserve cancelled edits and edits made during saving',async()=>{
 const handlers={},status={textContent:''};let allow=false,calls=0;
 const document={querySelector:()=>status,addEventListener:(name,fn)=>handlers['document:'+name]=fn};
 const window={addEventListener:(name,fn)=>handlers['window:'+name]=fn};
 vm.runInNewContext(await readFile('src/admin-drafts.js','utf8'),{document,window,confirm:()=>{calls++;return allow;}});
 const d=window.NathDrafts;d.mark('request-search');assert.equal(status.textContent,'');
 d.mark('service-edit');assert.equal(d.confirmDiscard(['service-edit']),false);assert.equal(calls,1);assert.ok(status.textContent);
 const saved=d.snapshot(['service-edit']);d.mark('service-edit');d.saved(saved);assert.ok(status.textContent,'New edits must survive an older save');
 let prevented=false;handlers['window:beforeunload']({preventDefault(){prevented=true;}});assert.equal(prevented,true);
 d.saved(d.snapshot(['service-edit']));assert.equal(status.textContent,'');
 d.mark('message-form');allow=true;assert.equal(d.confirmDiscard(['message-form']),true);d.clear(['message-form']);assert.equal(status.textContent,'');
});
