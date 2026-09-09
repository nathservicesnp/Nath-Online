import {readFile,writeFile} from 'node:fs/promises';
const replacements=[
['Your local partner for online services','BUTWAL BASED. NEPAL CONNECTED.'],
['Less hassle.<br>More help.<br><span>All in one place.</span>','Your online work.<br><span>Made simple.</span>'],
['तपाईंको अनलाइन काममा, हाम्रो साथ।','अनलाइन कामको झन्झट? हामी छौँ नि!'],
['From applications to everyday payments, Nath helps you understand the steps and get things done. Connect from home, or meet us in Butwal.','Forms to fill? Bills to pay? Tickets to book? Tell us what you need — we’ll guide you, explain the price, and help with the next step.'],
['Chat on WhatsApp ↗','WhatsApp मा कुरा गरौँ ↗'],
['Explore services ↓','Find your service ↓'],
['ONE CONTACT. MANY EVERYDAY NEEDS.','तपाईंलाई के सहयोग चाहिन्छ?'],
['What can we help with?','Choose. Chat. Get help.'],
['Everyday services.<br>One helpful team.','What do you need<br>help with today?'],
['Choose a category to start a conversation. We’ll confirm availability, required details, and the next steps for your request.','Tap a service to ask us on WhatsApp. Not sure where to start? Just call — we’ll explain it in simple words.'],
['Ask about this service ↗','Get help with this ↗'],
['Government application assistance','Forms & government services'],
['Utility bill payments','Electricity, water & internet'],
['Banking & digital wallets','Banking & wallet help'],
['Education & applications','School, college & scholarships'],
['Other online processes','Other online services'],
['A little guidance goes a long way.','You don’t have to figure it out alone.'],
['Namaste.<br>How can we help?','One message.<br>A simpler next step.']
];
for(const file of ['public/index.html','scripts/generate.mjs']){let content=await readFile(file,'utf8');for(const [a,b]of replacements)content=content.replaceAll(a,b);await writeFile(file,content);}
let html=await readFile('public/index.html','utf8');
const icons=['▤','ϟ','✈','▣','✎','＋'];let i=0;
html=html.replace(/(<article class="card"><span class="symbol" aria-hidden="true">)\d+(<\/span>)/g,(_,a,b)=>a+icons[i++]+b);
html=html.replace('<p class="micro">English', '<div class="hero-pills"><span>✓ Clear prices</span><span>✓ Online + in person</span><span>✓ नेपालीमा सहयोग</span></div><p class="micro">English');
html=html.replace('<div class="cards">','<div class="service-shortcuts" aria-label="Quick service choices"><a href="https://wa.me/9779867302353?text=Namaste%2C%20I%20need%20help%20with%20a%20passport%20application">Passport <span>↗</span></a><a href="https://wa.me/9779867302353?text=Namaste%2C%20I%20need%20help%20with%20PAN">PAN card <span>↗</span></a><a href="https://wa.me/9779867302353?text=Namaste%2C%20I%20need%20help%20paying%20a%20bill">Pay a bill <span>↗</span></a><a href="https://wa.me/9779867302353?text=Namaste%2C%20I%20need%20help%20booking%20a%20ticket">Book a ticket <span>↗</span></a></div><div class="cards">');
html=html.replace('</main>','</main><aside class="quick-contact" aria-label="Quick contact"><a href="tel:+9779867302353">Call Nath</a><a href="https://wa.me/9779867302353?text=Namaste%2C%20I%20would%20like%20help%20with%20an%20online%20service">Let’s chat <span aria-hidden="true">↗</span></a></aside>');
await writeFile('public/index.html',html);
