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
   * About Section - Languages type effect
   */
  const langTypedEl = select('.lang-typed');
  let langTyped;
  const initLangTyped = (strings) => {
    if (langTyped) langTyped.destroy();
    langTyped = new Typed('.lang-typed', {
      strings: strings,
      typeSpeed: 80,
      backSpeed: 40,
      backDelay: 2000,
      loop: true
    });
  }


  /**
   * Projects section - Isotope masonry layout with show-more
   */
  window.addEventListener('load', () => {
    let projectsSlider = select('.projects-slider');
    if (projectsSlider) {
      new Swiper('.projects-slider', {
        effect: 'coverflow',
        grabCursor: true,
        centeredSlides: true,
        slidesPerView: 'auto',
        initialSlide: 1, // Start on the second slide (often the main project)
        coverflowEffect: {
          rotate: 30, // Angle of rotation
          stretch: -30, // Space between slides
          depth: 250, // Depth perspective
          modifier: 1, // Multiplier
          slideShadows: true, // Show 3D shadows dropping off
        },
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        keyboard: {
          enabled: true,
        },
      });
    }
  });


  /**
   * Initiate portfolio lightbox 
   */
  const portfolioLightbox = GLightbox({
    selector: '.portfolio-lightbox'
  });

  /**
   * Initiate portfolio details lightbox 
   */
  const portfolioDetailsLightbox = GLightbox({
    selector: '.portfolio-details-lightbox',
    width: '90%',
    height: '90vh'
  });

  /**
   * Portfolio details slider
   */
  new Swiper('.portfolio-details-slider', {
    speed: 400,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    }
  });

  /**
   * Testimonials slider (only inits if the section is present)
   */
  if (select('.testimonials-slider')) {
    new Swiper('.testimonials-slider', {
      speed: 600,
      loop: true,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false
      },
      slidesPerView: 'auto',
      pagination: {
        el: '.swiper-pagination',
        type: 'bullets',
        clickable: true
      }
    });
  }

  /**
   * Animation on scroll
   */
  window.addEventListener('load', () => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
      mirror: false,
      // Respect reduced-motion: show content instantly, no reveal animation
      disable: function () {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
    })
  });

  /**
   * Theme Toggle (Dark/Light Mode)
   */
  const themeToggle = select('#theme-toggle');
  const body = select('body');
  const ghStats = select('#gh-card-stats');
  const ghLangs = select('#gh-card-languages');
  const ghStreak = select('#gh-card-streak');

  function updateGitHubCards(theme) {
    if (!ghStats || !ghLangs || !ghStreak) return;
    
    const textColor = theme === 'dark' ? 'f1f1f1' : '45505b';
    const titleColor = '0563bb';
    const iconColor = '0563bb';
    
    ghStats.src = `https://readme-stats-fast.vercel.app/api?username=Bakame03&show_icons=true&theme=transparent&hide_border=true&title_color=${titleColor}&icon_color=${iconColor}&text_color=${textColor}`;
    ghLangs.src = `https://readme-stats-fast.vercel.app/api/top-langs/?username=Bakame03&layout=compact&theme=transparent&hide_border=true&title_color=${titleColor}&text_color=${textColor}`;
    ghStreak.src = `https://streak-stats.demolab.com/?user=Bakame03&theme=transparent&hide_border=true&stroke=${titleColor}&ring=${titleColor}&fire=${titleColor}&currStreakNum=${titleColor}&sideTexts=${textColor}`;
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
    updateGitHubCards(initialTheme);

    themeToggle.addEventListener('click', () => {
      const currentTheme = body.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      body.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateGitHubCards(newTheme);
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
        } else if (key === 'about_languages_val') {
          initLangTyped(translation.split(','));
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
          <h6><i class="bi bi-folder2"></i>${esc(repo.name)}</h6>
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
   * Reusable lightweight modal controller (data-attribute driven).
   * Replaces the three near-identical CV / BUT1 / DevArt inline scripts.
   *   Open:  any element with [data-modal-open="#modalId"]
   *   Close: [data-modal-close], a backdrop click, or the Escape key
   */
  (function initModalLite() {
    const openModal = (modal) => {
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };
    const closeModal = (modal) => {
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
    };

    select('[data-modal-open]', true).forEach(trigger => {
      trigger.addEventListener('click', () => {
        const modal = select(trigger.getAttribute('data-modal-open'));
        if (modal) openModal(modal);
      });
    });

    select('.modal-lite', true).forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal || (e.target.closest && e.target.closest('[data-modal-close]'))) {
          closeModal(modal);
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        select('.modal-lite.is-open', true).forEach(closeModal);
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


