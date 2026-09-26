// Synthetic WebAuthn protocol test, strictly limited to the disposable preview.
// Does not create or use an actual person's device credential.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes,createHash,generateKeyPairSync,sign} from 'node:crypto';
import {isoCBOR} from '@simplewebauthn/server/helpers';
const origin='https://nath-official-preview.nathservicesnp.workers.dev';
const db='nath-official-enquiries-preview';
const hash=x=>createHash('sha256').update(x).digest(),b64=x=>Buffer.from(x).toString('base64url');
const key=randomBytes(32).toString('hex'),credentialID=randomBytes(32),id=b64(credentialID);
function sql(command){const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute',db,'--remote','--env','','--command',command,'--json'],{encoding:'utf8',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(result.status!==0)throw Error('Preview database operation failed (details suppressed)');return JSON.parse(result.stdout);}
const state=sql('SELECT (SELECT COUNT(*) FROM admin_passkeys) AS keys_count,(SELECT COUNT(*) FROM admin_setup) AS setup_count');assert.equal(state[0].results[0].keys_count,0);assert.equal(state[0].results[0].setup_count,0);
let cookies={},syntheticReference=null;
async function call(path,data){const r=await fetch(origin+'/admin/auth/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Nath-Admin':'1',Cookie:Object.entries(cookies).map(([k,v])=>k+'='+v).join('; ')},body:JSON.stringify(data)});for(const c of r.headers.getSetCookie()){const [k,v]=c.split(';')[0].split('=');cookies[k]=v;}assert.equal(r.status,200,'Preview authentication step failed: '+path);return r.json();}
try {
 sql(`INSERT INTO admin_setup VALUES(1,'${hash(key).toString('hex')}',${Math.floor(Date.now()/1000)+600})`);
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048}),jwk=publicKey.export({format:'jwk'});
 const pub=isoCBOR.encode(new Map([[1,3],[3,-257],[-1,Buffer.from(jwk.n,'base64url')],[-2,Buffer.from(jwk.e,'base64url')]]));
 const o=await call('register/options',{setupKey:key});const len=Buffer.alloc(2);len.writeUInt16BE(credentialID.length);
 const auth=Buffer.concat([hash(new URL(origin).hostname),Buffer.from([0x45]),Buffer.alloc(4),Buffer.alloc(16),len,credentialID,Buffer.from(pub)]);
 await call('register/verify',{id,rawId:id,type:'public-key',response:{clientDataJSON:b64(JSON.stringify({type:'webauthn.create',challenge:o.challenge,origin})),attestationObject:b64(isoCBOR.encode(new Map([['fmt','none'],['attStmt',new Map()],['authData',auth]]))),transports:['internal']},clientExtensionResults:{}});
 const me=await fetch(origin+'/admin/api/me',{headers:{Cookie:Object.entries(cookies).map(([k,v])=>k+'='+v).join('; ')}});assert.equal(me.status,200);assert.equal((await me.json()).email,'Nath owner');

 const customer=await fetch(origin+'/api/requests',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({name:'Synthetic Quote Test',phone:'9800000000',service:'education',message:'Disposable preview quote test',consent:true})});assert.equal(customer.status,201);syntheticReference=(await customer.json()).reference;
 const adminHeaders={Origin:origin,'Content-Type':'application/json','X-Nath-Admin':'1',Cookie:Object.entries(cookies).map(([k,v])=>k+'='+v).join('; ')};
 const summary=await fetch(origin+'/admin/api/overview',{headers:adminHeaders});assert.equal(summary.status,200);
 const quote=await fetch(origin+'/admin/api/requests/'+syntheticReference+'/finance',{method:'PATCH',headers:adminHeaders,body:JSON.stringify({version:0,items:[{description:'Test assistance',kind:'service',paisa:10000}],paid_paisa:5000,payment_note:'Synthetic preview verification'})});assert.equal(quote.status,200);
 const finance=await(await fetch(origin+'/admin/api/requests/'+syntheticReference+'/finance',{headers:adminHeaders})).json();assert.equal(finance.paid_paisa,5000);assert.equal(finance.history.length,1);
 const shared=await fetch(origin+'/admin/api/requests/'+syntheticReference+'/finance',{method:'PATCH',headers:adminHeaders,body:JSON.stringify({version:1,items:[{description:'Test assistance',kind:'service',paisa:10000}],paid_paisa:5000,payment_note:'Synthetic quote share',quote_shared:true,payment_instructions:'Preview-only instructions'})});assert.equal(shared.status,200);
 const customerHeaders={Origin:origin,'Content-Type':'application/json'};
 const tracked=await(await fetch(origin+'/api/track',{method:'POST',headers:customerHeaders,body:JSON.stringify({reference:syntheticReference,phone:'9800000000'})})).json();assert.equal(tracked.quote.payment_instructions,'');
 const accepted=await fetch(origin+'/api/quote-accept',{method:'POST',headers:customerHeaders,body:JSON.stringify({reference:syntheticReference,phone:'9800000000',revision:tracked.quote.revision,accept:true})});assert.equal(accepted.status,200);assert.equal((await accepted.json()).accepted,true);
 console.log('Preview customer quote sharing and acceptance passed.');
 const dashboard=await fetch(origin+'/admin',{headers:adminHeaders});assert.equal(dashboard.status,200);assert.ok((await dashboard.text()).includes('finance-form'));
 const exported=await fetch(origin+'/admin/api/exports/'+syntheticReference+'.json',{headers:adminHeaders});assert.equal(exported.status,200);assert.equal((await exported.json()).finance_history.length,2);
 const csv=await fetch(origin+'/admin/api/exports/requests.csv?q='+syntheticReference,{headers:adminHeaders});assert.equal(csv.status,200);assert.ok((await csv.text()).includes(syntheticReference));
 const retention=await fetch(origin+'/admin/api/retention',{headers:adminHeaders});assert.equal((await retention.json()).days,90);
 console.log('Preview exports and retention checks passed.');
 console.log('Preview overview, quote save, partial payment, audit history and authenticated dashboard checks passed.');
 await call('logout',{});
 const login=await call('login/options',{}),counter=Buffer.alloc(4);counter.writeUInt32BE(1);
 const auth2=Buffer.concat([hash(new URL(origin).hostname),Buffer.from([5]),counter]),client=Buffer.from(JSON.stringify({type:'webauthn.get',challenge:login.challenge,origin}));
 await call('login/verify',{id,rawId:id,type:'public-key',response:{clientDataJSON:b64(client),authenticatorData:b64(auth2),signature:b64(sign('sha256',Buffer.concat([auth2,hash(client)]),privateKey)),userHandle:b64('nath-owner')},clientExtensionResults:{}});
 await call('logout',{});
 assert.equal((await fetch(origin+'/admin/api/requests')).status,401);
 console.log('Preview passed: cryptographic registration, owner session, sign-in, logout and unauthenticated denial.');
}finally {
 if(syntheticReference&&/^NOS-[A-F0-9]{24}$/.test(syntheticReference))sql(`DELETE FROM enquiries WHERE reference='${syntheticReference}' AND name='Synthetic Quote Test'`);
 // Exact synthetic credential only. Foreign key cascades remove its sessions.
 sql(`DELETE FROM admin_passkeys WHERE id='${id}'; DELETE FROM admin_setup WHERE token_hash='${hash(key).toString('hex')}';`);
 console.log('Synthetic preview passkey and bootstrap removed. Production was not used.');
}
