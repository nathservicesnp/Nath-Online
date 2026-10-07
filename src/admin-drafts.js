// Only edit-state counters are kept here; customer data is never persisted.
(()=>{
 const dirty=new Map();let sequence=0;
 const supported=new Set(['request-edit','message-form','finance-form','service-edit','website-content-form','template-editor']);
 function mark(id){if(supported.has(id)){dirty.set(id,++sequence);update();}}
 function update(){const status=document.querySelector('#draft-status');if(status)status.textContent=dirty.size?'You have unsaved edits. Save each edited section before leaving.':'';}
 function snapshot(ids){return new Map(ids.map(id=>[id,dirty.get(id)]));}
 function saved(snapshot){for(const [id,version] of snapshot)if(dirty.get(id)===version)dirty.delete(id);update();}
 function confirmDiscard(ids){return !ids.some(id=>dirty.has(id))||confirm('Discard unsaved edits in this section? Choose Cancel to keep editing.');}
 function clear(ids){ids.forEach(id=>dirty.delete(id));update();}
 document.addEventListener('input',event=>{if(event.target.id==='content-id')return;mark(event.target.closest('form')?.id);});
 document.addEventListener('change',event=>{if(event.target.id==='content-id')return;mark(event.target.closest('form')?.id);});
 window.addEventListener('beforeunload',event=>{if(dirty.size){event.preventDefault();event.returnValue='';}});
 document.addEventListener('click',event=>{const button=event.target.closest('#sign-out,#cancel-service,#cancel-template');if(!button)return;const ids=button.id==='sign-out'?[...dirty.keys()]:[button.id==='cancel-service'?'service-edit':'template-editor'];if(!confirmDiscard(ids)){event.preventDefault();event.stopImmediatePropagation();}else if(button.id!=='sign-out')clear(ids);},true);
 window.NathDrafts={mark,snapshot,saved,confirmDiscard,clear};
})();
