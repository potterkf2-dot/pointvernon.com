/* Progressive navigation: all links remain visible when JavaScript is off. */
(() => {
  const button = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('#primary-navigation');
  if (!button || !nav) return;
  button.hidden = false;
  document.documentElement.classList.add('nav-enhanced');
  function setOpen(open) {
    button.setAttribute('aria-expanded', String(open));
    button.querySelector('[data-menu-label]').textContent = open ? 'Close' : 'Menu';
    nav.classList.toggle('is-open', open);
  }
  const compactMenu = window.matchMedia('(max-width: 54rem)');
  compactMenu.addEventListener('change', event => {
    if (event.matches && nav.contains(document.activeElement)) setOpen(true);
    if (!event.matches && document.activeElement === button) nav.querySelector('a').focus();
  });
  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
})();


/* Keep long contents menus compact on small screens; links work without JS. */
(() => {
  document.querySelectorAll('.in-page-nav').forEach((nav, index) => {
    const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
    if (links.length < 3) return;
    const list = document.createElement('div');
    list.className = 'in-page-links';
    list.id = 'page-sections-' + index;
    links.forEach(link => list.appendChild(link));
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'in-page-toggle';
    toggle.textContent = 'On this page · ' + links.length + ' sections';
    toggle.setAttribute('aria-controls', list.id);
    toggle.setAttribute('aria-expanded', 'false');
    const setOpen = open => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.append(toggle, list);
    nav.classList.add('is-enhanced');
    const compactContents = window.matchMedia('(max-width: 63.99rem)');
    compactContents.addEventListener('change', event => {
      if (event.matches && list.contains(document.activeElement)) setOpen(true);
      if (!event.matches && document.activeElement === toggle) links[0].focus();
    });
    list.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || !window.matchMedia('(max-width: 63.99rem)').matches) return;
      setOpen(false);
      const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      if (target) {
        target.setAttribute('tabindex', '-1');
        target.focus({preventScroll: true});
      }
    });
    nav.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
  });
  const comparisons = Array.from(document.querySelectorAll('.table-wrap')).map(wrap => {
    const hint = document.createElement('p');
    hint.className = 'table-scroll-hint';
    hint.textContent = 'Scroll across to see all columns →';
    hint.hidden = true;
    wrap.before(hint);
    return {wrap, hint};
  });
  const updateHints = () => comparisons.forEach(({wrap, hint}) => {
    hint.hidden = wrap.scrollWidth <= wrap.clientWidth + 1;
  });
  updateHints();
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(updateHints);
    comparisons.forEach(({wrap}) => observer.observe(wrap));
  } else {
    window.addEventListener('resize', updateHints);
  }
})();
