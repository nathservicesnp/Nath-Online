import {services} from '../src/content.mjs';
import {writeFile} from 'node:fs/promises';
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
const sql=services.map((s,i)=>`INSERT INTO service_catalog(id,category,icon,title_en,title_ne,description_en,description_ne,note_en,note_ne,items_json,sort_order) VALUES(${[s.id,s.id,s.icon,s.en,s.ne,...s.desc,...s.note,JSON.stringify(s.items)].map(q).join(',')},${i}) ON CONFLICT(id) DO NOTHING;`).join('\n');
await writeFile('migrations/0003_seed_catalog.sql',sql+'\n');
