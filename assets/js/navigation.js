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
