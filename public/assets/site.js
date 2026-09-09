document.documentElement.classList.add('js');
const toggle=document.querySelector('.menu');
const nav=document.querySelector('.navlinks');
function closeMenu(){nav?.classList.remove('open');toggle?.setAttribute('aria-expanded','false');}
toggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});
nav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav?.classList.contains('open')){closeMenu();toggle.focus();}});

// Reveal only when supported; reduced-motion visitors see content immediately.
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}
    });
  }, {threshold:0.08});
  document.querySelectorAll('.section-head,.card,.steps article,.pricing,.contact').forEach(element => {
    element.classList.add('reveal-ready');observer.observe(element);
  });
  // Keyboard focus should never land on visually hidden content.
  document.addEventListener('focusin', event => event.target.closest('.reveal-ready')?.classList.add('visible'));
}
