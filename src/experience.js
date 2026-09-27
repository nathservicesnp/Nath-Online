// Progressive enhancements: no customer details are persisted in browser storage.
(()=>{
 const ne=document.documentElement.lang==='ne',t=(en,np)=>ne?np:en;
 const element=(tag,content,cls)=>{const node=document.createElement(tag);node.textContent=content;if(cls)node.className=cls;return node;};
 document.querySelector('#stop-motion')?.addEventListener('click',event=>{document.documentElement.dataset.motion='off';event.currentTarget.textContent=t('Animation off','एनिमेसन बन्द');event.currentTarget.disabled=true;});
 const finder=document.querySelector('#guided-finder');
 if(finder){
  const heading=element('h2',t('Find your next step','आफ्नो अर्को कदम छान्नुहोस्'));
  const intro=element('p',t('Choose your task, then tell us how you want to start.','काम छान्नुहोस्, त्यसपछि कसरी सुरु गर्ने बताउनुहोस्।'));
  const label=element('label',t('1. What do you need help with?','१. कुन काममा सहयोग चाहिन्छ?'));
  const select=document.createElement('select');label.append(select);const empty=element('option',t('Choose a service','सेवा छान्नुहोस्'));empty.value='';select.append(empty);
  for(const card of document.querySelectorAll('[data-service]')){if(card.dataset.available==='false')continue;const link=card.querySelector('h3 a');if(!link)continue;const option=element('option',link.textContent);option.value=link.getAttribute('href');select.append(option);}
  const next=element('button',t('Continue','अगाडि बढ्नुहोस्'),'button');next.type='button';next.disabled=true;select.addEventListener('change',()=>next.disabled=!select.value);
  const result=document.createElement('div');result.hidden=true;result.className='finder-result';result.tabIndex=-1;
  next.addEventListener('click',()=>{if(!select.value)return;const path=select.value,id=path.split('/').pop();result.replaceChildren(element('h3',t('2. How would you like to start?','२. कसरी सुरु गर्न चाहनुहुन्छ?')));const links=document.createElement('div');links.className='actions';for(const [url,title] of [[path,t('Understand this service','सेवाबारे बुझ्नुहोस्')],[(ne?'/ne':'')+'/request?service='+encodeURIComponent(id),t('Request help with this','यो काममा सहयोग माग्नुहोस्')]]){const a=element('a',title,'button secondary');a.href=url;links.append(a);}result.append(links,element('p',t('We confirm requirements and charges before starting.','कामअघि आवश्यक विवरण र शुल्क पुष्टि गर्छौँ।')));result.hidden=false;result.focus();});
  select.addEventListener('change',()=>{result.hidden=true;});finder.append(heading,intro,label,next,result);
 }
 const form=document.querySelector('#request-form');if(!form)return;
 form.noValidate=true;
 const submit=form.querySelector('button[type=submit]'),feedback=document.querySelector('#form-feedback');
 const groups=[['service','message'],['name','phone','callback_window'],['consent']];
 const titles=[t('Your service','चाहिएको सेवा'),t('Contact details','सम्पर्क विवरण'),t('Review and send','जाँचेर पठाउनुहोस्')];
 const sections=groups.map((names,index)=>{const fieldset=document.createElement('fieldset');fieldset.className='request-step';const legend=element('legend',titles[index]);fieldset.append(legend);for(const name of names){const control=form.elements[name];const label=control?.closest('label');if(label)fieldset.append(label);}form.insertBefore(fieldset,submit);return fieldset;});
 const taskLabel=element('label',t('Which task?','कुन काम?')),task=document.createElement('select');task.name='task_choice';taskLabel.append(task);sections[0].insertBefore(taskLabel,form.elements.message.closest('label'));
 const questions=document.createElement('div');questions.className='task-questions';sections[0].insertBefore(questions,form.elements.message.closest('label'));
 function taskQuestions(){questions.replaceChildren();const category=form.elements.service.selectedOptions[0]?.dataset.category;const fields=category==='travel'?[[t('Route or event (optional)','यात्राको स्थान वा कार्यक्रम (ऐच्छिक)'),'text'],[t('Preferred date (optional)','मनपर्ने मिति (ऐच्छिक)'),'date']]:category==='education'?[[t('Institution (optional)','संस्था (ऐच्छिक)'),'text'],[t('Deadline, if known (optional)','थाहा भए अन्तिम मिति (ऐच्छिक)'),'date']]:category==='utilities'?[[t('Provider name (optional)','प्रदायकको नाम (ऐच्छिक)'),'text']]:category==='government'?[[t('Application or correction needed (optional)','आवेदन वा सुधारको विवरण (ऐच्छिक)'),'text']]:category==='banking'?[[t('Bank or wallet provider (optional)','बैंक वा वालेट प्रदायक (ऐच्छिक)'),'text']]:[];for(const [title,type] of fields){const label=element('label',title),input=document.createElement('input');input.type=type;input.maxLength=100;input.dataset.question=title;label.append(input);questions.append(label);}}
 function taskOptions(){task.replaceChildren();const option=element('option',t('Not sure / describe below','निश्चित छैन / तल लेख्नुहोस्'));option.value='';task.append(option);let tasks=[];try{tasks=JSON.parse(form.elements.service.selectedOptions[0]?.dataset.tasks||'[]');}catch{}for(const title of tasks){const o=element('option',title);o.value=title;task.append(o);}taskQuestions();}
 form.elements.service.addEventListener('change',taskOptions);taskOptions();
 form.addEventListener('input',()=>form.elements.message.setCustomValidity(''));
 const review=document.createElement('dl');review.className='request-review';sections[2].insertBefore(review,sections[2].children[1]);
 const progress=element('p','','wizard-progress');progress.setAttribute('role','status');progress.tabIndex=-1;form.insertBefore(progress,sections[0]);
 const controls=document.createElement('div');controls.className='actions wizard-controls';const back=element('button',t('Back','पछाडि'),'button secondary'),next=element('button',t('Continue','अगाडि'),'button');back.type=next.type='button';controls.append(back,next);form.insertBefore(controls,submit);
 let step=0;
 function show(){sections.forEach((section,i)=>section.hidden=i!==step);back.hidden=step===0;next.hidden=step===2;submit.hidden=step!==2;progress.textContent=t(`Step ${step+1} of 3: ${titles[step]}`,`चरण ${step+1}/३: ${titles[step]}`);if(step===2){review.replaceChildren();for(const [name,title] of [['service',t('Service','सेवा')],['message',t('Your request','अनुरोध')],['name',t('Name','नाम')],['phone',t('Phone','फोन')],['callback_window',t('Callback preference','फोनको प्राथमिकता')]]){const input=form.elements[name];review.append(element('dt',title),element('dd',(name==='service'||name==='callback_window')?input.selectedOptions[0]?.textContent:name==='message'?requestMessage(form):input.value));}}}
 function advance(){form.elements.message.setCustomValidity(requestMessage(form).length>1500?t('Please shorten your details to 1,500 characters in total.','कृपया जम्मा विवरण १५०० अक्षरभित्र छोट्याउनुहोस्।'):'');if(form.dataset.busy==='true'||form.dataset.complete==='true')return;for(const input of sections[step].querySelectorAll('input,select,textarea')){if(!input.reportValidity())return;}step=Math.min(2,step+1);show();progress.focus();}
 next.addEventListener('click',advance);back.addEventListener('click',()=>{if(form.dataset.busy==='true'||form.dataset.complete==='true')return;step=Math.max(0,step-1);show();progress.focus();});
 // The existing submission handler remains the only code that sends requests.
 form.addEventListener('submit',event=>{if(step!==2){event.preventDefault();event.stopImmediatePropagation();advance();}},true);
 form.addEventListener('invalid',event=>{const index=sections.findIndex(section=>section.contains(event.target));if(index>=0&&index!==step){step=index;show();}},true);
 form.addEventListener('request-finished',()=>{if(form.dataset.complete==='true'){sections.forEach(s=>s.hidden=true);controls.hidden=true;submit.hidden=true;progress.textContent=t('Request sent — keep your request number below.','अनुरोध पठाइयो — तलको अनुरोध नम्बर राख्नुहोस्।');feedback.focus();}else{const invalid=form.querySelector('[aria-invalid=true]');if(invalid){const index=sections.findIndex(section=>section.contains(invalid));if(index>=0){step=index;show();}}}});
 show();
})();
