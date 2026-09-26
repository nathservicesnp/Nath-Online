const status=document.querySelector('#login-status'),login=document.querySelector('#passkey-login'),register=document.querySelector('#passkey-register');
let setupKey=location.hash.slice(1);history.replaceState(null,'',location.pathname+location.search);
if(/^[a-f0-9]{64}$/.test(setupKey)){register.hidden=false;document.querySelector('#setup-note').hidden=false;login.hidden=true;}
else {setupKey='';if(new URLSearchParams(location.search).get('add')==='1'){register.hidden=false;register.textContent='Add a backup passkey';}}
async function api(path,data){const r=await fetch('/admin/auth/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Nath-Admin':'1'},body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});const body=await r.json();if(!r.ok)throw Error(body.error||'Unable to sign in');return body;}
async function run(registration){login.disabled=register.disabled=true;status.textContent='Follow your device’s passkey prompt.';try{
 if(!window.PublicKeyCredential||!window.SimpleWebAuthnBrowser)throw Error('Passkeys are unavailable in this browser. Open this page in Chrome, Edge or Safari.');
 const optionsJSON=await api(registration?'register/options':'login/options',registration?{setupKey}:{});
 const response=registration?await SimpleWebAuthnBrowser.startRegistration({optionsJSON}):await SimpleWebAuthnBrowser.startAuthentication({optionsJSON});
 await api(registration?'register/verify':'login/verify',response);setupKey='';location.replace('/admin');
 }catch(error){status.textContent=error.name==='NotAllowedError'?'The passkey prompt was cancelled or timed out. You can try again.':error.message;status.focus();}finally{login.disabled=register.disabled=false;}}
login.addEventListener('click',()=>run(false));register.addEventListener('click',()=>run(true));
