const serviceSymbols={building:'🏛',bolt:'ϟ',ticket:'✈',wallet:'▣',book:'▤',chat:'↗'};
export const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function serviceCards(rows,ne=false){const lang=ne?'ne':'en',prefix=ne?'/ne':'';return rows.map((s,i)=>`<article class="service-card" data-service="${escapeHtml(s.title_en+' '+s.title_ne+' '+s['description_'+lang]+' '+JSON.parse(s.items_json).flat().join(' '))}"><div class="card-top"><span class="icon-box" aria-hidden="true">${serviceSymbols[s.icon]||serviceSymbols.chat}</span><span class="serial">${String(i+1).padStart(2,'0')}</span></div><h3><a href="${prefix}/services/${s.id}">${escapeHtml(s['title_'+lang])}</a></h3><p>${escapeHtml(s['description_'+lang])}</p><p class="service-price">${ne?'सेवा शुल्क रु.':'Service charge from Rs.'} ${s.starting_price}${ne?' देखि':''}</p><a class="text-link" href="${prefix}/services/${s.id}">${ne?'सेवाबारे जान्नुहोस्':'Explore service'} →</a></article>`).join('');}
export function serviceDetail(s,ne=false){const lang=ne?'ne':'en',prefix=ne?'/ne':'';const items=JSON.parse(s.items_json);return `<section class="page-intro wrap"><p class="eyebrow">${ne?'सेवा मार्गदर्शन':'SERVICE GUIDE'}</p><h1>${escapeHtml(s['title_'+lang])}</h1><p class="lead">${escapeHtml(s['description_'+lang])}</p></section><section class="wrap section compact prose"><p class="notice">${ne?'सेवा शुल्क रु.':'Service charge from Rs.'} ${s.starting_price}${ne?' देखि। प्रक्रिया, समय र कामको जटिलताअनुसार अन्तिम शुल्क पुष्टि हुन्छ। सरकारी वा प्रदायक शुल्क छुट्टै हुन्छ।':'. Final charges depend on the process, time and complexity. Official or provider fees are separate.'}</p><ul class="service-items">${items.map(x=>`<li>${escapeHtml(x[ne?1:0])}</li>`).join('')}</ul><p>${escapeHtml(s['note_'+lang])}</p><a class="button" href="${prefix}/request?service=${s.id}">${ne?'यो सेवा अनुरोध गर्नुहोस्':'Request this service'} →</a></section>`;}
export async function catalogPage(response,env,url){
 if(env.MANAGEMENT_ENABLED!=='true'||!response.headers.get('Content-Type')?.includes('text/html'))return response;
 const ne=url.pathname.startsWith('/ne'),path=url.pathname.replace(/^\/ne(?=\/|$)/,'')||'/';
 if(!['/','/services','/request','/pricing'].includes(path)&&!path.startsWith('/services/'))return response;
 const rows=(await env.DB.prepare('SELECT * FROM service_catalog WHERE active=1 ORDER BY sort_order,id').all()).results;
 let html=await response.text(),status=response.status;
 if(path==='/pricing'){
  html=html.replace('</main>',`<section class="wrap section compact"><p class="eyebrow">${ne?'सेवाअनुसार शुल्क':'FIND YOUR STARTING PRICE'}</p><h2>${ne?'सेवा छान्नुहोस्, शुल्क बुझ्नुहोस्':'Choose a service. Know where to start.'}</h2><p>${ne?'यी प्रारम्भिक सेवा शुल्क हुन्। कामअघि अन्तिम रकम पुष्टि गर्छौँ।':'These are starting service charges. We confirm your full quote before you approve any work.'}</p><div class="service-grid">${serviceCards(rows,ne)}</div></section></main>`);
 }else if(path.startsWith('/services/')){
  const id=path.slice('/services/'.length),service=rows.find(s=>s.id===id);if(!service)return new Response('Service not available. Please visit /services.',{status:404,headers:{'Content-Type':'text/plain;charset=utf-8'}});
  html=html.replace(/<main id="main" tabindex="-1">[\s\S]*?<\/main>/,`<main id="main" tabindex="-1">${serviceDetail(service,ne)}</main>`);
  html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${escapeHtml(service[ne?'title_ne':'title_en'])} | Nath Online Services</title>`);
  const canonical='https://www.nathonline.com.np'+url.pathname;
  html=html.replace(/(<link rel="canonical" href=")[^"]+/,`$1${canonical}`).replace(/(<meta property="og:url" content=")[^"]+/,`$1${canonical}`);
  html=html.replace(/(<meta property="og:title" content=")[^"]+/,`$1${escapeHtml(service[ne?'title_ne':'title_en'])} | Nath Online Services`);
  html=html.replace(/(<link rel="alternate" hreflang="en" href=")[^"]+/,`$1https://www.nathonline.com.np/services/${id}`).replace(/(<link rel="alternate" hreflang="ne" href=")[^"]+/,`$1https://www.nathonline.com.np/ne/services/${id}`);html=html.replace(/(class="language"[^>]*href=")[^"]+/,`$1${ne?'':'/ne'}/services/${id}`).replace(/(name="description" content=")[^"]+/,`$1${escapeHtml(service[ne?'description_ne':'description_en'])}`);status=200;
 }else{
  html=html.replace(/<!--catalog-start-->[\s\S]*?<!--catalog-end-->/g,`<!--catalog-start-->${serviceCards(rows,ne)}<!--catalog-end-->`);
  html=html.replace(/<!--service-options-start-->[\s\S]*?<!--service-options-end-->/,rows.map(s=>`<option value="${s.id}">${escapeHtml(s[ne?'title_ne':'title_en'])}</option>`).join(''));
  html=html.replace(/<!--quick-services-start-->[\s\S]*?<!--quick-services-end-->/,rows.slice(0,4).map(s=>`<a href="${ne?'/ne':''}/services/${s.id}">${escapeHtml(s[ne?'title_ne':'title_en'])} →</a>`).join(''));
 }
 return new Response(html,{status,headers:response.headers});
}
