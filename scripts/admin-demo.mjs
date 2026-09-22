// Local-only synthetic UI test server. Never deploy this file as a Worker.
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {adminApi} from '../admin-api.mjs';
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
for(const name of ['0001_enquiries.sql','0002_management.sql','0003_seed_catalog.sql'])db.exec(await readFile('migrations/'+name,'utf8'));
db.prepare('INSERT INTO enquiries(reference,name,phone,service,message,consent_version,idempotency_key,payload_hash,service_id) VALUES(?,?,?,?,?,?,?,?,?)').run('NOS-000000000000000000000001','Synthetic demo customer','9800000000','education','DEMO ONLY: Please help me understand the scholarship application steps.','test','demo','demo','education');
const stmt=(sql,args=[])=>({bind(...v){return stmt(sql,v);},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}});
const env={MANAGEMENT_ENABLED:'true',DB:{prepare:stmt,async batch(items){db.exec('BEGIN');try{const result=[];for(const i of items)result.push(await i.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}}};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1:4182');if(req.headers.host!=='127.0.0.1:4182'){res.writeHead(403);return res.end();}let response;
if(url.pathname.startsWith('/admin/api/')){const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>8192)throw Error('Too large');chunks.push(c);}const request=new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});response=await adminApi(request,env,url,{email:'demo@example.test',sub:'demo'},async r=>({data:await r.json()}));}
else{const relative=url.pathname==='/admin'?'admin/index.html':url.pathname.slice(1);const file=path.resolve('dist',relative);if(!file.startsWith(path.resolve('dist')+path.sep))throw Error('Bad path');let body=await readFile(file);const type=file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':'text/html';if(type==='text/html')body=Buffer.from(body.toString().replace('BUSINESS WORKSPACE','SYNTHETIC DEMO · NO REAL CUSTOMER DATA'));response=new Response(body,{headers:{'Content-Type':type}});}
res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Demo error');}}).listen(4182,'127.0.0.1',()=>console.log('Synthetic admin demo: http://127.0.0.1:4182/admin'));
