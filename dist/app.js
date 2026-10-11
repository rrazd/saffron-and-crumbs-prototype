const products = window.SaffronProducts;
const dietaryCheck = '<svg class="dietary-check" viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="7" fill="#824443"/><path d="m3.5 7 2.2 2.2 4.8-4.7" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const dietaryMarkup = '<span class="hero-dietary" aria-label="Dietary information">' + ['Peanut free', 'Gelatin free', 'Eggless option'].map(label => `<span>${dietaryCheck}<span class="dietary-label">${label}</span></span>`).join('') + '</span>';
const heroDescription = product => (product.heroDescription || product.description).replace(/<\/em>/, `</em><span class="hero-product-name hero-product-name-emphasis"><span class="hero-product-dot" aria-hidden="true">·</span>${window.SaffronStore.escape(product.name + (product.category === 'Cakes' ? ' cake' : ''))}</span>`) + dietaryMarkup;
const slides = [...document.querySelectorAll('.hero-slide')];
let currentSlide = 0;
const carousel = document.querySelector('.hero-carousel');
const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
let manuallyStopped = false;
let hovered = false;
let rotationTimer = null;
function pauseRotation() { clearTimeout(rotationTimer); rotationTimer = null; }
function scheduleRotation() {
  pauseRotation();
  if (manuallyStopped || hovered || document.hidden || motionPreference?.matches) return;
  rotationTimer = setTimeout(() => { showSlide(currentSlide + 1); scheduleRotation(); }, 7000);
}
function manualSlide(index) { manuallyStopped = true; pauseRotation(); showSlide(index); }

try {
  const savedProduct = localStorage.getItem('saffron-hero-slide');
  const savedIndex = products.slice(0, slides.length).findIndex(product => product.id === savedProduct);
  if (savedIndex >= 0) currentSlide = savedIndex;
} catch {}
function showSlide(index) {
  currentSlide = (index + slides.length) % slides.length;
  try { localStorage.setItem('saffron-hero-slide', products[currentSlide].id); } catch {}
  slides.forEach((slide, i) => {
    slide.hidden = i !== currentSlide;
    slide.setAttribute('aria-hidden',String(i !== currentSlide));
    slide.toggleAttribute('inert',i !== currentSlide);
    if(i === currentSlide){const img=slide.querySelector('img');img.loading='eager';img.fetchPriority='high';}
  });
  const upcoming = slides[(currentSlide + 1) % slides.length].querySelector('img');
  upcoming.loading = 'eager'; upcoming.fetchPriority = 'low';
  document.querySelectorAll('[data-hero-slide]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.heroSlide)===currentSlide)));
  document.querySelector('#slide-status').setAttribute('aria-live',manuallyStopped?'polite':'off');
  for (const [type, slide] of [['pistachio', 0], ['petal', 1], ['katli', 2]]) {
    document.querySelectorAll(`.${type}-accent`).forEach(accent => accent.toggleAttribute('hidden', currentSlide !== slide));
  }
  const product = products[currentSlide];
  document.querySelector('#slide-number').textContent = String(currentSlide + 1).padStart(2, '0');
  document.querySelector('#slide-progress').style.transform = `translateY(${currentSlide * 100}%)`;
  document.querySelector('#slide-status').textContent = `Image ${currentSlide + 1} of ${slides.length}: ${product.name}`;
  document.querySelector('#hero-title').innerHTML = product.title;
  document.querySelector('#hero-description').innerHTML = heroDescription(product);
  const link = document.querySelector('#hero-shop');
  link.textContent = 'View Cake'; link.href = `/cakes/${product.id}/`; link.setAttribute('aria-label', `View ${product.name}`);
  carousel.classList.remove('ingredients-burst');
  void carousel.offsetWidth;
  carousel.classList.add('ingredients-burst');
  window.SaffronStore.updateHeader();
}
document.querySelector('#previous-slide').addEventListener('click', () => manualSlide(currentSlide - 1));
document.querySelector('#next-slide').addEventListener('click', () => manualSlide(currentSlide + 1));
carousel.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); manualSlide(currentSlide + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
let touchStartX = null;
carousel.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
carousel.addEventListener('touchend', event => {
  if (touchStartX === null) return;
  const delta = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(delta) > 50) manualSlide(currentSlide + (delta < 0 ? 1 : -1));
  touchStartX = null;
}, { passive: true });
showSlide(currentSlide);

document.querySelectorAll('[data-hero-slide]').forEach(button=>button.addEventListener('click',()=>manualSlide(Number(button.dataset.heroSlide))));
carousel.addEventListener('mouseenter',()=>{hovered=true;pauseRotation();});
carousel.addEventListener('mouseleave',()=>{hovered=false;scheduleRotation();});
carousel.addEventListener('focusin',pauseRotation);
carousel.addEventListener('focusout',scheduleRotation);
document.addEventListener('visibilitychange',scheduleRotation);
motionPreference?.addEventListener('change',scheduleRotation);
function reserveCopySpace() {
  const copy=document.querySelector('.hero-copy');
  for(const [selector,key] of [['#hero-title','title'],['#hero-description','description']]){
    const element=document.querySelector(selector);
    const width=element.getBoundingClientRect().width;
    if(!width)return;
    const probe=element.cloneNode(true);
    probe.removeAttribute('id');probe.setAttribute('aria-hidden','true');
    Object.assign(probe.style,{position:'absolute',visibility:'hidden',width:`${width}px`,minHeight:'0',height:'auto',pointerEvents:'none'});
    copy.appendChild(probe);
    let maximum=0;
    products.slice(0,slides.length).forEach(product=>{probe.innerHTML=key === 'description' ? heroDescription(product) : product[key];maximum=Math.max(maximum,probe.getBoundingClientRect().height);});
    probe.remove();element.style.minHeight=`${Math.ceil(maximum)}px`;
  }
}
window.addEventListener('resize',reserveCopySpace);
document.fonts?.ready.then(reserveCopySpace);
reserveCopySpace();scheduleRotation();
