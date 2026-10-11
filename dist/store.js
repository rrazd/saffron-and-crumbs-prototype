(() => {
  const products = window.SaffronProducts;
  const knownProduct = id => products.find(product => product.id === id);
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const markets = {
    CA: { countryCode: 'CA', currencyCode: 'CAD', name: 'Canada', flag: '🇨🇦' },
    US: { countryCode: 'US', currencyCode: 'USD', name: 'United States', flag: '🇺🇸' }
  };
  function suggestedCountry() {
    const detected = window.SaffronDetectedCountry?.countryCode || window.SaffronDetectedCountry || document.documentElement.dataset.country;
    if (typeof detected === 'string' && markets[detected.toUpperCase()]) return detected.toUpperCase();
    const locales = navigator.languages || [navigator.language || ''];
    if (locales.some(locale => /-CA$/i.test(locale))) return 'CA';
    if (locales.some(locale => /-US$/i.test(locale))) return 'US';
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (/America\/(New_York|Chicago|Denver|Phoenix|Los_Angeles|Anchorage|Detroit|Indianapolis|Indiana\/|Kentucky\/)|Pacific\/Honolulu/.test(zone)) return 'US';
    return 'CA';
  }
  let country = read('saffron-market');
  if (!markets[country]) {
    const previousCurrency = read('saffron-currency');
    country = previousCurrency === 'USD' ? 'US' : previousCurrency === 'CAD' ? 'CA' : suggestedCountry();
  }
  let cart = [];
  try {
    const saved = JSON.parse(read('saffron-cart-v3') || 'null');
    if (Array.isArray(saved)) {
      cart = saved.filter(line => knownProduct(line.productId) && Number.isInteger(line.quantity) && line.quantity > 0).map((line, index) => ({
        lineId: typeof line.lineId === 'string' ? line.lineId : `saved-${index}`,
        productId: line.productId, quantity: Math.min(99, line.quantity),
        messageType: ['printed', 'calligraphy'].includes(line.messageType) ? line.messageType : 'none',
        message: typeof line.message === 'string' ? line.message.slice(0, 180) : ''
      }));
    } else {
      const old = JSON.parse(read('saffron-cart-v2') || 'null');
      if (old && typeof old === 'object') Object.entries(old).forEach(([id, quantity]) => {
        if (knownProduct(id) && Number.isInteger(quantity) && quantity > 0) cart.push({ lineId: `legacy-${id}`, productId: id, quantity: Math.min(99, quantity), messageType: 'none', message: '' });
      });
      else {
        const quantity = Math.min(99, Math.floor(Number(read('saffron-cart')) || 0));
        if (quantity > 0) cart.push({ lineId: 'legacy-strawberry', productId: 'strawberry', quantity, messageType: 'none', message: '' });
      }
    }
  } catch {}
  const subscriptions = new Set();
  let toastTimer, lineCounter = 0;
  // Explicit preview price tables; Shopify market prices replace these when connected.
  const fee = type => markets[country].currencyCode === 'CAD' ? ({ printed: 3, calligraphy: 6 }[type] || 0) : ({ printed: 2.5, calligraphy: 4.5 }[type] || 0);
  const price = product => product.price[markets[country].currencyCode];
  const money = value => `${markets[country].currencyCode === 'CAD' ? 'CA$' : 'US$'}${new Intl.NumberFormat('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
  function toast(message) {
    const element = document.querySelector('#toast');
    if (!element) return;
    element.textContent = message; element.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 3000);
  }
  function renderCart() {
    const count = document.querySelector('#cart-count');
    const previousQuantity = Number(count?.textContent || 0);
    const quantity = cart.reduce((total, line) => total + line.quantity, 0);
    if (count) count.textContent = quantity;
    const cartButton = document.querySelector('#open-cart');
    if (cartButton) {
      cartButton.classList.toggle('has-items', quantity > 0);
      cartButton.setAttribute('aria-label', `Open cart, ${quantity} ${quantity === 1 ? 'item' : 'items'}`);
    }
    if (quantity > previousQuantity && count?.animate && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      count.animate([{ transform: 'scale(1)', opacity: .75 }, { transform: 'scale(1.14)', opacity: 1, offset: .45 }, { transform: 'scale(1)', opacity: 1 }], { duration: 260, easing: 'ease-out' });
    }
    const element = document.querySelector('#cart-content');
    if (!element) return;
    if (!cart.length) {
      element.innerHTML = '<p>Your cart is empty.</p><a class="button secondary" href="/catalogue/">Explore the catalogue</a>';
      return;
    }
    let subtotal = 0;
    element.innerHTML = cart.map(line => {
      const product = knownProduct(line.productId), unit = price(product) + fee(line.messageType);
      subtotal += unit * line.quantity;
      const message = line.messageType !== 'none' ? `<p class="cart-message"><strong>${line.messageType === 'printed' ? 'Printed message' : 'Handwritten calligraphy'}</strong><br>${escape(line.message)}</p>` : '';
      const link = product.hidden ? escape(product.name) : `<a href="/cakes/${product.id}/">${escape(product.name)}</a>`;
      return `<div class="cart-row"><div class="cart-row-title"><strong>${link}</strong><span>${money(unit * line.quantity)}</span></div>${message}<div class="quantity"><button data-line="${escape(line.lineId)}" data-delta="-1" aria-label="Remove one ${escape(product.name)}">−</button><span>${line.quantity}</span><button data-line="${escape(line.lineId)}" data-delta="1" aria-label="Add one ${escape(product.name)}">+</button><button class="remove-line" data-remove-line="${escape(line.lineId)}">Remove</button></div></div>`;
    }).join('') + `<div class="cart-subtotal"><strong>Subtotal</strong><strong>${money(subtotal)}</strong></div>`;
  }
  function saveCart() { write('saffron-cart-v3', JSON.stringify(cart)); renderCart(); }
  const cartFlights = new Set();
  function animateCartAddition(product, source) {
    if (!source?.getBoundingClientRect || !source.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const target = document.querySelector('#open-cart .cart-icon') || document.querySelector('#open-cart');
    if (!target || !product.catalogueImage) return;
    const start = source.getBoundingClientRect(), end = target.getBoundingClientRect();
    if (!start.width || !end.width || start.bottom < 0 || start.top > window.innerHeight) return;
    // Keep repeated clicks responsive and avoid piling up decorative thumbnails.
    if (cartFlights.size >= 3) {
      const oldest = [...cartFlights][0]; oldest.remove(); cartFlights.delete(oldest);
    }
    const thumbnail = document.createElement('img');
    thumbnail.className = 'cart-flight';
    thumbnail.src = '/' + product.catalogueImage.replace(/^\//, '');
    thumbnail.alt = ''; thumbnail.setAttribute('aria-hidden', 'true');
    const x = start.left + start.width / 2, y = start.top + start.height / 2;
    thumbnail.style.left = `${x - 20}px`; thumbnail.style.top = `${y - 20}px`;
    document.body.appendChild(thumbnail); cartFlights.add(thumbnail);
    const dx = end.left + end.width / 2 - x, dy = end.top + end.height / 2 - y;
    const flight = thumbnail.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: .85 },
      { transform: `translate(${dx * .55}px, ${dy * .45 - 24}px) scale(.75)`, opacity: .7, offset: .55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.2)`, opacity: 0 }
    ], { duration: 560, easing: 'cubic-bezier(.2,.65,.35,1)' });
    const cleanup = () => { thumbnail.remove(); cartFlights.delete(thumbnail); };
    flight.finished.then(cleanup, cleanup);
    setTimeout(cleanup, 800);
  }
  function add(id, messageType = 'none', message = '', source = null) {
    const product = knownProduct(id);
    if (!product) return false;
    if (!['none', 'printed', 'calligraphy'].includes(messageType)) return false;
    message = messageType === 'none' ? '' : String(message).trim().slice(0, 180);
    if (messageType !== 'none' && !message) return false;
    const existing = cart.find(line => line.productId === id && line.messageType === messageType && line.message === message);
    if (existing) existing.quantity = Math.min(99, existing.quantity + 1);
    else cart.push({ lineId: `line-${Date.now()}-${lineCounter++}`, productId: id, quantity: 1, messageType, message });
    saveCart(); animateCartAddition(product, source); toast(`${product.name} added to your cart`); return true;
  }
  document.querySelector('#cart-content')?.addEventListener('click', event => {
    const button = event.target.closest('[data-line], [data-remove-line]');
    if (!button) return;
    const line = cart.find(item => item.lineId === (button.dataset.line || button.dataset.removeLine));
    if (!line) return;
    if (button.dataset.removeLine) cart = cart.filter(item => item !== line);
    else { line.quantity = Math.max(0, Math.min(99, line.quantity + Number(button.dataset.delta))); cart = cart.filter(item => item.quantity > 0); }
    saveCart();
  });
  const marketControl = document.querySelector('.market-control');
  const trigger = document.querySelector('#market-trigger');
  const menu = document.querySelector('#market-menu');
  const options = [...document.querySelectorAll('[data-market]')];
  function renderMarket() {
    const market = markets[country];
    document.querySelector('#market-flag').textContent = market.flag;
    document.querySelector('#market-code').textContent = market.currencyCode;
    trigger.setAttribute('aria-label', `Country and currency: ${market.name}, ${market.currencyCode}`);
    options.forEach(option => option.setAttribute('aria-checked', option.dataset.market === country ? 'true' : 'false'));
  }
  function closeMarket(returnFocus = false) {
    menu.toggleAttribute('hidden', true); trigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger.focus();
  }
  function openMarket(focusOption = false) {
    menu.toggleAttribute('hidden', false); trigger.setAttribute('aria-expanded', 'true');
    if (focusOption) options.find(option => option.dataset.market === country)?.focus();
  }
  trigger.addEventListener('click', () => menu.hasAttribute('hidden') ? openMarket() : closeMarket());
  trigger.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openMarket(true); }
  });
  options.forEach((option, index) => {
    option.addEventListener('click', () => {
      if (!markets[option.dataset.market]) return;
      country = option.dataset.market;
      write('saffron-market', country); write('saffron-currency', markets[country].currencyCode);
      renderMarket(); closeMarket(true);
      // Select the separately defined preview price table, never a live conversion.
      renderCart();
      subscriptions.forEach(callback => callback());
    });
    option.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length].focus();
      } else if (event.key === 'Escape') { event.preventDefault(); closeMarket(true); }
      else if (event.key === 'Tab') closeMarket();
    });
  });
  document.addEventListener('click', event => { if (!marketControl.contains(event.target)) closeMarket(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hasAttribute('hidden')) closeMarket(true); });
  renderMarket();
  document.querySelector('#open-cart')?.addEventListener('click', () => document.querySelector('#cart-dialog').showModal());
  document.querySelector('#close-cart')?.addEventListener('click', () => document.querySelector('#cart-dialog').close());
  document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.panel)?.showModal()));
  document.querySelectorAll('[data-close-panel]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(panel => panel.addEventListener('click', event => {
    if (event.target !== panel) return;
    const bounds = panel.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) panel.close();
  }));
  document.querySelectorAll('[data-social]').forEach(button => button.addEventListener('click', () => toast(`${button.dataset.social} profile link coming soon`)));
  const whatsappToggle = document.querySelector('#whatsapp-toggle');
  const whatsappPanel = document.querySelector('#whatsapp-panel');
  const whatsappWidget = document.querySelector('.whatsapp-widget');
  function closeWhatsapp(returnFocus = false) {
    if (!whatsappPanel) return;
    whatsappPanel.toggleAttribute('hidden', true);
    whatsappToggle.setAttribute('aria-expanded', 'false');
    whatsappToggle.setAttribute('aria-label', 'Open WhatsApp chat options');
    if (returnFocus) whatsappToggle.focus();
  }
  whatsappToggle?.addEventListener('click', () => {
    const open = whatsappPanel.hasAttribute('hidden');
    whatsappPanel.toggleAttribute('hidden', !open);
    whatsappToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    whatsappToggle.setAttribute('aria-label', open ? 'Close WhatsApp chat options' : 'Open WhatsApp chat options');
  });
  document.addEventListener('click', event => { if (whatsappWidget && !whatsappWidget.contains(event.target)) closeWhatsapp(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && whatsappPanel && !whatsappPanel.hasAttribute('hidden')) closeWhatsapp(true); });
  const header = document.querySelector('.header');
  let framePending = false;
  function updateHeader() {
    const footer = document.querySelector('.site-footer');
    if (!header || !footer) return;
    header.classList.toggle('header--scrolled', window.scrollY > 12);
    const top = header.getBoundingClientRect(), bottom = footer.getBoundingClientRect();
    header.classList.toggle('header--dark', bottom.top < top.bottom && bottom.bottom > top.top);
    const footerOverlap = Math.max(0, (window.innerHeight || 0) - bottom.top);
    if (whatsappWidget) whatsappWidget.style.setProperty('--whatsapp-footer-offset', `${Math.min(footerOverlap, bottom.height)}px`);
  }
  function queueHeader() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(() => { framePending = false; updateHeader(); });
  }
  function measureHeader() { if (header) document.documentElement.style.setProperty('--nav-height', `${header.getBoundingClientRect().height}px`); queueHeader(); }
  window.addEventListener('scroll', queueHeader, { passive: true }); window.addEventListener('resize', measureHeader);
  if (typeof ResizeObserver !== 'undefined' && header) new ResizeObserver(measureHeader).observe(header);
  window.SaffronStore = { get currency() { return markets[country].currencyCode; }, get market() { return { ...markets[country] }; }, get pricingCurrency() { return markets[country].currencyCode; }, price, money, fee, add, toast, escape, subscribe(callback) { subscriptions.add(callback); }, updateHeader };
  renderCart(); measureHeader();
})();

