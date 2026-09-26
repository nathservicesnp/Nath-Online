import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {createHash,generateKeyPairSync,randomBytes,sign} from 'node:crypto';
import {isoCBOR} from '@simplewebauthn/server/helpers';
import {passkeyAuth,passkeyAdministrator,tokenHash,cleanAuth} from '../passkey-auth.mjs';
const origin='https://www.nathonline.com.np',hash=x=>createHash('sha256').update(x).digest(),b64=x=>Buffer.from(x).toString('base64url');
const pair=generateKeyPairSync('rsa',{modulusLength:2048}),jwk=pair.publicKey.export({format:'jwk'});
const pub=isoCBOR.encode(new Map([[1,3],[3,-257],[-1,Buffer.from(jwk.n,'base64url')],[-2,Buffer.from(jwk.e,'base64url')]]));
function registration(options,{uv=true,site=origin}={}){
 const id=randomBytes(32),length=Buffer.alloc(2);length.writeUInt16BE(id.length);
 const auth=Buffer.concat([hash(new URL(origin).hostname),Buffer.from([uv?0x45:0x41]),Buffer.alloc(4),Buffer.alloc(16),length,id,Buffer.from(pub)]);
 return {id:b64(id),rawId:b64(id),type:'public-key',response:{clientDataJSON:b64(JSON.stringify({type:'webauthn.create',challenge:options.challenge,origin:site})),attestationObject:b64(isoCBOR.encode(new Map([['fmt','none'],['attStmt',new Map()],['authData',auth]]))),transports:['internal']},clientExtensionResults:{}};
}
function authentication(options,id,{counter=1,site=origin,uv=true,badSignature=false}={}){
 const count=Buffer.alloc(4);count.writeUInt32BE(counter);const auth=Buffer.concat([hash(new URL(origin).hostname),Buffer.from([uv?5:1]),count]);
 const client=Buffer.from(JSON.stringify({type:'webauthn.get',challenge:options.challenge,origin:site}));
 return {id,rawId:id,type:'public-key',response:{clientDataJSON:b64(client),authenticatorData:b64(auth),signature:b64(badSignature?randomBytes(256):sign('sha256',Buffer.concat([auth,hash(client)]),pair.privateKey)),userHandle:b64('nath-owner')},clientExtensionResults:{}};
}
async function setup(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');sqlite.exec(await readFile('migrations/0004_admin_passkeys.sql','utf8'));
 const prepare=(sql,args=[])=>({bind(...a){return prepare(sql,a);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}});
 const DB={prepare,async batch(items){sqlite.exec('BEGIN');try{const result=[];for(const item of items)result.push(await item.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const env={DB,ADMIN_AUTH:'passkey',ADMIN_ENABLED:'true',AUTH_LIMITER:{limit:async()=>({success:true})}};
 const key=randomBytes(32).toString('hex');sqlite.prepare('INSERT INTO admin_setup VALUES(1,?,?)').run(await tokenHash(key),Math.floor(Date.now()/1000)+300);
 const call=(path,data={},cookie='',site=origin)=>{const r=new Request(origin+'/admin/auth/'+path,{method:'POST',headers:{Origin:site,'Content-Type':'application/json','X-Nath-Admin':'1',Cookie:cookie},body:JSON.stringify(data)});return passkeyAuth(r,env,new URL(r.url),async r=>({data:await r.json()}));};
 const options=async(path,data={},cookie='')=>{const r=await call(path+'/options',data,cookie);assert.equal(r.status,200);return {options:await r.json(),cookie:r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ')};};
 return {sqlite,env,key,call,options};
}
test('owner setup verifies real attestation, consumes bootstrap once, and session logout revokes access',async()=>{
 const s=await setup();try{
  assert.equal((await s.call('register/options',{setupKey:'a'.repeat(64)})).status,403);
  const o=await s.options('register',{setupKey:s.key});const credential=registration(o.options);const r=await s.call('register/verify',credential,o.cookie);assert.equal(r.status,200);
  assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM admin_setup').get().n,0);
  assert.equal((await s.call('register/verify',credential,o.cookie)).status,401);
  assert.equal((await s.call('register/options',{setupKey:s.key})).status,403);
  const cookie=r.headers.getSetCookie().find(x=>x.startsWith('__Host-nath-admin=')).split(';')[0];assert.match(r.headers.getSetCookie()[0],/Secure; HttpOnly; SameSite=Strict/);
  const request=new Request(origin+'/admin',{headers:{Cookie:cookie}});assert.equal((await passkeyAdministrator(request,s.env)).email,'Nath owner');
  const rows=s.sqlite.prepare('SELECT token_hash FROM admin_sessions').all();assert.ok(!rows.some(row=>cookie.includes(row.token_hash)));
  assert.equal((await s.call('logout',{},cookie)).status,200);assert.equal(await passkeyAdministrator(request,s.env),null);
 }finally{s.sqlite.close();}
});
test('login requires a valid signature, verified device, correct origin and a fresh challenge',async()=>{
 const s=await setup();try{
  const o=await s.options('register',{setupKey:s.key}),credential=registration(o.options);assert.equal((await s.call('register/verify',credential,o.cookie)).status,200);
  for(const overrides of [{badSignature:true},{uv:false},{site:'https://evil.example'}]){const o=await s.options('login');assert.equal((await s.call('login/verify',authentication(o.options,credential.id,overrides),o.cookie)).status,401);}
  const o2=await s.options('login'),response=authentication(o2.options,credential.id);assert.equal((await s.call('login/verify',response,o2.cookie)).status,200);assert.equal((await s.call('login/verify',response,o2.cookie)).status,401);
  const stale=await s.options('login');assert.equal((await s.call('login/verify',authentication(stale.options,credential.id,{counter:1}),stale.cookie)).status,401);
 }finally{s.sqlite.close();}
});
test('setup rejects missing user verification, wrong origin, expired challenges and cross-origin requests',async()=>{
 const s=await setup();try{
  assert.equal((await s.call('login/options',{},'','https://evil.example')).status,403);
  for(const overrides of [{uv:false},{site:'https://evil.example'}]){const o=await s.options('register',{setupKey:s.key});assert.equal((await s.call('register/verify',registration(o.options,overrides),o.cookie)).status,401);}
  const o=await s.options('register',{setupKey:s.key});s.sqlite.exec('UPDATE admin_challenges SET expires_at=0');assert.equal((await s.call('register/verify',registration(o.options),o.cookie)).status,401);
  assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM admin_passkeys').get().n,0);assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM admin_setup').get().n,1);
  await cleanAuth(s.env);assert.equal(s.sqlite.prepare('SELECT COUNT(*) n FROM admin_challenges').get().n,0);
 }finally{s.sqlite.close();}
});
