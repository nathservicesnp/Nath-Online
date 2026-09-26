const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function validateFinance(d){
 if(!Number.isInteger(d.version)||d.version<0||!Array.isArray(d.items)||d.items.length<1||d.items.length>20)return false;
 if(d.items.some(x=>!x||typeof x.description!=='string'||!x.description.trim()||x.description.length>160||!['service','provider'].includes(x.kind)||!Number.isSafeInteger(x.paisa)||x.paisa<0||x.paisa>100000000))return false;
 const total=d.items.reduce((n,x)=>n+x.paisa,0);
 return total>0&&Number.isSafeInteger(d.paid_paisa)&&d.paid_paisa>=0&&d.paid_paisa<=total&&typeof d.payment_note==='string'&&d.payment_note.trim().length>0&&d.payment_note.length<=500;
}
export async function financeApi(request,env,path,actor,readBody){
 if(path==='/overview'&&request.method==='GET'){
  const rows=(await env.DB.prepare('SELECT status,COUNT(*) AS count FROM enquiries GROUP BY status').all()).results;
  return reply({counts:Object.fromEntries(rows.map(r=>[r.status,r.count]))});
 }
 const match=path.match(/^\/requests\/(NOS-[A-F0-9]{24})\/finance$/);if(!match)return null;
 if(request.method==='GET'){
  const record=await env.DB.prepare('SELECT quote_json,paid_paisa,finance_version FROM enquiries WHERE reference=?').bind(match[1]).first();if(!record)return reply({error:'Request not found'},404);
  const history=(await env.DB.prepare('SELECT quote_json,paid_paisa,payment_note,created_at FROM finance_events WHERE reference=? ORDER BY id DESC LIMIT 100').bind(match[1]).all()).results;
  return reply({items:JSON.parse(record.quote_json),paid_paisa:record.paid_paisa,version:record.finance_version,history});
 }
 if(request.method==='PATCH'){
  const parsed=await readBody(request);if(parsed.error)return parsed.error;const d=parsed.data;
  if(!validateFinance(d))return reply({error:'Enter item descriptions, valid amounts, a payment total no greater than the quote, and a change note.'},422);
  const items=JSON.stringify(d.items.map(x=>({...x,description:x.description.trim()})));
  const results=await env.DB.batch([
   env.DB.prepare('UPDATE enquiries SET quote_json=?,paid_paisa=?,finance_version=finance_version+1 WHERE reference=? AND finance_version=?').bind(items,d.paid_paisa,match[1],d.version),
   env.DB.prepare('INSERT INTO finance_events(reference,actor,quote_json,paid_paisa,payment_note) SELECT reference,?,quote_json,paid_paisa,? FROM enquiries WHERE reference=? AND changes()=1').bind(actor.email,d.payment_note.trim(),match[1])
  ]);
  return results[0].meta.changes===1?reply({saved:true}):reply({error:'Quote or payment changed. Reopen the request before saving.'},409);
 }
 return reply({error:'Method not allowed'},405);
}
