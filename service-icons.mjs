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
export function serviceIllustration(name){return `<svg class="service-illustration" viewBox="0 0 240 96" fill="none" aria-hidden="true" focusable="false"><rect x="1" y="1" width="238" height="94" rx="18" fill="currentColor" opacity=".04"/><circle cx="183" cy="24" r="22" fill="currentColor" opacity=".07"/><path d="M18 77h204M24 65c32-36 54 26 93-11s57-24 98-9" stroke="currentColor" opacity=".18" stroke-dasharray="4 5"/><rect x="76" y="12" width="82" height="70" rx="14" fill="currentColor" opacity=".09"/><g transform="translate(95 24) scale(1.8)" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]||paths.chat}"/></g><circle cx="47" cy="30" r="5" fill="currentColor" opacity=".3"/><path d="M188 66h12m-6-6v12" stroke="currentColor" opacity=".35" stroke-width="2"/></svg>`;}
