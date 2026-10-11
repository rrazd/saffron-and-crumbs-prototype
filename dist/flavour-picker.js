(() => {
  let activePicker = null, sequence = 0;
  const available = cup => Boolean(cup && !cup.hidden && cup.available !== false && cup.availableForSale !== false);
  window.SaffronFlavourPicker = function createFlavourPicker({ root, store, products, signature, initialSelection, onChange }) {
    if (!root) return null;
    const selection = Array.isArray(initialSelection) && initialSelection.length === 4 ? [...initialSelection] : [...signature];
    const triggers = [...root.querySelectorAll('[data-flavour-slot]')];
    const id = `flavour-picker-${++sequence}`;
    const picker = document.createElement('div');
    picker.id = id; picker.className = 'flavour-picker'; picker.hidden = true;
    picker.tabIndex = -1;
    picker.innerHTML = `<div class="flavour-picker-heading"><h2 id="${id}-heading">Choose a flavour</h2><button type="button" class="flavour-picker-close" aria-label="Close flavour picker">×</button></div><div class="flavour-picker-list" role="listbox" aria-label="Cake cup flavours"></div>`;
    const backdrop = document.createElement('div');
    backdrop.className = 'flavour-picker-backdrop'; backdrop.hidden = true;
    document.body.append(backdrop, picker);
    const list = picker.querySelector('.flavour-picker-list');
    const closeButton = picker.querySelector('.flavour-picker-close');
    let current = null, sheet = false, previousOverflow = '', inertElements = [], optionButtons = [];
    const cup = value => products.find(item => item.id === value && item.category === 'Cake cups');
    const name = item => item?.name.replace(/ cup$/i, '') || 'Select a flavour';
    const choices = () => products.filter(item => item.category === 'Cake cups' && !item.hidden);
    const canChoose = item => available(item) && store.priceMinor(item) !== null;
    const priceLabel = item => store.priceMinor(item) === null ? 'Price unavailable' : store.moneyMinor(store.priceMinor(item));
    function setError(index, message) {
      const error = root.querySelector(`#cup-error-${index}`);
      error.textContent = message; error.hidden = !message;
      triggers[index].setAttribute('aria-invalid', message ? 'true' : 'false');
    }
    function render() {
      triggers.forEach((trigger, index) => {
        const item = cup(selection[index]);
        trigger.querySelector('[data-selected-name]').textContent = name(item);
        trigger.querySelector('[data-selected-price]').textContent = item ? priceLabel(item) : 'Select a flavour';
        const image = trigger.querySelector('[data-selected-thumbnail]');
        if (item?.catalogueImage) { image.src = '/' + item.catalogueImage; image.hidden = false; } else { image.removeAttribute('src'); image.hidden = true; }
        trigger.setAttribute('aria-label', `Cup ${index + 1}, ${name(item)}, change flavour`);
        trigger.setAttribute('aria-controls', `${id}-list`);
      });
      const properties = store.boxProperties(selection);
      root.querySelector('#box-flavours-property').value = properties['Box flavours'] || '';
      root.querySelector('#box-cup-ids-property').value = properties._cup_ids || '';
      const reset = root.querySelector('[data-reset-signature]');
      reset.disabled = selection.every((value, index) => value === signature[index]);
      reset.hidden = reset.disabled;
    }
    function renderOptions() {
      list.id = `${id}-list`;
      list.innerHTML = choices().map(item => {
        const selected = item.id === selection[current], enabled = canChoose(item);
        return `<button type="button" class="flavour-option" role="option" tabindex="-1" data-flavour-id="${store.escape(item.id)}" aria-selected="${selected}"${enabled ? '' : ' disabled aria-disabled="true"'}><span class="flavour-option-copy"><strong>${store.escape(name(item))}</strong><span class="flavour-option-description">${store.escape(item.description || '')}</span><span class="flavour-option-price">${enabled ? store.escape(priceLabel(item)) : 'Currently unavailable'}</span></span><span class="flavour-option-check" aria-hidden="true">${selected ? '✓' : ''}</span><img src="/${store.escape(item.catalogueImage)}" alt="" width="52" height="52"></button>`;
      }).join('');
      optionButtons = [...list.querySelectorAll('[role="option"]')];
      optionButtons.forEach(button => button.addEventListener('click', () => {
        const item = cup(button.dataset.flavourId);
        if (!canChoose(item)) { setError(current, 'This flavour is currently unavailable. Please choose another.'); refresh(); return; }
        const index = current;
        selection[index] = item.id; setError(index, ''); render(); close();
        root.querySelector('[data-flavour-announcement]').textContent = `Cup ${index + 1} changed to ${name(item)}.`;
        onChange?.([...selection]);
      }));
    }
    function unlockBackground() {
      if (!inertElements.length) return;
      inertElements.forEach(([element, wasInert]) => element.toggleAttribute('inert', wasInert));
      inertElements = []; document.body.style.overflow = previousOverflow;
    }
    function lockBackground() {
      if (inertElements.length) return;
      previousOverflow = document.body.style.overflow;
      inertElements = [...document.body.children].filter(element => element !== picker && element !== backdrop).map(element => [element, element.hasAttribute('inert')]);
      inertElements.forEach(([element]) => element.setAttribute('inert', ''));
      document.body.style.overflow = 'hidden';
    }
    function position() {
      if (current === null) return;
      const viewport = window.visualViewport;
      const width = viewport?.width || window.innerWidth || 1200;
      const height = viewport?.height || window.innerHeight || 800;
      const columnWidth = root.getBoundingClientRect().width;
      sheet = width < 650 || columnWidth > 0 && columnWidth < 430;
      picker.classList.toggle('is-sheet', sheet); backdrop.hidden = !sheet;
      triggers[current].setAttribute('aria-haspopup', sheet ? 'dialog' : 'listbox');
      if (sheet) {
        picker.setAttribute('role', 'dialog'); picker.setAttribute('aria-modal', 'true'); picker.setAttribute('aria-labelledby', `${id}-heading`);
        picker.style.removeProperty('left'); picker.style.removeProperty('top'); picker.style.removeProperty('width');
        picker.style.maxHeight = `${Math.max(180, height - 24)}px`;
        picker.style.bottom = `${Math.max(0, (window.innerHeight || height) - height - (viewport?.offsetTop || 0))}px`;
        lockBackground();
      } else {
        picker.removeAttribute('role'); picker.removeAttribute('aria-modal'); picker.removeAttribute('aria-labelledby');
        unlockBackground(); picker.style.removeProperty('bottom');
        const rect = triggers[current].getBoundingClientRect();
        const anchorTop = Math.max(12, Math.min(rect.top, height - 44));
        const anchorBottom = Math.max(44, Math.min(rect.bottom, height - 12));
        const panelWidth = Math.min(400, width - 24), below = height - anchorBottom - 20, above = anchorTop - 20;
        const down = below >= Math.min(300, above);
        const panelHeight = Math.min(height - 24, Math.max(88, Math.min(420, down ? below : above)));
        picker.style.width = `${panelWidth}px`; picker.style.maxHeight = `${panelHeight}px`;
        picker.style.left = `${Math.max(12, Math.min(rect.left, width - panelWidth - 12))}px`;
        picker.style.top = `${Math.max(12, Math.min(height - panelHeight - 12, down ? anchorBottom + 8 : anchorTop - panelHeight - 8))}px`;
      }
    }
    function close(returnFocus = true) {
      if (current === null) return;
      const previous = current; current = null;
      picker.hidden = true; backdrop.hidden = true; unlockBackground();
      triggers.forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
      window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position); window.visualViewport?.removeEventListener('scroll', position);
      if (activePicker === close) activePicker = null;
      if (returnFocus) triggers[previous].focus();
    }
    function open(index) {
      if (current === index) { close(); return; }
      if (activePicker) activePicker(false);
      current = index; activePicker = close;
      renderOptions(); picker.hidden = false; triggers[index].setAttribute('aria-expanded', 'true'); position();
      window.addEventListener('resize', position); window.addEventListener('scroll', position, true);
      window.visualViewport?.addEventListener('resize', position); window.visualViewport?.addEventListener('scroll', position);
      const selected = optionButtons.find(button => button.getAttribute('aria-selected') === 'true' && !button.disabled) || optionButtons.find(button => !button.disabled);
      (selected || (sheet ? closeButton : picker)).focus();
      if (!sheet) selected?.scrollIntoView?.({ block: 'nearest' });
    }
    function refresh() {
      const focusedId = document.activeElement?.dataset?.flavourId;
      render();
      triggers.forEach((_, index) => { if (root.querySelector(`#cup-error-${index}`).textContent && canChoose(cup(selection[index]))) setError(index, ''); });
      if (current !== null) { renderOptions(); position(); if (focusedId) (optionButtons.find(button => button.dataset.flavourId === focusedId && !button.disabled) || optionButtons.find(button => !button.disabled) || picker).focus(); }
    }
    triggers.forEach((trigger, index) => {
      trigger.addEventListener('click', () => open(index));
      trigger.addEventListener('keydown', event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(index); } });
    });
    picker.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
      const enabled = optionButtons.filter(button => !button.disabled);
      const index = enabled.indexOf(document.activeElement);
      let next = null;
      if (event.key === 'ArrowDown') next = enabled[(index + 1) % enabled.length];
      if (event.key === 'ArrowUp') next = enabled[(index - 1 + enabled.length) % enabled.length];
      if (event.key === 'Home') next = enabled[0]; if (event.key === 'End') next = enabled.at(-1);
      if (next) { event.preventDefault(); next.focus(); next.scrollIntoView?.({ block: 'nearest' }); }
      if (event.key === 'Tab') {
        if (!sheet) {
          event.preventDefault(); const trigger = triggers[current]; close(false);
          const focusable = [...document.querySelectorAll('a[href],button,input:not([type="hidden"]),textarea,select,[tabindex]')].filter(element => !element.disabled && element.getAttribute('tabindex') !== '-1' && !element.closest('[hidden],[inert]') && (!element.getClientRects || element.getClientRects().length));
          const index = focusable.indexOf(trigger); (focusable[index + (event.shiftKey ? -1 : 1)] || trigger).focus(); return;
        }
        const focusable = [closeButton, ...enabled]; const currentIndex = focusable.indexOf(document.activeElement);
        if (event.shiftKey && currentIndex <= 0) { event.preventDefault(); focusable.at(-1)?.focus(); }
        else if (!event.shiftKey && currentIndex === focusable.length - 1) { event.preventDefault(); closeButton.focus(); }
      }
    });
    closeButton.addEventListener('click', () => close()); backdrop.addEventListener('click', () => close());
    document.addEventListener('pointerdown', event => { if (current !== null && !picker.contains(event.target) && !triggers[current].contains(event.target)) close(false); });
    root.querySelector('[data-reset-signature]').addEventListener('click', () => {
      close(false); selection.splice(0, 4, ...signature); triggers.forEach((_, index) => setError(index, '')); render();
      root.querySelector('[data-flavour-announcement]').textContent = 'Signature assortment restored.'; onChange?.([...selection]);
    });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(position).observe(root);
    render();
    return {
      get selection() { return [...selection]; }, refresh, close,
      priceMinor() { const values = selection.map(value => store.priceMinor(cup(value))); return values.some(value => value === null) ? null : values.reduce((sum, value) => sum + value, 0); },
      validate() {
        return triggers.flatMap((element, index) => {
          const item = cup(selection[index]);
          const message = !item ? `Please select a flavour for Cup ${index + 1}.` : !canChoose(item) ? 'This flavour is currently unavailable. Please choose another.' : '';
          setError(index, message); return message ? [{ element, message }] : [];
        });
      }
    };
  };
})();
