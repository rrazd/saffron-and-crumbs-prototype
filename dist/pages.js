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
  let messageType = 'none';
  document.querySelector('#contact-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const body = `${values.get('message')}\n\n${values.get('firstName')} ${values.get('lastName')}\nEmail: ${values.get('email')}\nPhone: ${values.get('phone') || 'Not provided'}`;
    window.location.href = `mailto:hello@saffronandcrumbs.com?subject=${encodeURIComponent('Saffron & Crumbs enquiry')}&body=${encodeURIComponent(body)}`;
  });
  const textarea = document.querySelector('#purchase-message');
  function updatePrices() {
    document.querySelectorAll('[data-price-product]').forEach(element => {
      const item = products.find(candidate => candidate.id === element.dataset.priceProduct);
      if (item) element.textContent = store.money(store.price(item));
    });
    document.querySelectorAll('[data-message-fee]').forEach(element => { element.textContent = `+${store.money(store.fee(element.dataset.messageFee))}`; });
    if (product) document.querySelector('#selection-total').textContent = store.money(store.price(product) + store.fee(messageType));
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
  if (product) {
    document.querySelectorAll('input[name="message-type"]').forEach(radio => radio.addEventListener('change', () => {
      messageType = radio.value;
      const enabled = messageType !== 'none';
      document.querySelector('#message-entry').toggleAttribute('hidden', !enabled);
      textarea.required = enabled;
      if (!enabled) textarea.setCustomValidity('');
      updatePrices();
    }));
    textarea.addEventListener('input', () => {
      textarea.setCustomValidity('');
      document.querySelector('#message-character-count').textContent = `${textarea.value.length} / 180`;
    });
    document.querySelector('#product-order-form').addEventListener('submit', event => {
      event.preventDefault();
      const message = messageType === 'none' ? '' : textarea.value.trim();
      if (messageType !== 'none' && !message) { textarea.setCustomValidity('Please write your message.'); textarea.reportValidity(); return; }
      textarea.setCustomValidity('');
      store.add(product.id, messageType, message, event.submitter || event.currentTarget.querySelector('[type="submit"]'));
    });
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
  gallery.querySelector('#product-gallery-status').textContent=`Photo ${index+1} of ${slides.length}: ${index?'Gift packaging':'Open box'}`;
 }
 gallery.querySelectorAll('[data-gallery-step]').forEach(button=>button.addEventListener('click',()=>show(index+Number(button.dataset.galleryStep))));
 gallery.querySelectorAll('[data-gallery-select]').forEach(button=>button.addEventListener('click',()=>show(Number(button.dataset.gallerySelect))));
 gallery.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();show(index+(event.key==='ArrowRight'?1:-1));}});
 let startX=null;
 gallery.addEventListener('touchstart',event=>{startX=event.touches[0].clientX;},{passive:true});
 gallery.addEventListener('touchend',event=>{if(startX!==null){const distance=event.changedTouches[0].clientX-startX;if(Math.abs(distance)>50)show(index+(distance<0?1:-1));}startX=null;},{passive:true});
})();
