// Fixed local SVG paths: catalogue values select an icon, never SVG markup.
const paths={
 building:'M3 21h18M5 21V9m14 12V9M3 9l9-6 9 6H3Zm6 4v4m6-4v4',
 bolt:'m13 2-9 12h7l-1 8 10-12h-7l1-8Z',
 ticket:'M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0-4V5Zm11 0v3m0 3v2m0 3v3',
 wallet:'M3 6h17v14H3V6Zm0 0V4h14v2m0 6h4v4h-4v-4Z',
 book:'M12 5v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2V4Z',
 chat:'M21 11a8 8 0 0 1-8 8H8l-5 3V7a5 5 0 0 1 5-5h5a8 8 0 0 1 8 9ZM7 8h10M7 12h7',
 business:'M4 7h16v14H4V7Zm4 0V3h8v4M4 12h16m-10 0v3h4v-3',
 property:'m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7'
};
export function serviceIcon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${paths[name]||paths.chat}"/></svg>`;}
