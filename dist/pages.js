(() => {
  const toolbar = document.querySelector('.catalogue-toolbar');
  const filters = document.querySelector('.catalogue-filters');
  const countLabel = document.querySelector('#product-result-count');
  function fitCatalogueFilters() {
    if (!toolbar || !filters || !countLabel) return;
    const buttons = [...filters.querySelectorAll('button')];
    const required = buttons.reduce((sum, button) => sum + button.getBoundingClientRect().width, 0) + Math.max(0, buttons.length - 1) * (parseFloat(getComputedStyle(filters).columnGap) || 0);
    countLabel.toggleAttribute('hidden', false);
    const available = toolbar.getBoundingClientRect().width - countLabel.getBoundingClientRect().width - (parseFloat(getComputedStyle(toolbar).columnGap) || 0);
    countLabel.toggleAttribute('hidden', required > available);
  }
  if (toolbar && typeof ResizeObserver !== 'undefined') new ResizeObserver(fitCatalogueFilters).observe(toolbar);
  window.addEventListener('resize', fitCatalogueFilters);
  document.fonts?.ready.then(fitCatalogueFilters);
  const products = window.SaffronProducts;
  const store = window.SaffronStore;
  const productId = document.querySelector('[data-product-page]')?.dataset.productPage;
  const product = products.find(item => item.id === productId);
  const editId = new URLSearchParams(window.location.search || '').get('edit');
  const editLine = editId ? store.getCartLine(editId) : null;
  const editing = editLine?.productId === productId ? editLine : null;
  let messageType = editing?.messageType || 'none';
  let packagingTemplate = '';
  function updatePackagingNote() {
    const photo = document.querySelector('[data-packaging-no-note]');
    if (!photo) return;
    const hasNote = messageType !== 'none';
    photo.src = hasNote ? photo.dataset.packagingWithNote : photo.dataset.packagingNoNote;
    if (hasNote && packagingTemplate) {
      const message = document.querySelector('#purchase-message')?.value.trim() || 'Wishing you a Diwali filled with light, love, and sweetness!';
      const words = message.split(/\s+/), lines = [''];
      for (const word of words) {
        if (lines[lines.length - 1].length + word.length > 25) lines.push(word);
        else lines[lines.length - 1] += (lines[lines.length - 1] ? ' ' : '') + word;
      }
      const size = lines.length > 4 ? 42 : 58;
      const text = `<text id="diwali-note-text" text-anchor="middle" font-family="NoteScript,cursive" font-size="${size}" fill="#67432e">${lines.map((line,i)=>`<tspan x="0" y="${(i - (lines.length-1)/2) * (size+15)}">${store.escape(line)}</tspan>`).join('')}</text>`;
      const svg = packagingTemplate.replace(/<text id="diwali-note-text"[\s\S]*?<\/text>/, text);
      photo.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
    photo.alt = hasNote ? 'Diwali gift box with a handwritten note and wax-sealed envelope' : 'Diwali gift box with a saffron-orange sleeve, without a note or envelope';
  }
  updatePackagingNote();
  if (productId === 'diwali-box' && typeof fetch === 'function') fetch('/assets/catalogue/studio/diwali-box-four-closed.svg').then(response => response.ok ? response.text() : '').then(svg => { packagingTemplate = svg; updatePackagingNote(); }).catch(() => {});
  const egglessInput = document.querySelector('#make-eggless');
  if (egglessInput) egglessInput.checked = Boolean(editing?.eggless);
  const egglessMinor = () => egglessInput?.checked ? store.feeMinor('eggless') : 0;
  const quantityInput = document.querySelector('#product-quantity');
  const quantityHelp = document.querySelector('#quantity-message-help');
  const quantityError = document.querySelector('#quantity-error');
  const quantityErrorMessage = document.querySelector('#quantity-error-message');
  const minimumQuantity = Number(quantityInput?.getAttribute('min')) || 1;
  const selectedQuantity = () => quantityInput ? Math.max(minimumQuantity, Math.min(99, Math.floor(Number(quantityInput.value) || 1))) : 1;
  let displayedUnitMinor = null, priceNeedsReview = false, submitting = false;
  const builder = productId === 'diwali-box' ? window.SaffronFlavourPicker({
    root: document.querySelector('[data-flavour-builder]'), store, products, signature: product.defaultCups, initialSelection: editing?.cupSelection,
    onChange() { priceNeedsReview = false; document.querySelector('#selection-price-error').hidden = true; updatePrices(); }
  }) : null;
  function focusError(element) {
    if (!element) return;
    element.scrollIntoView?.({ block: 'center', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    element.focus({ preventScroll: true });
  }
  function validateQuantity() {
    if (!quantityInput) return true;
    const raw = quantityInput.value.trim();
    const value = Number(raw);
    const error = !raw ? 'Enter a quantity.' : !Number.isInteger(value) ? 'Enter a whole number.' : value < minimumQuantity ? (minimumQuantity === 4 ? 'Please order at least 4 cups of this flavour.' : 'Quantity must be at least 1.') : value > 99 ? 'Maximum quantity is 99.' : '';
    quantityInput.setCustomValidity(error);
    quantityInput.setAttribute('aria-invalid', error ? 'true' : 'false');
    quantityError?.toggleAttribute('hidden', !error);
    if (quantityErrorMessage) quantityErrorMessage.textContent = error;
    return !error;
  }
  document.querySelector('#contact-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const body = `${values.get('message')}\n\n${values.get('firstName')} ${values.get('lastName')}\nEmail: ${values.get('email')}\nPhone: ${values.get('phone') || 'Not provided'}`;
    window.location.href = `mailto:orders.saffroncrumbs@gmail.com?subject=${encodeURIComponent('Saffron & Crumbs enquiry')}&body=${encodeURIComponent(body)}`;
  });
  const textarea = document.querySelector('#purchase-message');
  if (editing) {
    quantityInput.value = String(editing.quantity); textarea.value = editing.message || '';
    const radio = document.querySelector(`[name="message-type"][value="${messageType}"]`); if (radio) radio.checked = true;
    document.querySelector('#message-entry').hidden = messageType === 'none'; textarea.required = messageType !== 'none';
    document.querySelector('.product-add-button').textContent = 'Save changes';
    document.querySelector('#message-character-count').textContent = `${textarea.value.length} / 180`;
  }
  function updatePrices(change = {}) {
    document.querySelectorAll('[data-price-product]').forEach(element => {
      const item = products.find(candidate => candidate.id === element.dataset.priceProduct);
      if (item) element.textContent = store.money(store.price(item));
    });
    document.querySelectorAll('[data-addon-fee]').forEach(element => { element.textContent = `+${store.moneyMinor(store.feeMinor(element.dataset.addonFee))}`; });
    document.querySelectorAll('[data-message-fee]').forEach(element => { element.textContent = `+${store.moneyMinor(store.feeMinor(element.dataset.messageFee))}`; });
    if (!product) return;
    builder?.refresh();
    const baseMinor = builder ? builder.priceMinor() : store.priceMinor(product);
    const nextUnit = baseMinor === null ? null : baseMinor + store.feeMinor(messageType) + egglessMinor();
    if (builder && change.reason === 'products' && displayedUnitMinor !== null && nextUnit !== displayedUnitMinor) {
      priceNeedsReview = true;
      const error = document.querySelector('#selection-price-error');
      error.textContent = 'The price has changed. Please review your updated total, then add to cart again.'; error.hidden = false;
    }
    if (change.reason === 'market') { priceNeedsReview = false; if (builder) document.querySelector('#selection-price-error').hidden = true; }
    displayedUnitMinor = nextUnit;
    document.querySelector('#selection-total').textContent = nextUnit === null ? 'Choose available flavours' : store.moneyMinor(nextUnit * selectedQuantity());
    if (builder) {
      const unit = document.querySelector('#box-unit-price');
      unit.textContent = baseMinor === null ? '' : `${store.moneyMinor(baseMinor)} per box`;
      unit.hidden = selectedQuantity() <= 1 || baseMinor === null;
      document.querySelector('#box-cup-quantity-help').hidden = selectedQuantity() <= 1;
    }
  }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    let count = 0;
    document.querySelectorAll('.catalogue-card').forEach(card => {
      const visible = button.dataset.filter === 'all' || card.dataset.category === button.dataset.filter;
      card.toggleAttribute('hidden', !visible); if (visible) count++;
    });
    document.querySelectorAll('[data-filter]').forEach(item => {
      item.classList.toggle('is-active', item === button); item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
    });
    document.querySelector('#product-result-count').textContent = `${count} ${count === 1 ? 'product' : 'products'}`;
  }));
  egglessInput?.addEventListener('change', () => updatePrices());
  if (product) {
    quantityInput?.addEventListener('input', () => {
      validateQuantity();
      quantityHelp.toggleAttribute('hidden', Number(quantityInput.value) <= 1);
      const quantity = selectedQuantity();
      document.querySelector('[data-quantity-step="-1"]').disabled = quantity <= minimumQuantity;
      document.querySelector('[data-quantity-step="1"]').disabled = quantity >= 99;
      updatePrices();
    });
    document.querySelectorAll('[data-quantity-step]').forEach(button => button.addEventListener('click', () => {
      quantityInput.value = String(Math.max(minimumQuantity, Math.min(99, selectedQuantity() + Number(button.dataset.quantityStep))));
      quantityInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    }));
    quantityInput?.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelectorAll('input[name="message-type"]').forEach(radio => radio.addEventListener('change', () => {
      messageType = radio.value;
      updatePackagingNote();
      const enabled = messageType !== 'none';
      document.querySelector('#message-entry').toggleAttribute('hidden', !enabled);
      textarea.required = enabled;
      if (!enabled) textarea.setCustomValidity('');
      if (productId !== 'diwali-box' && radio.value === 'calligraphy' && radio.checked) document.querySelector('[data-gallery-select="1"]')?.click();
      const packageSlide = document.querySelector('.product-gallery-carousel [data-gallery-slide="1"]');
      document.querySelector('#calligraphy-packaging-preview')?.toggleAttribute('hidden', messageType !== 'calligraphy' || packageSlide?.hasAttribute('hidden'));
      updatePrices();
    }));
    textarea.addEventListener('input', () => {
      updatePackagingNote();
      textarea.setCustomValidity('');
      document.querySelector('#message-character-count').textContent = `${textarea.value.length} / 180`;
      textarea.setAttribute('aria-invalid', 'false');
      const error = document.querySelector('#purchase-message-error'); if (error) error.hidden = true;
    });
    const orderForm = document.querySelector('#product-order-form');
    orderForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (submitting) return;
      const message = messageType === 'none' ? '' : textarea.value.trim();
      if (!builder) {
        if (quantityInput && !validateQuantity()) { focusError(quantityInput); return; }
        if (messageType !== 'none' && !message) { textarea.setCustomValidity('Please write your message.'); textarea.reportValidity(); return; }
        textarea.setCustomValidity('');
        if (editing) store.updateCartLine(editing.lineId, { quantity: selectedQuantity(), messageType, message, eggless: Boolean(egglessInput?.checked) });
        else store.add(product.id, messageType, message, event.submitter || orderForm.querySelector('[type="submit"]'), selectedQuantity(), { eggless: Boolean(egglessInput?.checked) }); return;
      }
      document.querySelector('#product-submit-error').hidden = true;
      const errors = [];
      if (!validateQuantity()) errors.push({ element: quantityInput });
      errors.push(...builder.validate());
      const messageError = document.querySelector('#purchase-message-error');
      const messageProblem = messageType !== 'none' && !message ? 'Please write your message.' : message.length > 180 ? 'Keep your message to 180 characters or fewer.' : '';
      messageError.textContent = messageProblem; messageError.hidden = !messageProblem;
      textarea.setAttribute('aria-invalid', messageProblem ? 'true' : 'false');
      if (messageProblem) errors.push({ element: textarea });
      const currentBase = builder.priceMinor(), currentUnit = currentBase === null ? null : currentBase + store.feeMinor(messageType) + egglessMinor();
      if (currentUnit !== displayedUnitMinor) updatePrices({ reason: 'products' });
      if (priceNeedsReview) {
        const priceError = document.querySelector('#selection-price-error');
        priceError.textContent = 'The price has changed. Please review your updated total, then add to cart again.'; priceError.hidden = false; priceError.setAttribute('tabindex','-1');
        errors.push({ element: priceError }); priceNeedsReview = false;
      } else document.querySelector('#selection-price-error').hidden = true;
      if (errors.length) { focusError(errors[0].element); return; }
      const button = orderForm.querySelector('[type="submit"]');
      submitting = true; orderForm.setAttribute('aria-busy','true'); button.setAttribute('aria-busy','true'); button.textContent = 'Adding…';
      try {
        const configuration = { cupSelection: builder.selection, expectedUnitMinor: currentUnit, quantity: selectedQuantity(), messageType, message, eggless: Boolean(egglessInput?.checked) };
        const added = await (editing ? store.updateCartLine(editing.lineId, configuration) : store.add(product.id, messageType, message, event.submitter || button, selectedQuantity(), configuration));
        if (!added) throw new Error('Please review your selected flavours and try again.');
      } catch (error) {
        if (error.code === 'PRICE_CHANGED') { updatePrices({ reason: 'products' }); focusError(document.querySelector('#selection-price-error')); }
        else {
          const feedback = document.querySelector('#product-submit-error');
          feedback.querySelector('p').textContent = 'We couldn’t add your box to the cart. Your selections are saved here—please try again.';
          feedback.hidden = false; feedback.setAttribute('tabindex','-1'); focusError(feedback);
        }
      } finally {
        submitting = false; orderForm.setAttribute('aria-busy','false'); button.removeAttribute('aria-busy'); button.textContent = editing ? 'Save changes' : 'Add to cart';
      }
    });
    document.querySelector('[data-retry-add]')?.addEventListener('click', () => orderForm.requestSubmit());
  }
  store.subscribe(updatePrices); updatePrices();
})();

