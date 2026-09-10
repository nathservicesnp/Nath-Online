import {readFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('public');let checks=0;
for(const file of (await readdir(root)).filter(f=>f.endsWith('.html'))){const text=await readFile(path.join(root,file),'utf8');
for(const token of ['<title>','name="description"','rel="canonical"','id="main"','<h1','assets/site.css']){assert(text.includes(token),`${file}: missing ${token}`);checks++;}
assert.equal((text.match(/<h1[ >]/g)||[]).length,1,`${file}: one H1`);
const ids=[...text.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,`${file}: duplicate ID`);
for(const match of text.matchAll(/(?:href|src)="([^"]+)"/g)){const link=match[1];if(/^(https?:|tel:|mailto:)/.test(link))continue;const [pathname,fragment]=link.split('#');const target=path.resolve(root,pathname||file);const resolved=pathname==='./'?path.join(root,'index.html'):target;await access(resolved);if(fragment){const destination=await readFile(resolved,'utf8');assert(destination.includes(`id="${fragment}"`),`${file}: broken anchor ${link}`);}checks++;}
assert(!/Rs\.\s?50/.test(text),'Outdated price');
}
assert.equal((await readFile(path.join(root,'CNAME'),'utf8')).trim(),'www.nathonline.com.np');
const home=await readFile(path.join(root,'index.html'),'utf8');assert(home.includes('9779867302353'));assert(home.includes('Rs. 100'));
console.log(`Passed ${checks} metadata, local link and anchor checks; pricing, domain and phone verified.`);
