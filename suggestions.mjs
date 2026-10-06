const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function submitSuggestion(request,env,d){
 const id=request.headers.get('Idempotency-Key');
 const phone=typeof d.phone==='string'?d.phone.replace(/[\s()-]/g,'').replace(/^\+977/,''):'';
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||'')||!['service','website','other'].includes(d.category)||typeof d.message!=='string'||d.message.trim().length<5||d.message.length>1500||d.consent!==true||typeof d.reply!=='boolean'||(d.reply&&!/^9[678]\d{8}$/.test(phone))||d.website)return reply({error:'Check your suggestion and contact preference.'},422);
 const contact=d.reply?phone:'',message=d.message.trim(),payload=JSON.stringify([d.category,message,contact]);
 await env.DB.prepare('INSERT INTO suggestions(id,payload,category,message,phone) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,payload,d.category,message,contact).run();
 const saved=await env.DB.prepare('SELECT payload FROM suggestions WHERE id=?').bind(id).first();
 return saved?.payload===payload?reply({saved:true},201):reply({error:'Your earlier suggestion differs. Reload before sending another.'},409);
}
export async function suggestionAdmin(request,env,url,readBody){
 if(url.pathname!=='/admin/api/suggestions')return null;
 if(request.method==='GET'){
  const status=url.searchParams.get('status')||'new';if(!['new','reviewing','planned','available','not_proceeding','all'].includes(status))return reply({error:'Invalid status'},400);
  const page=Number(url.searchParams.get('page')||0);if(!Number.isInteger(page)||page<0||page>10000)return reply({error:'Invalid page'},400);
  const where=status==='all'?'':'WHERE status=?';const args=status==='all'?[]:[status];
  const rows=await env.DB.prepare(`SELECT id,category,message,phone,status,note,duplicate_of,version,created_at FROM suggestions ${where} ORDER BY created_at DESC,id LIMIT 51 OFFSET ?`).bind(...args,page*50).all();
  return reply({suggestions:rows.results.slice(0,50),hasMore:rows.results.length>50});
 }
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 const parsed=await readBody(request);if(parsed.error)return parsed.error;const d=parsed.data;
 if(typeof d.id!=='string'||!Number.isInteger(d.version)||!['new','reviewing','planned','available','not_proceeding'].includes(d.status)||typeof d.note!=='string'||d.note.length>2000||typeof d.duplicate_of!=='string'||d.duplicate_of.length>36||d.duplicate_of===d.id)return reply({error:'Check status, notes and duplicate reference.'},422);
 if(d.duplicate_of&&!await env.DB.prepare('SELECT id FROM suggestions WHERE id=?').bind(d.duplicate_of).first())return reply({error:'Original suggestion not found.'},422);
 const result=await env.DB.prepare("UPDATE suggestions SET status=?,note=?,duplicate_of=?,version=version+1,updated_at=datetime('now') WHERE id=? AND version=?").bind(d.status,d.note,d.duplicate_of,d.id,d.version).run();
 return result.meta.changes?reply({saved:true}):reply({error:'Suggestion changed. Reload before editing.'},409);
}
