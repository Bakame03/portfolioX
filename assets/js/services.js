/**
 * "Coups de main" page (services.html): theme and language toggles, scroll
 * reveals, and the two card demos. Standalone on purpose: main.js is wired
 * to index.html's sections.
 */
(function () {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Language (same keys and storage as index.html) --------------------
  const langToggle = document.getElementById('lang-toggle');

  function applyLanguage(lang) {
    const dict = window.translations && window.translations[lang];
    if (!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const value = dict[el.getAttribute('data-i18n')];
      if (value) el.innerHTML = value;
    });
    [['alt', 'alt'], ['title', 'title'], ['aria', 'aria-label']].forEach(([suffix, attr]) => {
      document.querySelectorAll(`[data-i18n-${suffix}]`).forEach(el => {
        const value = dict[el.getAttribute(`data-i18n-${suffix}`)];
        if (value) el.setAttribute(attr, value.replace(/<[^>]+>/g, ''));
      });
    });
    if (langToggle) langToggle.textContent = lang.toUpperCase();
    try { localStorage.setItem('lang', lang); } catch (e) {}
    root.lang = lang;
  }

  applyLanguage(root.lang || 'fr');
  if (langToggle) {
    langToggle.addEventListener('click', () => applyLanguage(root.lang === 'fr' ? 'en' : 'fr'));
  }

  // ---- Theme (circular reveal from the button, as on index.html) ---------
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      const apply = () => {
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', next === 'dark' ? '#262624' : '#faf9f5');
      };
      if (!document.startViewTransition || reduceMotion) { apply(); return; }
      const r = themeToggle.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.classList.add('theme-switching');
      const transition = document.startViewTransition(apply);
      transition.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 600, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(() => {});
      transition.finished.finally(() => root.classList.remove('theme-switching'));
    });
  }

  // ---- Reveals + demos ---------------------------------------------------
  // Each element fades in when it enters the viewport; a card's demo starts
  // a moment later, once the card itself is visible.
  const reveal = (el) => {
    el.classList.add('is-visible');
    if (el.matches('.svc-card')) {
      if (reduceMotion) el.classList.add('is-playing');
      else setTimeout(() => el.classList.add('is-playing'), 350);
    }
  };

  const items = document.querySelectorAll('.svc-reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach(reveal);
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    items.forEach(el => observer.observe(el));
  }

  const year = document.getElementById('current_year');
  if (year) year.textContent = new Date().getFullYear();
})();
