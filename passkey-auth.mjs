import {generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse} from '@simplewebauthn/server';
const now=()=>Math.floor(Date.now()/1000);
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
export const tokenHash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
const cookie=(request,name)=>request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||'';
const cookieValue=(name,value,age)=>`${name}=${value}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}`;
const answer=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer'}});
const enabled=env=>env.ADMIN_AUTH==='passkey'&&env.ADMIN_ENABLED==='true'&&env.DB;
async function session(request,env){
 const token=cookie(request,'__Host-nath-admin');if(!/^[a-f0-9]{64}$/.test(token))return null;
 return env.DB.prepare('SELECT token_hash,credential_id,authenticated_at FROM admin_sessions WHERE token_hash=? AND expires_at>?').bind(await tokenHash(token),now()).first();
}
export async function passkeyAdministrator(request,env){
 if(!enabled(env))return null;const s=await session(request,env);
 return s?{email:'Nath owner',sub:s.credential_id}:null;
}
export async function passkeyAuth(request,env,url,readBody){
 if(!enabled(env)||url.protocol!=='https:')return answer({error:'Admin sign-in is not available yet'},503);
 if(request.method!=='POST')return answer({error:'POST required'},405);
 if(request.headers.get('Origin')!==url.origin||request.headers.get('X-Nath-Admin')!=='1')return answer({error:'Request not allowed'},403);
 if(!env.AUTH_LIMITER)return answer({error:'Sign-in temporarily unavailable'},503);
 if(!(await env.AUTH_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'local'})).success)return answer({error:'Please wait a minute before trying again'},429);
 const parsed=await readBody(request);if(parsed.error)return parsed.error;const data=parsed.data;
 const action=url.pathname.slice('/admin/auth/'.length),rpID=url.hostname;
 if(action==='logout'){
  const s=await session(request,env);if(s)await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(s.token_hash).run();
  const r=answer({ok:true});r.headers.append('Set-Cookie',cookieValue('__Host-nath-admin','',0));return r;
 }
 if(action==='register/options'||action==='login/options'){
  let bootstrap=null,currentSession=null;
  const keys=(await env.DB.prepare('SELECT id,transports FROM admin_passkeys').all()).results;
  if(action==='register/options'){
   if(keys.length>=5)return answer({error:'Five passkeys are already registered'},409);
   currentSession=await session(request,env);
   if(!currentSession||currentSession.authenticated_at<now()-300){
    currentSession=null;
    if(typeof data.setupKey!=='string'||!/^[a-f0-9]{64}$/.test(data.setupKey)||keys.length)return answer({error:'Use the private owner setup link, or sign in again to add a backup passkey'},403);
    bootstrap=await tokenHash(data.setupKey);
    if(!await env.DB.prepare('SELECT id FROM admin_setup WHERE id=1 AND token_hash=? AND expires_at>?').bind(bootstrap,now()).first())return answer({error:'Setup link is invalid or expired'},403);
   }
  }
  const options=action==='register/options'?await generateRegistrationOptions({rpName:'Nath Online Services',rpID,userID:new TextEncoder().encode('nath-owner'),userName:'Nath owner',attestationType:'none',supportedAlgorithmIDs:[-7,-257],excludeCredentials:keys.map(k=>({id:k.id,transports:JSON.parse(k.transports)})),authenticatorSelection:{residentKey:'required',userVerification:'required'}}):await generateAuthenticationOptions({rpID,userVerification:'required',allowCredentials:[]});
  const token=random();await env.DB.prepare('INSERT INTO admin_challenges(token_hash,challenge,purpose,bootstrap_hash,session_hash,expires_at) VALUES(?,?,?,?,?,?)').bind(await tokenHash(token),options.challenge,action.startsWith('register')?'register':'login',bootstrap,currentSession?.token_hash||null,now()+300).run();
  const r=answer(options);r.headers.append('Set-Cookie',cookieValue('__Host-nath-challenge',token,300));return r;
 }
 if(!['register/verify','login/verify'].includes(action))return answer({error:'Not found'},404);
 const challengeCookie=cookie(request,'__Host-nath-challenge');
 if(!/^[a-f0-9]{64}$/.test(challengeCookie))return answer({error:'Sign-in expired. Please start again.'},401);
 // DELETE RETURNING atomically consumes the challenge, including failed attempts.
 const challenge=await env.DB.prepare('DELETE FROM admin_challenges WHERE token_hash=? AND expires_at>? RETURNING *').bind(await tokenHash(challengeCookie),now()).first();
 if(!challenge||challenge.purpose!==(action.startsWith('register')?'register':'login'))return answer({error:'Sign-in expired. Please start again.'},401);
 let credentialId;
 try {
  if(action==='register/verify'){
   const verified=await verifyRegistrationResponse({response:data,expectedChallenge:challenge.challenge,expectedOrigin:url.origin,expectedRPID:rpID,requireUserVerification:true,requireUserPresence:true,supportedAlgorithmIDs:[-7,-257]});
   if(!verified.verified)throw Error('Invalid registration');
   const c=verified.registrationInfo.credential;
   const publicKey=Array.from(c.publicKey,n=>n.toString(16).padStart(2,'0')).join('');
   const fields=[c.id,publicKey,c.counter,JSON.stringify(c.transports||[]),now()];
   let saved;
   if(challenge.bootstrap_hash){
    const results=await env.DB.batch([
     env.DB.prepare('DELETE FROM admin_setup WHERE id=1 AND token_hash=? AND expires_at>? AND NOT EXISTS(SELECT 1 FROM admin_passkeys)').bind(challenge.bootstrap_hash,now()),
     env.DB.prepare('INSERT INTO admin_passkeys(id,public_key,counter,transports,created_at) SELECT ?,?,?,?,? WHERE changes()=1').bind(...fields)
    ]);saved=results[1].meta.changes===1;
   }else{
    const s=await session(request,env);
    if(!s||s.token_hash!==challenge.session_hash)throw Error('Session changed');
    const r=await env.DB.prepare('INSERT INTO admin_passkeys(id,public_key,counter,transports,created_at) SELECT ?,?,?,?,? FROM admin_sessions WHERE token_hash=? AND expires_at>? AND authenticated_at>? AND (SELECT COUNT(*) FROM admin_passkeys)<5').bind(...fields,s.token_hash,now(),now()-300).run();saved=r.meta.changes===1;
   }
   if(!saved)throw Error('Setup already used or expired');credentialId=c.id;
  }else{
   if(typeof data.id!=='string')throw Error('Missing credential');
   const key=await env.DB.prepare('SELECT * FROM admin_passkeys WHERE id=?').bind(data.id).first();if(!key)throw Error('Unknown passkey');
   const verified=await verifyAuthenticationResponse({response:data,expectedChallenge:challenge.challenge,expectedOrigin:url.origin,expectedRPID:rpID,requireUserVerification:true,credential:{id:key.id,publicKey:Uint8Array.from(key.public_key.match(/.{2}/g).map(h=>parseInt(h,16))),counter:key.counter,transports:JSON.parse(key.transports)}});
   if(!verified.verified)throw Error('Invalid sign-in');
   const update=await env.DB.prepare('UPDATE admin_passkeys SET counter=? WHERE id=? AND counter=?').bind(verified.authenticationInfo.newCounter,key.id,key.counter).run();if(update.meta.changes!==1)throw Error('Passkey changed');credentialId=key.id;
  }
 }catch{return answer({error:'Passkey verification failed. Please start again using your own passkey.'},401);}
 const token=random();await env.DB.prepare('INSERT INTO admin_sessions(token_hash,credential_id,authenticated_at,expires_at) VALUES(?,?,?,?)').bind(await tokenHash(token),credentialId,now(),now()+28800).run();
 const r=answer({ok:true});r.headers.append('Set-Cookie',cookieValue('__Host-nath-admin',token,28800));r.headers.append('Set-Cookie',cookieValue('__Host-nath-challenge','',0));return r;
}
export async function cleanAuth(env){if(env.ADMIN_AUTH==='passkey'&&env.DB){await env.DB.batch([env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(now()),env.DB.prepare('DELETE FROM admin_challenges WHERE expires_at<=?').bind(now()),env.DB.prepare('DELETE FROM admin_setup WHERE expires_at<=?').bind(now())]);}}
