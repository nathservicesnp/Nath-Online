export const discoveryGroups=[
 ['government','Government Services','सरकारी सेवा','building'],
 ['travel','Travel & Ticketing','यात्रा तथा टिकट','ticket'],
 ['business','Business & Tax','व्यवसाय तथा कर','business'],
 ['education','Education & Career','शिक्षा तथा करियर','book'],
 ['banking','Banking & Payments','बैंकिङ तथा भुक्तानी','wallet'],
 ['property','Land & Property','जग्गा तथा सम्पत्ति','property']
];
export function discoveryGroupsFor(service){
 const groups=new Set([service.category||service.id]);
 if(groups.has('utilities')){groups.delete('utilities');groups.add('banking');}
 const title=[service.id,service.title_en||service.en||'',service.items_json||JSON.stringify(service.items||[])].join(' ').toLowerCase();
 if(/\b(pan|tax|business|vat|company)\b/.test(title))groups.add('business');
 if(/\b(land|property|malpot)\b/.test(title))groups.add('property');
 return [...groups];
}
