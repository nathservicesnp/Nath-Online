// The request list and CSV export use identical filters and pagination.
export function requestFilters(params){
 const q=(params.get('q')||'').trim().slice(0,100),status=params.get('status')||'',work=params.get('work')||'';
 if(status&&!['new','contacted','in_progress','closed'].includes(status))return {error:'Invalid status'};
 const views={
  '':'1=1',
  reply:"status<>'closed' AND (status='new' OR (SELECT sender FROM request_messages m WHERE m.reference=enquiries.reference ORDER BY id DESC LIMIT 1)='customer')",
  waiting:"status<>'closed' AND waiting_customer=1",
  overdue:"status<>'closed' AND follow_up_at IS NOT NULL AND follow_up_at<=datetime('now')",
  closure:"status='in_progress' AND waiting_customer=0 AND quote_shared=1 AND accepted_at IS NOT NULL AND accepted_revision=quote_revision AND json_array_length(quote_json)>0 AND paid_paisa=(SELECT SUM(json_extract(value,'$.paisa')) FROM json_each(quote_json))"
 };
 if(!Object.hasOwn(views,work))return {error:'Invalid work filter'};
 const page=Math.max(0,Math.min(10000,Math.floor(Number(params.get('page'))||0)));
 return {page,where:`WHERE (?='' OR status=?) AND (?='' OR instr(lower(reference),lower(?))>0 OR instr(phone,?)>0 OR instr(lower(name),lower(?))>0) AND (${views[work]})`,args:[status,status,q,q,q,q]};
}
