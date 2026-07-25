(function() {
  "use strict";

  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim()
    if (all) {
      return [...document.querySelectorAll(el)]
    } else {
      return document.querySelector(el)
    }
  }

  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all)
    if (selectEl) {
      if (all) {
        selectEl.forEach(e => e.addEventListener(type, listener))
      } else {
        selectEl.addEventListener(type, listener)
      }
    }
  }

  /**
   * requestAnimationFrame throttle — coalesces bursty events (e.g. scroll) into
   * at most one call per frame, so handlers that read layout don't thrash.
   */
  const rafThrottle = (fn) => {
    let queued = false;
    return function () {
      if (queued) return;
      queued = true;
      const ctx = this, args = arguments;
      requestAnimationFrame(() => { queued = false; fn.apply(ctx, args); });
    };
  };

  /**
   * Navbar links active state on scroll
   */
  let navbarlinks = select('#navbar .scrollto', true)
  const navbarlinksActive = () => {
    let position = window.scrollY + 200
    navbarlinks.forEach(navbarlink => {
      if (!navbarlink.hash) return
      let section = select(navbarlink.hash)
      if (!section) return
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        navbarlink.classList.add('active')
      } else {
        navbarlink.classList.remove('active')
      }
    })
  }
  window.addEventListener('load', navbarlinksActive)
  document.addEventListener('scroll', rafThrottle(navbarlinksActive), { passive: true })

  /**
   * Scrolls to an element with header offset
   */
  const scrollto = (el) => {
    let elementPos = select(el).offsetTop
    window.scrollTo({
      top: elementPos,
      behavior: 'smooth'
    })
  }

  /**
   * Back to top button
   */
  let backtotop = select('.back-to-top');
  if (backtotop) {
    let scrollTimeout;

    const showButton = () => {
      if (window.scrollY > 100) {
        backtotop.classList.add('active');
      } else {
        backtotop.classList.remove('active');
      }
    };

    const handleScroll = () => {
      showButton();
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        // On mobile, keep the button visible if at the top of the page
        if (window.innerWidth <= 768 && window.scrollY <= 100) {
          backtotop.classList.add('active');
        } else {
          backtotop.classList.remove('active');
        }
      }, 1500); // Hide after 1.5 seconds of inactivity
    };

    const toggleIcon = () => {
      if (window.innerWidth <= 768) {
        if (window.scrollY > 100) {
          backtotop.href = '#hero';
          backtotop.querySelector('i').classList.remove('bi-arrow-down-circle');
          backtotop.querySelector('i').classList.add('bi-arrow-up-short');
        } else {
          backtotop.href = '#about';
          backtotop.querySelector('i').classList.remove('bi-arrow-up-short');
          backtotop.querySelector('i').classList.add('bi-arrow-down-circle');
        }
      }
    };

    window.addEventListener('load', () => {
      handleScroll();
      toggleIcon();
    });
    document.addEventListener('scroll', rafThrottle(() => {
      handleScroll();
      toggleIcon();
    }), { passive: true });
    window.addEventListener('resize', toggleIcon);

    // Explicit scroll handler — a bare href="#" doesn't re-scroll once the URL
    // already ends in "#", so the button silently stopped working. This always
    // scrolls reliably, keeps the mobile dual behaviour (down-to-About when at
    // the top, up-to-top when scrolled), and honours reduced-motion.
    backtotop.addEventListener('click', (e) => {
      e.preventDefault();
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      const goDownToAbout = window.innerWidth <= 768 && window.scrollY <= 100;
      const about = document.querySelector('#about');
      if (goDownToAbout && about) {
        window.scrollTo({ top: about.offsetTop, behavior });
      } else {
        window.scrollTo({ top: 0, behavior });
      }
    });
  }

  /**
   * Auto-hide the floating controls (hamburger, theme & lang toggles) on
   * small screens: slide away when scrolling down, return when scrolling up.
   * Desktop keeps them always visible; the open nav drawer pins them too.
   */
  const smallScreen = window.matchMedia('(max-width: 991px)');
  let lastControlsY = window.scrollY;
  document.addEventListener('scroll', rafThrottle(() => {
    const body = document.body;
    if (!smallScreen.matches) {
      body.classList.remove('controls-hidden');
      lastControlsY = window.scrollY;
      return;
    }
    if (body.classList.contains('mobile-nav-active')) return;
    const y = window.scrollY;
    if (y > lastControlsY + 5 && y > 120) {
      body.classList.add('controls-hidden');
    } else if (y < lastControlsY - 5 || y <= 120) {
      body.classList.remove('controls-hidden');
    }
    lastControlsY = y;
  }), { passive: true });

  /**
   * Mobile nav toggle
   */
  on('click', '.mobile-nav-toggle', function(e) {
    select('body').classList.toggle('mobile-nav-active')
    this.classList.toggle('bi-list')
    this.classList.toggle('bi-x')
    this.setAttribute('aria-expanded',
      document.body.classList.contains('mobile-nav-active') ? 'true' : 'false')
  })

  /**
   * Tap the dim scrim (anywhere outside the drawer) to close the mobile nav.
   */
  document.addEventListener('click', function (e) {
    const body = select('body')
    if (!body.classList.contains('mobile-nav-active')) return
    if (e.target.closest('#header') || e.target.closest('.mobile-nav-toggle')) return
    body.classList.remove('mobile-nav-active')
    const toggle = select('.mobile-nav-toggle')
    if (toggle) {
      toggle.classList.add('bi-list')
      toggle.classList.remove('bi-x')
      toggle.setAttribute('aria-expanded', 'false')
    }
  })

  /**
   * Scrool with ofset on links with a class name .scrollto
   */
  on('click', '.scrollto', function(e) {
    if (select(this.hash)) {
      e.preventDefault()

      let body = select('body')
      if (body.classList.contains('mobile-nav-active')) {
        body.classList.remove('mobile-nav-active')
        let navbarToggle = select('.mobile-nav-toggle')
        navbarToggle.classList.toggle('bi-list')
        navbarToggle.classList.toggle('bi-x')
        navbarToggle.setAttribute('aria-expanded', 'false')
      }
      scrollto(this.hash)
    }
  }, true)

  /**
   * Scroll with ofset on page load with hash links in the url
   */
  window.addEventListener('load', () => {
    if (window.location.hash) {
      if (select(window.location.hash)) {
        scrollto(window.location.hash)
      }
    }
  });

  /**
   * Preloader
   */
  let preloader = select('#preloader');
  if (preloader) {
    const removePreloader = () => preloader.remove();
    window.addEventListener('load', removePreloader);
    // Failsafe: never let a slow/hung asset trap users behind the overlay.
    setTimeout(removePreloader, 3000);
  }

  /**
   * Hero type effect
   */
  const typed = select('.typed')
  let heroTyped;
  const initHeroTyped = (strings) => {
    if (heroTyped) heroTyped.destroy();
    heroTyped = new Typed('.typed', {
      strings: strings,
      loop: true,
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000
    });
  }

  if (typed) {
    let typed_strings = typed.getAttribute('data-typed-items');
    initHeroTyped(typed_strings.split(','));
  }

  /**
   * Initiate portfolio lightbox
   */
  const portfolioLightbox = GLightbox({
    selector: '.portfolio-lightbox'
  });

  // Hide the floating controls behind the lightbox overlay too.
  portfolioLightbox.on('open', () => document.body.classList.add('modal-open'));
  portfolioLightbox.on('close', () => document.body.classList.remove('modal-open'));

  /**
   * Scroll reveal — lightweight AOS replacement.
   * Elements with [data-aos] start hidden (CSS) and get .aos-animate when
   * they enter the viewport; [data-aos-delay] becomes a transition-delay.
   * Reduced motion / missing IntersectionObserver: reveal everything at once.
   */
  (function initScrollReveal() {
    const els = select('[data-aos]', true);
    if (!els.length) return;

    const revealAll = () => els.forEach(el => el.classList.add('aos-animate'));

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        !('IntersectionObserver' in window)) {
      revealAll();
      return;
    }

    els.forEach(el => {
      const delay = parseInt(el.getAttribute('data-aos-delay'), 10);
      if (delay) el.style.transitionDelay = (delay / 1000) + 's';
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('aos-animate');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => observer.observe(el));
  })();

  /**
   * Theme Toggle (Dark/Light Mode)
   */
  const themeToggle = select('#theme-toggle');
  const body = select('body');

  // Keep the mobile browser-chrome colour in sync with the active theme.
  function updateThemeColor(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#262624' : '#faf9f5');
  }

  if (themeToggle) {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let initialTheme = 'light';

    if (savedTheme) {
      initialTheme = savedTheme;
    } else if (systemPrefersDark) {
      initialTheme = 'dark';
    }

    body.setAttribute('data-theme', initialTheme);
    updateThemeColor(initialTheme);

    themeToggle.addEventListener('click', () => {
      const currentTheme = body.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

      body.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeColor(newTheme);
    });
  }

  /**
   * Language Switcher
   */
  const langToggle = select('#lang-toggle');
  
  function updateLanguage(lang) {
    if (!window.translations) return;
    const dictionary = window.translations[lang];
    if (!dictionary) return;

    // Update all elements with data-i18n
    select('[data-i18n]', true).forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = dictionary[key];
      if (translation) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = translation;
        } else if (key === 'hero_roles') {
          el.setAttribute('data-typed-items', translation);
          initHeroTyped(translation.split(','));
        } else {
          el.innerHTML = translation;
        }
      }
    });

    // Update Toggle Button Text
    if (langToggle) {
      langToggle.innerText = lang.toUpperCase();
    }

    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
  }

  if (langToggle) {
    const savedLang = localStorage.getItem('lang') || 'en';
    updateLanguage(savedLang);

    langToggle.addEventListener('click', () => {
      const currentLang = localStorage.getItem('lang') || 'en';
      const newLang = currentLang === 'en' ? 'fr' : 'en';
      updateLanguage(newLang);
    });
  } else {
    // If toggle not found (e.g. before it's injected), still try to init
    const savedLang = localStorage.getItem('lang') || 'en';
    // Small delay to ensure translations.js is loaded if script order is tricky
    setTimeout(() => updateLanguage(savedLang), 100);
  }

  /**
   * GitHub Live Repositories Fetch
   */
  async function fetchGitHubActivity() {
    const repoList = select('#github-repo-list');
    if (!repoList) return;

    const CACHE_KEY = 'gh_repos_v1';
    const TTL = 30 * 60 * 1000; // 30 minutes

    // Escape repo-supplied strings before they hit innerHTML.
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    const render = (repos) => {
      repoList.innerHTML = ''; // Clear spinner
      repos.forEach(repo => {
        const repoItem = document.createElement('a');
        repoItem.href = repo.html_url;
        repoItem.target = '_blank';
        repoItem.rel = 'noopener';
        repoItem.className = 'repo-item';
        repoItem.innerHTML = `
          <h4><i class="bi bi-folder2"></i>${esc(repo.name)}</h4>
          <p>${esc(repo.description) || 'No description provided.'}</p>
          <div class="repo-meta">
            <span><i class="bi bi-star-fill"></i>${Number(repo.stargazers_count) || 0}</span>
            <span><i class="bi bi-diagram-2"></i>${Number(repo.forks_count) || 0}</span>
            <span><i class="bi bi-circle-fill repo-lang-dot"></i>${esc(repo.language) || 'Code'}</span>
          </div>
        `;
        repoList.appendChild(repoItem);
      });
    };

    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) {}
    const hasCache = cached && Array.isArray(cached.data) && cached.data.length;

    // Paint cached data instantly; if it's still fresh, skip the network entirely.
    if (hasCache) {
      render(cached.data);
      if (Date.now() - cached.t < TTL) return;
    }

    try {
      const response = await fetch('https://api.github.com/users/Bakame03/repos?sort=updated&per_page=3');
      if (!response.ok) throw new Error('GitHub API ' + response.status);
      const repos = await response.json();
      render(repos);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: repos })); } catch (e) {}
    } catch (error) {
      console.error('GitHub API Error:', error);
      // Keep stale cached data on screen; only show the fallback if we have nothing.
      if (!hasCache) {
        repoList.innerHTML = `
          <div class="col-12 text-center text-muted">
            <p>Unable to load live activity. <a href="https://github.com/Bakame03" target="_blank" rel="noopener">View profile on GitHub</a></p>
          </div>
        `;
      }
    }
  }
  
  fetchGitHubActivity();

  /**
   * GitHub profile stat tiles — replaces the three third-party stat images
   * (readme-stats / streak-stats): no slow external image services, and the
   * tiles inherit the site theme automatically.
   */
  async function fetchGitHubStats() {
    const tiles = {
      repos: select('#stat-repos'),
      stars: select('#stat-stars'),
      followers: select('#stat-followers'),
      langs: select('#stat-langs')
    };
    if (!tiles.repos && !tiles.langs) return;

    const CACHE_KEY = 'gh_profile_stats_v1';
    const TTL = 30 * 60 * 1000; // 30 minutes

    const render = (s) => {
      if (tiles.repos) tiles.repos.textContent = s.repos;
      if (tiles.stars) tiles.stars.textContent = s.stars;
      if (tiles.followers) tiles.followers.textContent = s.followers;
      if (tiles.langs && Array.isArray(s.langs)) {
        tiles.langs.innerHTML = '';
        s.langs.forEach(lang => {
          const chip = document.createElement('span');
          chip.className = 'stat-tile__lang';
          chip.textContent = lang;
          tiles.langs.appendChild(chip);
        });
      }
    };

    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) {}
    if (cached && cached.data) {
      render(cached.data);
      if (Date.now() - cached.t < TTL) return;
    }

    try {
      const [userRes, reposRes] = await Promise.all([
        fetch('https://api.github.com/users/Bakame03'),
        fetch('https://api.github.com/users/Bakame03/repos?per_page=100')
      ]);
      if (!userRes.ok || !reposRes.ok) throw new Error('GitHub API error');
      const user = await userRes.json();
      const repos = await reposRes.json();

      const langCount = {};
      let stars = 0;
      repos.forEach(r => {
        stars += Number(r.stargazers_count) || 0;
        if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
      });
      const langs = Object.keys(langCount)
        .sort((a, b) => langCount[b] - langCount[a])
        .slice(0, 4);

      const data = {
        repos: Number(user.public_repos) || 0,
        followers: Number(user.followers) || 0,
        stars: stars,
        langs: langs
      };
      render(data);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch (e) {}
    } catch (error) {
      console.error('GitHub stats error:', error);
      // Tiles keep their placeholders (or stale cached values) — no broken UI.
    }
  }

  fetchGitHubStats();

  /**
   * Scroll Progress Bar
   */
  const scrollProgress = select('#scroll-progress');
  if (scrollProgress) {
    window.addEventListener('scroll', rafThrottle(() => {
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (window.scrollY / windowHeight) * 100;
      scrollProgress.style.width = scrolled + '%';
    }), { passive: true });
  }

  /**
   * Contact map — click-to-load facade: no request to Google is made until the
   * user opts in (privacy + one fewer heavy third-party embed on load).
   */
  const mapFacade = select('#mapFacade');
  if (mapFacade) {
    mapFacade.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = mapFacade.getAttribute('data-map-src');
      iframe.className = 'contact-map';
      iframe.title = 'Map of Arles, France';
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      mapFacade.replaceWith(iframe);
    });
  }

  /**
   * Reusable lightweight modal controller (data-attribute driven).
   * Replaces the three near-identical CV / BUT1 / DevArt inline scripts.
   *   Open:  any element with [data-modal-open="#modalId"]
   *   Close: [data-modal-close], a backdrop click, or the Escape key
   *
   * Implements the ARIA dialog pattern: focus moves into the dialog on open,
   * Tab is trapped inside it, and focus returns to the trigger on close.
   */
  (function initModalLite() {
    const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
    let lastTrigger = null;

    // Visible, focusable elements within a modal (getClientRects is robust for
    // the modal's position:fixed context, where offsetParent is unreliable).
    const focusable = (modal) =>
      Array.prototype.slice.call(modal.querySelectorAll(FOCUSABLE))
        .filter(el => el.getClientRects().length > 0);

    const openModal = (modal, trigger) => {
      lastTrigger = trigger || document.activeElement;
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      // Hide the floating controls (toggles, hamburger, back-to-top) so the
      // modal's close button is unobstructed.
      document.body.classList.add('modal-open');
      // Move focus into the dialog: the close button if present, else the dialog.
      const target = modal.querySelector('.modal-lite__close') || modal;
      target.focus();
    };

    const closeModal = (modal) => {
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
      // Return focus to whatever opened the dialog.
      if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
      lastTrigger = null;
    };

    select('[data-modal-open]', true).forEach(trigger => {
      trigger.addEventListener('click', () => {
        const modal = select(trigger.getAttribute('data-modal-open'));
        if (!modal) return;
        // PDF-in-iframe modals are unusable on touch devices (iOS Safari
        // renders only the first page, no scroll) — open the file directly.
        if (modal.classList.contains('modal-lite--doc') &&
            window.matchMedia('(pointer: coarse)').matches) {
          const doc = modal.querySelector('.modal-lite__download');
          if (doc) {
            window.open(doc.getAttribute('href'), '_blank', 'noopener');
            return;
          }
        }
        openModal(modal, trigger);
      });
    });

    select('.modal-lite', true).forEach(modal => {
      // Allow the dialog itself to receive focus as a fallback.
      if (!modal.hasAttribute('tabindex')) modal.setAttribute('tabindex', '-1');
      modal.addEventListener('click', (e) => {
        if (e.target === modal || (e.target.closest && e.target.closest('[data-modal-close]'))) {
          closeModal(modal);
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      const modal = select('.modal-lite.is-open');
      if (!modal) return;

      if (e.key === 'Escape') {
        closeModal(modal);
        return;
      }

      if (e.key === 'Tab') {
        const items = focusable(modal);
        if (items.length === 0) {
          e.preventDefault();
          modal.focus();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !modal.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !modal.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  })();

})()

let a = new Date().getFullYear();

const currentYearEl = document.getElementById("current_year");
if (currentYearEl) currentYearEl.innerText = a;

const myAgeEl = document.getElementById("myAge");
if (myAgeEl) myAgeEl.innerText = a - 2002;

const itExperienceEls = document.querySelectorAll('.it_experience');
itExperienceEls.forEach(el => {
    el.innerText = a - 2022;
});

const currentYearEls = document.querySelectorAll('.currentYear');
currentYearEls.forEach(el => {
    el.innerText = a;
});


