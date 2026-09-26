const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function csvCell(value){let s=String(value??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
const download=(body,type,name)=>new Response(body,{headers:{'Content-Type':type,'Content-Disposition':`attachment; filename="${name}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function recordsApi(request,env,url){
 if(request.method!=='GET')return null;
 const path=url.pathname.replace(/^\/admin\/api/,'');
 if(path==='/retention'){
  const counts=await env.DB.prepare("SELECT SUM(CASE WHEN status='closed' AND closed_at < datetime('now','-90 days') THEN 1 ELSE 0 END) AS eligible, SUM(CASE WHEN status='closed' AND closed_at >= datetime('now','-90 days') AND closed_at < datetime('now','-83 days') THEN 1 ELSE 0 END) AS due_soon FROM enquiries").first();
  return json({days:90,eligible:counts.eligible||0,due_soon:counts.due_soon||0});
 }
 if(path==='/exports/requests.csv'){
  const q=(url.searchParams.get('q')||'').trim().slice(0,100),status=url.searchParams.get('status')||'';
  if(status&&!['new','contacted','in_progress','closed'].includes(status))return json({error:'Invalid status'},400);
  const page=Math.max(0,Math.min(10000,Math.floor(Number(url.searchParams.get('page'))||0)));
  const rows=(await env.DB.prepare("SELECT reference,name,phone,service_title,service,status,outcome,created_at,closed_at,quote_json,paid_paisa FROM enquiries WHERE (?='' OR status=?) AND (?='' OR instr(lower(reference),lower(?))>0 OR instr(phone,?)>0 OR instr(lower(name),lower(?))>0) ORDER BY created_at DESC,reference DESC LIMIT 50 OFFSET ?").bind(status,status,q,q,q,q,page*50).all()).results;
  const fields=['Request number','Customer','Phone','Service','Status','Outcome','Created (UTC)','Closed (UTC)','Quote total NPR','Received NPR','Balance NPR'];
  const lines=rows.map(r=>{const total=JSON.parse(r.quote_json).reduce((n,x)=>n+x.paisa,0);return [r.reference,r.name,r.phone,r.service_title||r.service,r.status,r.outcome,r.created_at,r.closed_at,(total/100).toFixed(2),(r.paid_paisa/100).toFixed(2),((total-r.paid_paisa)/100).toFixed(2)];});
  return download('\ufeff'+[fields,...lines].map(row=>row.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8',`nath-requests-page-${page+1}.csv`);
 }
 const match=path.match(/^\/exports\/(NOS-[A-F0-9]{24})\.json$/);if(!match)return null;
 const record=await env.DB.prepare('SELECT reference,name,phone,service,service_id,service_title,message,status,outcome,internal_note,created_at,updated_at,closed_at,quote_json,paid_paisa,quote_shared,quote_revision,accepted_revision,accepted_at FROM enquiries WHERE reference=?').bind(match[1]).first();
 if(!record)return json({error:'Request not found'},404);
 const statusHistory=(await env.DB.prepare('SELECT actor,action,from_status,to_status,outcome,created_at FROM request_events WHERE reference=? ORDER BY id LIMIT 1001').bind(match[1]).all()).results;
 const financeHistory=(await env.DB.prepare('SELECT actor,quote_json,paid_paisa,payment_note,created_at FROM finance_events WHERE reference=? ORDER BY id LIMIT 1001').bind(match[1]).all()).results;
 if(statusHistory.length>1000||financeHistory.length>1000)return json({error:'This history is too large for a browser export. Request a private database backup instead.'},413);
 const acceptances=(await env.DB.prepare('SELECT revision,quote_json,accepted_at FROM quote_acceptances WHERE reference=? ORDER BY id LIMIT 1001').bind(match[1]).all()).results;
 if(acceptances.length>1000)return json({error:'Acceptance history too large for browser export'},413);
 return download(JSON.stringify({quote_acceptances:acceptances,exported_at:new Date().toISOString(),currency:'NPR',amount_unit:'paisa (100 paisa = 1 NPR)',record,status_history:statusHistory,finance_history:financeHistory},null,2),'application/json;charset=utf-8',match[1]+'.json');
}
