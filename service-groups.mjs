export const serviceGroups=[
 ['government','Government Services','सरकारी सेवा'],
 ['travel','Travel & Ticketing','यात्रा तथा टिकट'],
 ['business','Business & Tax','व्यवसाय तथा कर'],
 ['education','Education & Career','शिक्षा तथा करियर'],
 ['banking','Banking & Payments','बैंकिङ तथा भुक्तानी'],
 ['property','Land & Property','जग्गा तथा सम्पत्ति']
];
// Preserve existing database categories and request history; group the public catalogue.
export function serviceGroup(s){
 const title=(s.id+' '+(s.title_en||s.en||'')).toLowerCase();
 if(/\b(pan|tax|business|vat|company)\b/.test(title))return 'business';
 if(/\b(land|property|malpot)\b/.test(title))return 'property';
 return s.category==='utilities'||s.id==='utilities'?'banking':s.category||s.id;
}
