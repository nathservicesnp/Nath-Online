const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function conversation(DB,reference){
 const row=await DB.prepare('SELECT conversation_version,waiting_customer,status FROM enquiries WHERE reference=?').bind(reference).first();
 if(!row)return null;
 const rows=(await DB.prepare('SELECT sender,body,created_at FROM request_messages WHERE reference=? ORDER BY id DESC LIMIT 51').bind(reference).all()).results;
 return {version:row.conversation_version,waiting:row.status!=='closed'&&!!row.waiting_customer,messages:rows.slice(0,50).reverse(),hasMore:rows.length>50};
}
export async function sendMessage(DB,reference,sender,d,actor=''){
 const body=typeof d.message==='string'?d.message.trim():'';
 if(!body||body.length>1500||!Number.isInteger(d.version)||d.version<0||typeof d.key!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(d.key)||(sender==='team'&&typeof d.waiting!=='boolean'))return json({error:'Check the message and retry identifier.'},422);
 const prior=await DB.prepare('SELECT sender,body,waiting FROM request_messages WHERE reference=? AND retry_key=?').bind(reference,d.key).first();
 if(prior)return prior.sender===sender&&prior.body===body&&prior.waiting===(sender==='team'&&d.waiting?1:0)?json({saved:true}):json({error:'Retry details changed. Refresh before sending.'},409);
 const result=await DB.batch([
  DB.prepare("UPDATE enquiries SET conversation_version=conversation_version+1,waiting_customer=?,updated_at=datetime('now') WHERE reference=? AND conversation_version=? AND status<>'closed'").bind(sender==='team'&&d.waiting?1:0,reference,d.version),
  DB.prepare('INSERT INTO request_messages(reference,sender,body,retry_key,actor,waiting) SELECT reference,?,?,?,?,? FROM enquiries WHERE reference=? AND changes()=1').bind(sender,body,d.key,actor,sender==='team'&&d.waiting?1:0,reference)
 ]);
 return result[0].meta.changes===1?json({saved:true}):json({error:'The request changed or is closed. Refresh and review before sending.'},409);
}
export async function conversationApi(request,env,path,actor,readBody){
 const match=path.match(/^\/requests\/(NOS-[A-F0-9]{24})\/messages$/);if(!match)return null;
 if(request.method==='GET'){const data=await conversation(env.DB,match[1]);return data?json(data):json({error:'Not found'},404);}
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 const parsed=await readBody(request);if(parsed.error)return parsed.error;return sendMessage(env.DB,match[1],'team',parsed.data,actor.email);
}
