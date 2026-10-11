const { parseHTML } = require('linkedom');
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const stored = new Map();
function boot(file, languages = ['en-CA'], detectedCountry = null) {
  const { document, window } = parseHTML(fs.readFileSync(file, 'utf8'));
  window.location = { pathname: file.replace(/^dist/, '').replace(/index\.html$/, '') };
  window.HTMLElement.prototype.getBoundingClientRect = function () { return this.classList.contains('header') ? { top: 0, bottom: 85, height: 85 } : { top: 100, bottom: 700, height: 600 }; };
  document.querySelectorAll('dialog').forEach(dialog => { dialog.showModal = () => dialog.setAttribute('open', ''); dialog.close = () => dialog.removeAttribute('open'); });
  if (detectedCountry) window.SaffronDetectedCountry = detectedCountry;
  window.HTMLElement.prototype.focus = function () { this.wasFocused = true; };
  const market = document.querySelector('#market-trigger');
  const text = document.querySelector('#purchase-message');
  if (text) { text.setCustomValidity = message => { text.validationMessage = message; }; text.reportValidity = () => false; }
  const context = vm.createContext({ document, window, navigator: { languages }, Intl, localStorage: { getItem(key) { return stored.get(key) || null; }, setItem(key, value) { stored.set(key, value); } }, requestAnimationFrame(callback) { callback(); }, setTimeout() { return 1; }, clearTimeout() {} });
  for (const file of ['products.js', 'store.js', document.querySelector('#home') ? 'app.js' : 'pages.js']) vm.runInContext(fs.readFileSync(`dist/${file}`, 'utf8'), context);
  return { document, window, market, event(element, type) { element.dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true })); } };
}
const visible = (page, selector) => [...page.document.querySelectorAll(selector)].filter(element => !element.hasAttribute('hidden'));
stored.set('saffron-hero-slide', 'kaju-katli');
let home = boot('dist/index.html');
assert.equal(visible(home, '.pistachio-accent').length, 0);
assert.equal(visible(home, '.katli-accent').length, 4);
assert.equal(home.document.querySelector('#hero-shop').getAttribute('href'), '/cakes/kaju-katli/');
home.document.querySelector('#previous-slide').click();
assert.equal(visible(home, '.petal-accent').length, 4);
assert.equal(visible(home, '.pistachio-accent').length, 0);
assert.equal(home.document.querySelector('#hero-shop').getAttribute('href'), '/cakes/diwali-box/');
home = boot('dist/index.html');
assert.equal(home.document.querySelector('#slide-number').textContent, '02');
let catalogue = boot('dist/catalogue/index.html');
assert.equal(visible(catalogue, '.catalogue-card').length, 14);
catalogue.document.querySelector('[data-filter="Cakes"]').click();
assert.equal(visible(catalogue, '.catalogue-card').length, 4);
catalogue.document.querySelector('[data-filter="Cake cups"]').click();
assert.equal(visible(catalogue, '.catalogue-card').length, 9);
catalogue.document.querySelector('[data-filter="Gift boxes"]').click();
assert.equal(visible(catalogue, '.catalogue-card').length, 1);
let detail = boot('dist/cakes/kaju-katli/index.html');
assert.equal(detail.document.querySelector('.breadcrumbs [aria-current]').textContent, 'Kaju Katli Cake');
assert.equal(detail.document.querySelector('[value="printed"]'), null);
const calligraphy = detail.document.querySelector('[value="calligraphy"]');
detail.event(calligraphy, 'change');
assert(!detail.document.querySelector('#message-entry').hasAttribute('hidden'));
assert.equal(detail.document.querySelector('#selection-total').textContent, 'CA$95.00');
const form = detail.document.querySelector('#product-order-form'), text = detail.document.querySelector('#purchase-message');
detail.event(form, 'submit');
assert.equal(JSON.parse(stored.get('saffron-cart-v3') || '[]').length, 0);
assert.equal(text.validationMessage, 'Please write your message.');
text.value = '<img src=x onerror=alert(1)> & Happy Birthday!';
detail.event(text, 'input'); detail.event(form, 'submit');
assert.equal(JSON.parse(stored.get('saffron-cart-v3'))[0].messageType, 'calligraphy');
assert.equal(JSON.parse(stored.get('saffron-cart-v3'))[0].message, text.value);
assert.equal(detail.document.querySelector('#cart-content img'), null);
assert(detail.document.querySelector('#cart-content').innerHTML.includes('&lt;img'));
detail.market.click();
assert(!detail.document.querySelector('#market-menu').hasAttribute('hidden'));
detail.document.querySelector('[data-market="US"]').click();
assert.equal(detail.document.querySelector('#market-code').textContent, 'USD');
assert.equal(detail.document.querySelector('#market-flag').textContent, '🇺🇸');
assert.equal(detail.document.querySelector('[data-market="US"]').getAttribute('aria-checked'), 'true');
assert(detail.document.querySelector('#market-menu').hasAttribute('hidden'));
assert.equal(stored.get('saffron-market'), 'US');
assert.equal(detail.document.querySelector('#selection-total').textContent, 'US$70.50');
assert(detail.document.querySelector('#cart-content').textContent.includes('US$70.50'));
detail.event(detail.document.querySelector('[value="calligraphy"]'), 'change');
text.value = 'Happy Anniversary'; detail.event(form, 'submit');
assert.equal(JSON.parse(stored.get('saffron-cart-v3')).length, 2);
assert.equal(JSON.parse(stored.get('saffron-cart-v3'))[1].messageType, 'calligraphy');
detail = boot('dist/cakes/kaju-katli/index.html');
assert.equal(detail.document.querySelector('#market-code').textContent, 'USD');
assert(detail.document.querySelector('#cart-content').textContent.includes('Happy Anniversary'));
assert(detail.document.querySelector('#cart-content').textContent.includes('Handwritten calligraphy'));
detail.document.querySelector('[data-delta="1"]').click();
assert.equal(JSON.parse(stored.get('saffron-cart-v3'))[0].quantity, 2);
catalogue = boot('dist/catalogue/index.html');
assert.equal(catalogue.document.querySelector('[data-price-product="kaju-katli"]').textContent, 'US$66.00');
stored.clear();
const us = boot('dist/catalogue/index.html', ['en-US']);
assert.equal(us.document.querySelector('#market-code').textContent, 'USD');
assert.equal(us.document.querySelector('[data-price-product="kaju-katli"]').textContent, 'US$66.00');
stored.clear();
const detected = boot('dist/catalogue/index.html', ['en-US'], 'CA');
assert.equal(detected.document.querySelector('#market-code').textContent, 'CAD');
detected.document.querySelector('[data-market="US"]').click();
const persisted = boot('dist/about/index.html', ['en-CA'], 'CA');
assert.equal(persisted.document.querySelector('#market-code').textContent, 'USD');
assert.equal(persisted.document.querySelector('[data-market="US"]').getAttribute('aria-checked'), 'true');
persisted.market.click();
const escapeEvent = new persisted.window.Event('keydown', { bubbles: true, cancelable: true });
escapeEvent.key = 'Escape'; persisted.document.dispatchEvent(escapeEvent);
assert(persisted.document.querySelector('#market-menu').hasAttribute('hidden'));
assert.equal(persisted.market.getAttribute('aria-expanded'), 'false');
assert.equal(persisted.document.querySelectorAll('.founder-portrait').length, 2);
assert(detail.document.querySelector('.product-page-copy > .breadcrumbs'));
assert.equal(detail.document.querySelector('.product-page-copy > .eyebrow'), null);
assert.equal(detail.document.querySelector('.back-to-catalogue'), null);
stored.clear(); stored.set('saffron-cart-v2', '{"berry":2,"gulab-jamun":1}');
const legacy = boot('dist/index.html');
assert.equal(legacy.document.querySelector('#cart-count').textContent, '3');
assert(legacy.document.querySelector('#cart-content').textContent.includes('Berry Celebration'));
console.log('Passed: SVG ingredient isolation, refreshed hero, full-page links, 14-product grid and filters, breadcrumbs, separate CAD/USD preview pricing and persistent selection, message validation and escaping, per-message cart lines, quantities and legacy migration.');

