(() => {
  const products = window.SaffronProducts;
  const knownProduct = id => products.find(product => product.id === id);
  const validCup = id => knownProduct(id)?.category === 'Cake cups' && !knownProduct(id)?.hidden;
  const defaultBoxCups = () => [...(knownProduct('diwali-box')?.defaultCups || ['boondi-cup', 'gulab-jamun-cup', 'mango-cup', 'rasmalai-cup'])].sort();
  const normalizedCups = selection => selection === undefined ? defaultBoxCups() : Array.isArray(selection) && selection.length === 4 && selection.every(id => typeof id === 'string') ? [...selection] : [];
  const availableCup = id => validCup(id) && knownProduct(id).available !== false && knownProduct(id).availableForSale !== false;
  const cupKey = selection => JSON.stringify([...selection].sort());
  function boxProperties(selection) {
    if (!Array.isArray(selection) || selection.length !== 4 || !selection.every(validCup)) return {};
    const sorted = [...selection].sort(), counts = sorted.reduce((all, id) => { all[id] = (all[id] || 0) + 1; return all; }, {});
    return { 'Box flavours': Object.entries(counts).map(([id, count]) => `${knownProduct(id).name.replace(/ cup$/i, '')} × ${count}`).join(', '), _cup_ids: JSON.stringify(sorted) };
  }
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };
  const markets = {
    CA: { countryCode: 'CA', currencyCode: 'CAD', name: 'Canada', flag: '/assets/flag-ca.svg' },
    US: { countryCode: 'US', currencyCode: 'USD', name: 'United States', flag: '/assets/flag-us.svg' }
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
        message: typeof line.message === 'string' ? line.message.slice(0, 180) : '', eggless: Boolean(line.eggless),
        ...(line.productId === 'diwali-box' ? { cupSelection: normalizedCups(line.cupSelection), properties: boxProperties(normalizedCups(line.cupSelection)) } : {})
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
  // CAD is authoritative; convert each charge once to integer USD cents.
  const convertMinor = cadMinor => country === 'US' ? Math.round(cadMinor / window.SaffronExchangeRates.cadPerUsd) : cadMinor;
  const feeMinor = type => convertMinor(window.SaffronOrderOptions?.[type]?.priceMinor?.CAD || 0);
  const fee = type => feeMinor(type) / 100;
  const cupPriceMinor = product => {
    const value = product?.price?.CAD;
    const amount = value === undefined || value === null ? NaN : Number(value);
    const minor = convertMinor(Math.round(amount * 100));
    return Number.isSafeInteger(minor) && minor >= 0 ? minor : null;
  };
  const boxPriceMinor = selection => {
    if (!Array.isArray(selection) || selection.length !== 4) return null;
    const amounts = selection.map(id => validCup(id) ? cupPriceMinor(knownProduct(id)) : null);
    return amounts.some(value => value === null) ? null : amounts.reduce((sum, value) => sum + value, 0);
  };
  const priceMinor = product => product?.id === 'diwali-box' ? boxPriceMinor(product.defaultCups || defaultBoxCups()) : cupPriceMinor(product);
  const price = product => { const value = priceMinor(product); return value === null ? NaN : value / 100; };
  const money = value => Number.isFinite(value) ? `${markets[country].currencyCode === 'CAD' ? 'CA$' : 'US$'}${new Intl.NumberFormat('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}` : 'Unavailable';
  const moneyMinor = value => value === null ? 'Unavailable' : money(value / 100);
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
    const drawerCount = document.querySelector('#cart-item-total'); if (drawerCount) drawerCount.textContent = `(${quantity})`;
    const checkout = document.querySelector('#cart-checkout'); if (checkout) checkout.disabled = quantity === 0;
    const checkoutStatus = document.querySelector('#cart-checkout-status'); if (checkoutStatus) checkoutStatus.hidden = true;
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
      element.innerHTML = '<p>Your bag is empty.</p><a class="button secondary" href="/catalogue/">Explore the catalogue</a>';
      const footerTotal = document.querySelector('#cart-subtotal'); if (footerTotal) footerTotal.textContent = moneyMinor(0);
      return;
    }
    let subtotal = 0, incomplete = false;
    element.innerHTML = cart.map(line => {
      const product = knownProduct(line.productId), base = product.id === 'diwali-box' ? boxPriceMinor(normalizedCups(line.cupSelection)) : priceMinor(product);
      const unit = base === null ? null : base + feeMinor(line.messageType) + (line.eggless ? feeMinor('eggless') : 0);
      if (unit === null) incomplete = true; else subtotal += unit * line.quantity;
      const message = line.messageType !== 'none' ? `<span class="cart-extra-tag">+ ${line.messageType === 'printed' ? 'Printed message' : 'Handwritten calligraphy'}</span>` : '';
      const link = product.hidden ? escape(product.name) : `<a class="cart-product-link" href="/cakes/${product.id}/?edit=${encodeURIComponent(line.lineId)}">${escape(product.name)}</a>`;
      const counts = product.id === 'diwali-box' ? normalizedCups(line.cupSelection).reduce((all, id) => { all[id] = (all[id] || 0) + 1; return all; }, {}) : null;
      const cups = counts ? `<p class="cart-cup-selection" aria-label="Cups in each box">${Object.entries(counts).map(([id, count])=>`<span class="cart-flavour-token">${escape(knownProduct(id)?.name.replace(/ cup$/i,'') || 'Unavailable flavour')} × ${count}</span>`).join(', ')}</p>` : '';
      const thumbnail = product.catalogueImage ? `<a class="cart-item-image" href="/cakes/${product.id}/" tabindex="-1" aria-hidden="true"><img src="/${escape(product.catalogueImage)}" alt="" width="96" height="96"></a>` : '';
      return `<article class="cart-row" data-cart-line="${escape(line.lineId)}">${thumbnail}<div class="cart-item-details"><div class="cart-row-title"><strong>${link}</strong><span>${moneyMinor(unit === null ? null : unit * line.quantity)}<small class="cart-item-quantity">Qty ${line.quantity}</small></span></div>${cups}${message || line.eggless ? `<div class="cart-item-extras">${message}${line.eggless ? '<span class="cart-extra-tag">+ Eggless</span>' : ''}</div>` : ''}<div class="cart-row-actions"><button class="remove-line" type="button" data-remove-line="${escape(line.lineId)}">Remove</button></div></div></article>`;
    }).join('');
    const footerTotal = document.querySelector('#cart-subtotal');
    if (footerTotal) footerTotal.textContent = incomplete ? 'Review unavailable items' : moneyMinor(subtotal);
    else element.innerHTML += `<div class="cart-subtotal"><strong>Subtotal</strong><strong>${incomplete ? 'Review unavailable items' : moneyMinor(subtotal)}</strong></div>`;
  }
  function saveCart() { const saved = write('saffron-cart-v3', JSON.stringify(cart)); renderCart(); return saved; }
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
  function add(id, messageType = 'none', message = '', source = null, quantity = 1, options = {}) {
    const product = knownProduct(id);
    if (!product) return false;
    if (product.category === 'Cake cups' && (!Number.isInteger(Number(quantity)) || Number(quantity) < 4)) return false;
    if (!['none', 'printed', 'calligraphy'].includes(messageType)) return false;
    quantity = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
    message = messageType === 'none' ? '' : String(message).trim().slice(0, 180);
    if (messageType !== 'none' && !message) return false;
    if (id === 'diwali-box' && options.cupSelection !== undefined && (!Array.isArray(options.cupSelection) || options.cupSelection.length !== 4 || !options.cupSelection.every(availableCup))) return false;
    const cupSelection = id === 'diwali-box' ? normalizedCups(options.cupSelection) : [];
    if (id === 'diwali-box' && !cupSelection.every(availableCup)) return false;
    const unitMinor = (id === 'diwali-box' ? boxPriceMinor(cupSelection) : priceMinor(product));
    if (unitMinor === null) return false;
    if (options.expectedUnitMinor !== undefined && options.expectedUnitMinor !== unitMinor + feeMinor(messageType) + (options.eggless ? feeMinor('eggless') : 0)) { const error = new Error('The price has changed.'); error.code = 'PRICE_CHANGED'; throw error; }
    const eggless = Boolean(options.eggless);
    const previousCart = cart.map(line => ({ ...line }));
    const existing = cart.find(line => line.productId === id && line.messageType === messageType && line.message === message && Boolean(line.eggless) === eggless && (id !== 'diwali-box' || cupKey(normalizedCups(line.cupSelection)) === cupKey(cupSelection)));
    if (existing) existing.quantity = Math.min(99, existing.quantity + quantity);
    else cart.push({ lineId: `line-${Date.now()}-${lineCounter++}`, productId: id, quantity, messageType, message, eggless, ...(id === 'diwali-box' ? { cupSelection, properties: boxProperties(cupSelection) } : {}) });
    if (!saveCart()) { cart = previousCart; renderCart(); throw new Error('Your cart could not be saved. Please try again.'); }
    animateCartAddition(product, source); toast(`${product.name} added to your cart`); return true;
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
    document.querySelector('#market-flag').src = market.flag;
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
      subscriptions.forEach(callback => callback({ reason: 'market' }));
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
  const cartDialog = document.querySelector('#cart-dialog');
  let cartPreviousOverflow = '', cartClosing = false;
  const reducedCartMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function closeCart() {
    if (!cartDialog?.hasAttribute('open') || cartClosing) return;
    if (!cartDialog.animate || reducedCartMotion()) { cartDialog.close(); return; }
    cartClosing = true; cartDialog.classList.add('is-closing');
    const animation = cartDialog.animate([{transform:'translateX(0)'},{transform:'translateX(100%)'}], {duration:180,easing:'cubic-bezier(.4,0,1,1)'});
    const finish = () => { cartDialog.close(); cartDialog.classList.remove('is-closing'); cartClosing = false; };
    animation.onfinish = finish; animation.oncancel = finish;
  }
  document.querySelector('#open-cart')?.addEventListener('click', () => {
    if (cartDialog.hasAttribute('open')) return;
    cartPreviousOverflow = document.body.style.overflow; cartDialog.showModal(); document.body.style.overflow = 'hidden';
    if (cartDialog.animate && !reducedCartMotion()) cartDialog.animate([{transform:'translateX(100%)'},{transform:'translateX(0)'}], {duration:240,easing:'cubic-bezier(.2,.8,.2,1)'});
  });
  document.querySelector('#close-cart')?.addEventListener('click', closeCart);
  cartDialog?.addEventListener('cancel', event => { event.preventDefault(); closeCart(); });
  cartDialog?.addEventListener('close', () => { document.body.style.overflow = cartPreviousOverflow; });
  cartDialog?.addEventListener('keydown', event => { if (event.key === 'Escape') event.stopPropagation(); });
  document.querySelector('#cart-checkout')?.addEventListener('click', () => { const status = document.querySelector('#cart-checkout-status'); status.textContent = 'Online checkout is not connected yet. Your selections are saved in your bag.'; status.hidden = false; });
  document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.panel)?.showModal()));
  document.querySelectorAll('[data-close-panel]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(panel => panel.addEventListener('click', event => {
    if (event.target !== panel) return;
    const bounds = panel.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) { if (panel === cartDialog) closeCart(); else panel.close(); }
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
  function toShopifyCartItem(lineId, variantId) {
    const line = cart.find(item => item.lineId === lineId);
    if (!line) throw new Error('Cart line not found.');
    if (line.productId === 'diwali-box') throw new Error('A fixed-price box variant cannot charge for selected flavours. Use the individually priced component adapter.');
    if (line.eggless || feeMinor(line.messageType) > 0) throw new Error('Priced add-ons require real Shopify add-on variants.');
    if (!Number.isSafeInteger(variantId) || variantId <= 0) throw new Error('A Shopify variant ID is required.');
    const properties = {};
    if (line.messageType !== 'none') { properties.Note = line.message; properties['Note style'] = line.messageType === 'calligraphy' ? 'Handwritten calligraphy' : 'Printed message'; }
    return { id: variantId, quantity: line.quantity, properties };
  }
  function toShopifyCartItems(lineId, config) {
    const line = cart.find(item => item.lineId === lineId);
    if (!line || line.productId !== 'diwali-box') throw new Error('A configured Diwali box cart line is required.');
    const selected = normalizedCups(line.cupSelection);
    if (selected.length !== 4 || !selected.every(availableCup)) throw new Error('Replace unavailable flavours before checkout.');
    const properties = { ...boxProperties(selected), ...(line.eggless ? { Eggless: 'Yes' } : {}), 'Gift box': 'Diwali cake cup box', 'Boxes': String(line.quantity), _box_group: line.lineId };
    const counts = selected.reduce((all,id) => { all[id] = (all[id] || 0) + 1; return all; }, {});
    const item = (mapping, quantity, expected, details) => {
      if (!mapping || !Number.isSafeInteger(mapping.variantId) || mapping.variantId <= 0) throw new Error('Live Shopify cup variants have not been configured.');
      if (mapping.available === false) throw new Error('A selected Shopify variant is unavailable.');
      if (mapping.currency !== markets[country].currencyCode || mapping.unitPriceMinor !== expected) throw new Error('Refresh Shopify market prices before checkout.');
      return { id: mapping.variantId, quantity, properties: { ...properties, ...details } };
    };
    const items = Object.entries(counts).map(([id,count]) => item(config?.variants?.[id], count * line.quantity, cupPriceMinor(knownProduct(id)), { 'Cup flavour': knownProduct(id).name.replace(/ cup$/i,'') }));
    if (line.messageType !== 'none') {
      const details = { Note: line.message, 'Note style': line.messageType === 'calligraphy' ? 'Handwritten calligraphy' : 'Printed message' };
      items.forEach(component => Object.assign(component.properties, details));
      if (feeMinor(line.messageType) > 0) items.push(item(config?.addons?.[line.messageType], line.quantity, feeMinor(line.messageType), details));
    }
    if (line.eggless) items.push(item(config?.addons?.eggless, line.quantity, feeMinor('eggless'), { Eggless: 'Yes' }));
    // Shopify charges its real variant prices. No price override is sent here.
    return { items };
  }
  function getCartLine(lineId) {
    const line = cart.find(item => item.lineId === lineId);
    return line ? { ...line, ...(line.cupSelection ? { cupSelection: [...line.cupSelection], properties: { ...line.properties } } : {}) } : null;
  }
  function updateCartLine(lineId, options) {
    const index = cart.findIndex(item => item.lineId === lineId);
    if (index < 0) throw new Error('This cart item no longer exists. Please add it as a new item.');
    const line = cart[index];
    const isBox = line.productId === 'diwali-box';
    if (isBox && (!Array.isArray(options.cupSelection) || options.cupSelection.length !== 4 || !options.cupSelection.every(availableCup))) return false;
    const quantity = Number(options.quantity);
    if (!Number.isInteger(quantity) || quantity < (knownProduct(line.productId)?.category === 'Cake cups' ? 4 : 1) || quantity > 99) return false;
    const messageType = options.messageType || 'none', message = messageType === 'none' ? '' : String(options.message || '').trim().slice(0,180);
    if (!['none','printed','calligraphy'].includes(messageType) || messageType !== 'none' && !message) return false;
    const base = isBox ? boxPriceMinor(options.cupSelection) : priceMinor(knownProduct(line.productId));
    if (base === null) return false;
    if (options.expectedUnitMinor !== undefined && options.expectedUnitMinor !== base + feeMinor(messageType) + (options.eggless ? feeMinor('eggless') : 0)) { const error = new Error('The price has changed.'); error.code = 'PRICE_CHANGED'; throw error; }
    cart[index] = { ...line, quantity, messageType, message, eggless: Boolean(options.eggless), ...(isBox ? { cupSelection: [...options.cupSelection], properties: boxProperties(options.cupSelection) } : {}) };
    if (!saveCart()) { cart[index] = line; renderCart(); throw new Error('Your changes could not be saved. Please try again.'); }
    toast('Your box has been updated'); return true;
  }
  function updateProducts(nextProducts) {
    if (!Array.isArray(nextProducts)) throw new Error('Product data must be an array.');
    const snapshot = [...nextProducts]; products.splice(0, products.length, ...snapshot);
    renderCart(); subscriptions.forEach(callback => callback({ reason: 'products' }));
  }
  window.SaffronStore = { get currency() { return markets[country].currencyCode; }, get market() { return { ...markets[country] }; }, get pricingCurrency() { return markets[country].currencyCode; }, price, priceMinor, boxPriceMinor, money, moneyMinor, fee, feeMinor, add, toast, escape, boxProperties, toShopifyCartItem, toShopifyCartItems, getCartLine, updateCartLine, updateProducts, subscribe(callback) { subscriptions.add(callback); }, updateHeader };
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
