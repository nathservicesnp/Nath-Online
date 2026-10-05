const defaults=[
 {id:'details',title:'Ask for details',body:'Please tell us which details you need help with so we can proceed.\nकृपया अगाडि बढ्न कुन विवरणमा सहयोग चाहिएको हो बताउनुहोस्।',waiting:true},
 {id:'quote',title:'Quote ready',body:'Your quote is available in tracking. Please review the charges and accept only if you agree.\nशुल्क विवरण ट्र्याकिङमा छ। जाँचेर सहमत भए मात्र स्वीकार गर्नुहोस्।',waiting:false},
 {id:'delay',title:'Progress update',body:'We are checking your request. We will update you when we have confirmed information.\nहामी तपाईंको अनुरोध जाँच्दैछौँ। जानकारी पुष्टि भएपछि अपडेट गर्नेछौँ।',waiting:false},
 {id:'complete',title:'Completion update',body:'Please review the completion details below and contact us if you need clarification.\nतलको पूरा भएको कामको विवरण जाँच्नुहोस् र प्रश्न भए सम्पर्क गर्नुहोस्।',waiting:false}
].map(t=>({...t,category:'all',active:true,version:0}));
const prefix='admin:reply-template:';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function replyTemplateApi(request,env,path,readBody){
 if(path!=='/reply-templates')return null;
 if(request.method==='GET'){
  const rows=(await env.DB.prepare("SELECT id,data_json,version FROM website_content WHERE id LIKE 'admin:reply-template:%' ORDER BY id").all()).results;
  const templates=new Map(defaults.map(t=>[t.id,t]));for(const row of rows){const d=JSON.parse(row.data_json);templates.set(d.id,{...d,version:row.version});}
  return reply({templates:[...templates.values()]});
 }
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 const parsed=await readBody(request);if(parsed.error)return parsed.error;const {version,template:t}=parsed.data;
 if(!Number.isInteger(version)||version<0||!t||!/^[a-z][a-z0-9-]{1,59}$/.test(t.id||'')||typeof t.title!=='string'||!t.title.trim()||t.title.length>80||typeof t.body!=='string'||!t.body.trim()||t.body.length>1500||!['all','government','utilities','travel','banking','education','other'].includes(t.category)||typeof t.waiting!=='boolean'||typeof t.active!=='boolean')return reply({error:'Check title, message (maximum 1,500 characters), category and visibility.'},422);
 const content={id:t.id,title:t.title.trim(),body:t.body.trim(),category:t.category,waiting:t.waiting,active:t.active};
 const encoded=JSON.stringify(content),id=prefix+t.id;
 const result=version===0?await env.DB.prepare("INSERT INTO website_content(id,data_json) SELECT ?,? WHERE (SELECT COUNT(*) FROM website_content WHERE id LIKE 'admin:reply-template:%')<50 ON CONFLICT(id) DO NOTHING").bind(id,encoded).run():await env.DB.prepare("UPDATE website_content SET data_json=?,version=version+1,updated_at=datetime('now') WHERE id=? AND version=?").bind(encoded,id,version).run();
 return result.meta.changes===1?reply({saved:true}):reply({error:'The template changed or the 50-template limit was reached. Reload templates before saving.'},409);
}
