import {escapeHtml as esc} from './catalog.mjs';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function contentApi(request,env,path,readBody){
 if(path!=='/website-content')return null;
 if(request.method==='GET')return reply({content:(await env.DB.prepare("SELECT * FROM website_content WHERE id NOT LIKE 'admin:%' ORDER BY id").all()).results});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 const parsed=await readBody(request);if(parsed.error)return parsed.error;const d=parsed.data;
 if(!/^service:[a-z][a-z0-9-]{1,59}$/.test(d.id||'')&&d.id!=='review'&&d.id!=='home'&&d.id!=='announcement'&&d.id!=='featured')return reply({error:'Invalid content ID'},422);
 if(!Number.isInteger(d.version)||d.version<0||!d.content||typeof d.content!=='object')return reply({error:'Invalid content'},422);
 const fields=d.id==='announcement'?['text_en','text_ne']:d.id==='featured'?['service_ids']:d.id==='home'?['title_en','title_ne','intro_en','intro_ne']:d.id==='review'?['name','text_en','text_ne']:['checklist_en','checklist_ne','timeline_en','timeline_ne','questions_en','questions_ne'];
 if(fields.some(k=>typeof d.content[k]!=='string'||d.content[k].length>1200))return reply({error:'Text must be at most 1,200 characters per field'},422);
 if(d.content.published===true&&(d.content.confirmed!==true||fields.some(k=>!d.content[k].trim())))return reply({error:'Complete both languages and confirm accuracy/permission before publishing'},422);
 const content=Object.fromEntries(fields.map(k=>[k,d.content[k].trim()]));content.published=d.content.published===true;content.confirmed=d.content.confirmed===true;
 if(d.id==='featured'){const ids=content.service_ids.split(',').map(x=>x.trim()).filter(Boolean);if(ids.length>3||new Set(ids).size!==ids.length||ids.some(id=>!/^[a-z][a-z0-9-]{1,59}$/.test(id)))return reply({error:'Choose up to three different services'},422);const rows=(await env.DB.prepare('SELECT id FROM service_catalog WHERE active=1').all()).results;if(ids.some(id=>!rows.some(s=>s.id===id)))return reply({error:'Choose visible services only'},422);content.service_ids=ids.join(',');}
 if(d.id==='announcement'){
  for(const key of ['starts_at','ends_at']){const value=d.content[key]??'';if(typeof value!=='string'||(value&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value)))return reply({error:'Invalid announcement time'},422);content[key]=value;}
  if(content.starts_at&&content.ends_at&&content.ends_at<=content.starts_at)return reply({error:'Expiry must be after the start time'},422);
 }
 const encoded=JSON.stringify(content);
 const result=d.version===0?await env.DB.prepare('INSERT INTO website_content(id,data_json) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(d.id,encoded).run():await env.DB.prepare("UPDATE website_content SET data_json=?,version=version+1,updated_at=datetime('now') WHERE id=? AND version=?").bind(encoded,d.id,d.version).run();
 return result.meta.changes===1?reply({saved:true}):reply({error:'Content changed. Reload before saving.'},409);
}
export function announcementVisible(value,now=Date.now()){
 if(!value?.published||!value.confirmed)return false;
 const start=value.starts_at?Date.parse(value.starts_at):-Infinity,end=value.ends_at?Date.parse(value.ends_at):Infinity;
 return now>=start&&now<end;
}
export async function enrichWebsite(response,env,url){
 if(!response.headers.get('Content-Type')?.includes('text/html')||url.pathname.startsWith('/admin'))return response;
 const path=url.pathname.replace(/^\/ne(?=\/|$)/,'')||'/',ne=url.pathname.startsWith('/ne'),lang=ne?'ne':'en';

 const rows=(await env.DB.prepare("SELECT id,data_json FROM website_content WHERE id NOT LIKE 'admin:%'").all()).results;
 const content=Object.fromEntries(rows.map(r=>[r.id,JSON.parse(r.data_json)]));let html=await response.text();
 const announcement=content.announcement;if(announcementVisible(announcement))html=html.replace('<main id="main" tabindex="-1">',`<main id="main" tabindex="-1"><aside class="site-announcement wrap" aria-label="${ne?'सूचना':'Announcement'}"><strong>${ne?'सूचना':'Notice'}</strong><p>${esc(announcement['text_'+lang])}</p></aside>`);
 const featured=content.featured;if(path==='/'&&featured?.published&&featured.confirmed){const rows=(await env.DB.prepare("SELECT id,title_en,title_ne FROM service_catalog WHERE active=1 AND availability='available'").all()).results;const selected=featured.service_ids.split(',').map(id=>rows.find(s=>s.id===id)).filter(Boolean);if(selected.length){const panel=`<section class="wrap featured-services" aria-label="${ne?'विशेष सेवा':'Featured services'}"><h2>${ne?'विशेष सेवा':'Featured services'}</h2><div class="task-shortcuts">${selected.map(s=>`<a class="button secondary" href="${ne?'/ne':''}/services/${s.id}">${esc(s['title_'+lang])} →</a>`).join('')}</div></section>`;html=html.replace('<section class="wrap section"><div class="section-head">',panel+'<section class="wrap section"><div class="section-head">');}}
 const service=content['service:'+path.slice('/services/'.length)];
 if(path.startsWith('/services/')&&service?.published&&service.confirmed){const c=service;html=html.replace('</main>',`<section class="wrap section compact prose"><h2>${ne?'तयारी सूची':'Before you start'}</h2><ul>${c['checklist_'+lang].split('\n').filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h3>${ne?'अनुमानित समय':'Expected timing'}</h3><p>${esc(c['timeline_'+lang])}</p><p>${ne?'यो अनुमान हो; सम्बन्धित निकाय वा प्रदायकको प्रक्रियाले समय फरक हुन सक्छ।':'This is an estimate; authority or provider processing may change the timing.'}</p></section></main>`);}
 if(path==='/request'){html=html.replace(/<option value="([a-z][a-z0-9-]+)"([^>]*)>/g,(match,id,attributes)=>{const c=content['service:'+id];return c?.published&&c.confirmed?`<option value="${id}"${attributes} data-guidance="${esc(c['questions_'+lang])}">`:match;});}
 const home=content.home;if(path==='/'&&home?.published&&home.confirmed){html=html.replace(/(<div class="hero-copy">[\s\S]*?<h1>)[\s\S]*?<\/h1>/,(_,start)=>start+esc(home['title_'+lang])+'</h1>');html=html.replace(/(<div class="hero-copy">[\s\S]*?<p class="lead">)[\s\S]*?<\/p>/,(_,start)=>start+esc(home['intro_'+lang])+'</p>');}
 const review=content.review;if(path==='/'&&review?.published&&review.confirmed)html=html.replace('</main>',`<section class="wrap section prose"><p class="eyebrow">${ne?'ग्राहकको अनुभव':'CUSTOMER EXPERIENCE'}</p><blockquote><p>${esc(review['text_'+lang])}</p><footer>${esc(review.name)}</footer></blockquote></section></main>`);
 return new Response(html,{status:response.status,headers:response.headers});
}
