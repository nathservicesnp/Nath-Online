import {escapeHtml as esc} from './catalog.mjs';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function contentApi(request,env,path,readBody){
 if(path!=='/website-content')return null;
 if(request.method==='GET')return reply({content:(await env.DB.prepare('SELECT * FROM website_content ORDER BY id').all()).results});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 const parsed=await readBody(request);if(parsed.error)return parsed.error;const d=parsed.data;
 if(!/^service:[a-z][a-z0-9-]{1,59}$/.test(d.id||'')&&d.id!=='review')return reply({error:'Invalid content ID'},422);
 if(!Number.isInteger(d.version)||d.version<0||!d.content||typeof d.content!=='object')return reply({error:'Invalid content'},422);
 const fields=d.id==='review'?['name','text_en','text_ne']:['checklist_en','checklist_ne','timeline_en','timeline_ne','questions_en','questions_ne'];
 if(fields.some(k=>typeof d.content[k]!=='string'||d.content[k].length>1200))return reply({error:'Text must be at most 1,200 characters per field'},422);
 if(d.content.published===true&&(d.content.confirmed!==true||fields.some(k=>!d.content[k].trim())))return reply({error:'Complete both languages and confirm accuracy/permission before publishing'},422);
 const content=Object.fromEntries(fields.map(k=>[k,d.content[k].trim()]));content.published=d.content.published===true;content.confirmed=d.content.confirmed===true;
 const encoded=JSON.stringify(content);
 const result=d.version===0?await env.DB.prepare('INSERT INTO website_content(id,data_json) VALUES(?,?) ON CONFLICT(id) DO NOTHING').bind(d.id,encoded).run():await env.DB.prepare("UPDATE website_content SET data_json=?,version=version+1,updated_at=datetime('now') WHERE id=? AND version=?").bind(encoded,d.id,d.version).run();
 return result.meta.changes===1?reply({saved:true}):reply({error:'Content changed. Reload before saving.'},409);
}
export async function enrichWebsite(response,env,url){
 if(!response.headers.get('Content-Type')?.includes('text/html')||url.pathname.startsWith('/admin'))return response;
 const path=url.pathname.replace(/^\/ne(?=\/|$)/,'')||'/',ne=url.pathname.startsWith('/ne'),lang=ne?'ne':'en';
 if(!['/','/request'].includes(path)&&!path.startsWith('/services/'))return response;
 const rows=(await env.DB.prepare('SELECT id,data_json FROM website_content').all()).results;
 const content=Object.fromEntries(rows.map(r=>[r.id,JSON.parse(r.data_json)]));let html=await response.text();
 const service=content['service:'+path.slice('/services/'.length)];
 if(path.startsWith('/services/')&&service?.published&&service.confirmed){const c=service;html=html.replace('</main>',`<section class="wrap section compact prose"><h2>${ne?'तयारी सूची':'Before you start'}</h2><ul>${c['checklist_'+lang].split('\n').filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h3>${ne?'अनुमानित समय':'Expected timing'}</h3><p>${esc(c['timeline_'+lang])}</p><p>${ne?'यो अनुमान हो; सम्बन्धित निकाय वा प्रदायकको प्रक्रियाले समय फरक हुन सक्छ।':'This is an estimate; authority or provider processing may change the timing.'}</p></section></main>`);}
 if(path==='/request'){html=html.replace(/<option value="([a-z][a-z0-9-]+)">/g,(match,id)=>{const c=content['service:'+id];return c?.published&&c.confirmed?`<option value="${id}" data-guidance="${esc(c['questions_'+lang])}">`:match;});}
 const review=content.review;if(path==='/'&&review?.published&&review.confirmed)html=html.replace('</main>',`<section class="wrap section prose"><p class="eyebrow">${ne?'ग्राहकको अनुभव':'CUSTOMER EXPERIENCE'}</p><blockquote><p>${esc(review['text_'+lang])}</p><footer>${esc(review.name)}</footer></blockquote></section></main>`);
 return new Response(html,{status:response.status,headers:response.headers});
}