(() => {
 const gallery=document.querySelector('.product-gallery-carousel');
 if(!gallery)return;
 const slides=[...gallery.querySelectorAll('[data-gallery-slide]')];
 let index=0;
 function show(value){
  index=(value+slides.length)%slides.length;
  slides.forEach((slide,i)=>slide.toggleAttribute('hidden',i!==index));
  gallery.querySelectorAll('[data-gallery-select]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.gallerySelect)===index)));
  gallery.querySelector('#product-gallery-status').textContent=`Photo ${index+1} of ${slides.length}: ${slides[index].dataset.galleryTitle || (index?'Gift packaging':'Open box')}`;
  gallery.querySelector('#calligraphy-packaging-preview')?.toggleAttribute('hidden',index!==1||!document.querySelector('[name="message-type"][value="calligraphy"]')?.checked);
 }
 gallery.querySelectorAll('[data-gallery-step]').forEach(button=>button.addEventListener('click',()=>show(index+Number(button.dataset.galleryStep))));
 gallery.querySelectorAll('[data-gallery-select]').forEach(button=>button.addEventListener('click',()=>show(Number(button.dataset.gallerySelect))));
 gallery.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();show(index+(event.key==='ArrowRight'?1:-1));}});
 let startX=null;
 gallery.addEventListener('touchstart',event=>{startX=event.touches[0].clientX;},{passive:true});
 gallery.addEventListener('touchend',event=>{if(startX!==null){const distance=event.changedTouches[0].clientX-startX;if(Math.abs(distance)>50)show(index+(distance<0?1:-1));}startX=null;},{passive:true});
})();