const contact = boot('dist/contact/index.html');
const launcher = contact.document.querySelector('#whatsapp-toggle');
launcher.click();
assert(!contact.document.querySelector('#whatsapp-panel').hasAttribute('hidden'));
assert.equal(launcher.getAttribute('aria-expanded'), 'true');
assert.equal(contact.document.querySelector('.whatsapp-team').getAttribute('href'), 'https://wa.me/14166628709');
assert.equal(contact.document.querySelector('.whatsapp-team').getAttribute('target'), '_blank');
launcher.click();
assert(contact.document.querySelector('#whatsapp-panel').hasAttribute('hidden'));
assert.equal(contact.document.querySelector('.contact-email-label').textContent, 'Email');
assert(contact.document.querySelector('.contact-email-subtext').textContent.includes('For orders'));
assert.equal(contact.document.querySelector('.contact-unconfigured'), null);
assert(contact.document.querySelector('.footer-copyright').textContent.includes('Copyright © 2026'));
const about = boot('dist/about/index.html');
assert(about.document.querySelector('.about-story').textContent.includes('a mother’s love for baking'));
assert.equal(about.document.querySelectorAll('.founder-portrait figcaption').length, 2);
assert.equal(about.document.querySelector('.founder-art-note'), null);
assert.equal(about.document.querySelector('.nav-panel[aria-current="page"]').getAttribute('href'), '/about/');
console.log('Passed: WhatsApp open/close and exact business link, contact email layout, copyright, supplied story and removed portrait captions.');

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value,16)/255).map(value => value <= .04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
  return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
function contrast(foreground, background) {const values=[luminance(foreground),luminance(background)].sort((a,b)=>a-b);return (values[1]+.05)/(values[0]+.05);}
const textPairs = [
 ['Footer normal/hover/focus','#ffffff','#9e5655'],
 ['Muted text on warm panels','#625d59','#efe4d6'],
 ['Accent labels on portrait paper','#6e3635','#ddc5ba'],
 ['Primary button','#ffffff','#824443'],
 ['Primary hover','#ffffff','#6e3635'],
 ['WhatsApp header','#ffffff','#128044'],
 ['WhatsApp hover','#ffffff','#0c6635'],
 ['Placeholder','#625d59','#ffffff'],
 ['Menu selection','#824443','#efe4d6'],
 ['Dark header worst-case blend','#fffaf1','#38322e'],
 ['Light header worst-case blend','#302923','#e7e1d9']
];
for (const [name,foreground,background] of textPairs) assert(contrast(foreground,background)>=4.5,`${name} contrast fails`);
for (const [name,foreground,background] of [['Input boundary','#8e8177','#fbf5ec'],['Focus ring','#824443','#fbf5ec'],['WhatsApp icon','#128044','#edf7ef']]) assert(contrast(foreground,background)>=3,`${name} contrast fails`);
console.log('Passed: 11 text/state palette pairs ≥4.5:1; input, focus and icon pairs ≥3:1.');
const giftDetail = boot('dist/cakes/diwali-box/index.html');
assert.equal(visible(giftDetail,'[data-gallery-slide]').length,1);
giftDetail.event(giftDetail.document.querySelector('[data-gallery-step="1"]'),'click');
assert.equal(visible(giftDetail,'[data-gallery-slide]')[0].dataset.gallerySlide,'1');
assert.equal(giftDetail.document.querySelector('[data-gallery-select="1"]').getAttribute('aria-pressed'),'true');
giftDetail.event(giftDetail.document.querySelector('[data-gallery-step="1"]'),'click');
assert.equal(visible(giftDetail,'[data-gallery-slide]')[0].dataset.gallerySlide,'0');
assert([...catalogue.document.querySelectorAll('.card-view')].every(link=>link.textContent==='View details'));
console.log('Passed: Diwali photo carousel switches/wraps and catalogue View details labels.');

stored.clear();
let cartState = boot('dist/cakes/kaju-katli/index.html');
const cartButton = cartState.document.querySelector('#open-cart');
assert(!cartButton.classList.contains('has-items'));
assert.equal(cartButton.getAttribute('aria-label'), 'Open cart, 0 items');
const animations = [];
cartState.window.HTMLElement.prototype.animate = function (frames, options) {
  animations.push({ element: this, frames, options });
  return { finished: { then(done) { done(); } } };
};
cartState.window.matchMedia = () => ({ matches: false });
cartState.window.innerHeight = 800;
const addButton = cartState.document.querySelector('#product-order-form [type="submit"]');
addButton.getBoundingClientRect = () => ({ left: 300, top: 450, bottom: 490, width: 160, height: 40 });
cartState.document.querySelector('#open-cart .cart-icon').getBoundingClientRect = () => ({ left: 900, top: 20, bottom: 48, width: 28, height: 28 });
assert(cartState.window.SaffronStore.add('kaju-katli', 'none', '', addButton));
assert(cartButton.classList.contains('has-items'));
assert.equal(cartButton.getAttribute('aria-label'), 'Open cart, 1 item');
assert.equal(animations.length, 2);
assert(animations.some(animation => animation.element.className === 'cart-flight'));
assert.equal(cartState.document.querySelector('.cart-flight'), null);
cartState.window.matchMedia = () => ({ matches: true });
assert(cartState.window.SaffronStore.add('kaju-katli', 'none', '', addButton));
assert.equal(animations.length, 2, 'Reduced motion skips both animations');
assert.equal(cartState.document.querySelector('#cart-count').textContent, '2');
cartState = boot('dist/cakes/kaju-katli/index.html');
assert(cartState.document.querySelector('#open-cart').classList.contains('has-items'));
cartState.document.querySelector('[data-remove-line]').click();
assert(!cartState.document.querySelector('#open-cart').classList.contains('has-items'));
assert.equal(cartState.document.querySelector('#cart-count').textContent, '0');
console.log('Passed: shopping-bag cart badge, persistent count, empty reset, non-blocking flight cleanup and reduced-motion behavior.');
