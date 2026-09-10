// Accessible side navigation using the browser's native modal focus handling.
const menuButton=document.querySelector('.menu');
const oldNav=document.querySelector('.navlinks');
if(menuButton&&oldNav){
  const drawer=document.createElement('dialog');drawer.className='menu-drawer';drawer.id='side-navigation';
  const heading=document.createElement('h2');heading.textContent='How can we help?';
  const close=document.createElement('button');close.className='drawer-close';close.type='button';close.textContent='Close ×';
  const links=oldNav.cloneNode(true);links.removeAttribute('id');links.classList.remove('open');
  drawer.append(close,heading,links);document.body.append(drawer);
  const fresh=menuButton.cloneNode(true);menuButton.replaceWith(fresh);fresh.textContent='☰ Menu';fresh.setAttribute('aria-controls',drawer.id);
  fresh.addEventListener('click',()=>{drawer.showModal();fresh.setAttribute('aria-expanded','true');});
  close.addEventListener('click',()=>drawer.close());drawer.addEventListener('close',()=>fresh.setAttribute('aria-expanded','false'));
  drawer.addEventListener('click',event=>{if(event.target===drawer||event.target.closest('a'))drawer.close();});
}
document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{const select=document.querySelector('[name="interest"]');if(select)select.value=link.dataset.service;}));
const requestForm=document.querySelector('#service-request');
requestForm?.addEventListener('submit',async event=>{
  event.preventDefault();const status=requestForm.querySelector('[role="status"]');const button=requestForm.querySelector('button[type="submit"]');
  if(!requestForm.reportValidity())return;
  const data=Object.fromEntries(new FormData(requestForm));button.disabled=true;status.textContent='Checking secure submission…';
  try{const response=await fetch('/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,consent:true})});if(!response.ok)throw Error();const result=await response.json();if(!result.id)throw Error();status.textContent='Request received. Your reference is '+result.id+'. We’ll contact you during business hours.';requestForm.reset();}
  catch{status.textContent='We could not confirm your submission. It may have been received. Please contact Nath on WhatsApp to check before sending again.';let fallback=requestForm.querySelector('.request-fallback');if(!fallback){fallback=document.createElement('a');fallback.className='button request-fallback';requestForm.append(fallback);}fallback.textContent='Send request on WhatsApp ↗';fallback.href='https://wa.me/9779867302353?text='+encodeURIComponent(`Namaste Nath, my name is ${data.name}. Phone: ${data.phone}. Interest: ${data.interest}. ${data.message}`);}
  finally{button.disabled=false;}
});

// A guided assistant: approved information only, no AI model or chat storage.
const assistant=document.createElement('dialog');assistant.className='assistant-dialog';assistant.setAttribute('aria-labelledby','assistant-title');
assistant.innerHTML='<button type="button" class="drawer-close">Close ×</button><h2 id="assistant-title">Namaste, I’m Nath’s guide.</h2><p>Choose what you need below. This is a guided assistant, not a person or an AI model.</p><div class="assistant-choices"></div><p class="assistant-answer" role="status" aria-live="polite">नमस्ते! तपाईंलाई कुन सेवामा सहयोग चाहिन्छ?</p><a class="button" href="https://wa.me/9779867302353">Talk to the team ↗</a>';
const replies={
 'Find a service':'We help with forms, scholarships, bills, travel and movie tickets, personal/business websites, banners/logos and online marketing. Open Services in the menu, then choose a category.',
 'How much does it cost?':'Assistance charges start from Rs. 100. The final fee depends on the process and time. Websites, design, marketing, ad budgets, official fees and ticket prices are quoted separately. We confirm the cost before work starts.',
 'Fill a request form':'Use “Request a service” in the menu. Enter your name, phone, service and a short message. Do not share passwords, OTPs or identity document numbers. You receive a reference only after your request is saved.',
 'Jobs at Nath':'You can register an expression of interest in customer support, form assistance, website development, design or digital marketing. This does not mean a vacancy is currently open. Choose Careers in the menu.',
 'Hours and location':'We are based in Butwal, Rupandehi, Lumbini, Nepal. Sunday–Friday, 9 AM–6 PM Nepal time. Saturday closed. Call +977 9867302353 for exact office directions. Online support is available across Nepal where the process permits.',
 'नेपालीमा सहयोग':'फारम, बिल, टिकट, वेबसाइट, डिजाइन तथा मार्केटिङका लागि हामीलाई सम्पर्क गर्नुहोस्। सेवा शुल्क रु. १०० बाट सुरु हुन्छ। काम सुरु गर्नुअघि अन्तिम शुल्क जानकारी गराइन्छ। थप सहयोगका लागि WhatsApp मा कुरा गर्नुहोस्।'
};
for(const [question,reply] of Object.entries(replies)){const option=document.createElement('button');option.type='button';option.textContent=question;option.addEventListener('click',()=>{assistant.querySelector('.assistant-answer').textContent=reply;});assistant.querySelector('.assistant-choices').append(option);}
assistant.querySelector('.drawer-close').addEventListener('click',()=>assistant.close());document.body.append(assistant);
const assistantButton=document.createElement('button');assistantButton.className='assistant-launch';assistantButton.type='button';assistantButton.textContent='✦ Need help?';assistantButton.setAttribute('aria-haspopup','dialog');assistantButton.addEventListener('click',()=>assistant.showModal());document.body.append(assistantButton);