(() => {
 const toggle = document.querySelector('.nav-menu-toggle');
 const nav = toggle?.closest('nav');
 const close = () => {document.body.classList.remove('navigation-open');nav?.classList.remove('menu-open');toggle?.setAttribute('aria-expanded','false');toggle?.setAttribute('aria-label','Open navigation');};
 toggle?.addEventListener('click', () => {
  const open = !nav.classList.contains('menu-open');
  nav.classList.toggle('menu-open',open);
  document.body.classList.toggle('navigation-open',open);
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
 });
 document.addEventListener('click',event=>{if(nav && !nav.contains(event.target))close();});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){close();toggle?.focus();}
  if(event.key==='Tab' && nav?.classList.contains('menu-open')){
   const items=[...nav.querySelectorAll('a,button')].filter(item=>item.getClientRects().length && item.getAttribute('tabindex')!=='-1');
   const first=items[0],last=items[items.length-1];
   if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
  }
 });
 nav?.querySelector('#open-cart')?.addEventListener('click',close);
 window.addEventListener('resize',()=>{if(window.innerWidth>1050)close();});
})();

(() => {
 const pathname = window.location.pathname;
 document.querySelectorAll('.header .nav-panel').forEach(link => {
  const destination = link.getAttribute('href');
  const active = pathname.startsWith(destination) || (destination === '/catalogue/' && pathname.startsWith('/cakes/'));
  if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
 });
})();
