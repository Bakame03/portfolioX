/**
* Template Name: MyResume
* Updated: Jan 09 2024 with Bootstrap v5.3.2
* Template URL: https://bootstrapmade.com/free-html-bootstrap-template-my-resume/
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/
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
   * Easy on scroll event listener 
   */
  const onscroll = (el, listener) => {
    el.addEventListener('scroll', listener)
  }

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
  onscroll(document, navbarlinksActive)

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
    onscroll(document, () => {
      handleScroll();
      toggleIcon();
    });
    window.addEventListener('resize', toggleIcon);
  }

  /**
   * Mobile nav toggle
   */
  on('click', '.mobile-nav-toggle', function(e) {
    select('body').classList.toggle('mobile-nav-active')
    this.classList.toggle('bi-list')
    this.classList.toggle('bi-x')
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
    window.addEventListener('load', () => {
      preloader.remove()
    });
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
   * Testimonials slider
   */
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

  /**
   * Animation on scroll
   */
  window.addEventListener('load', () => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
      mirror: false
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
    ghStreak.src = `https://github-readme-streak-stats.herokuapp.com/?user=Bakame03&theme=transparent&hide_border=true&stroke=${titleColor}&ring=${titleColor}&fire=${titleColor}&currStreakNum=${titleColor}&sideTexts=${textColor}`;
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

    try {
      const response = await fetch('https://api.github.com/users/Bakame03/repos?sort=updated&per_page=3');
      if (!response.ok) throw new Error('Failed to fetch repos');
      
      const repos = await response.json();
      repoList.innerHTML = ''; // Clear spinner

      repos.forEach(repo => {
        const repoItem = document.createElement('a');
        repoItem.href = repo.html_url;
        repoItem.target = '_blank';
        repoItem.className = 'repo-item';
        repoItem.innerHTML = `
          <h6><i class="bi bi-folder2"></i>${repo.name}</h6>
          <p>${repo.description || 'No description provided.'}</p>
          <div class="repo-meta">
            <span><i class="bi bi-star-fill"></i>${repo.stargazers_count}</span>
            <span><i class="bi bi-diagram-2"></i>${repo.forks_count}</span>
            <span><i class="bi bi-circle-fill" style="color: #0563bb; font-size: 8px;"></i>${repo.language || 'Code'}</span>
          </div>
        `;
        repoList.appendChild(repoItem);
      });
    } catch (error) {
      console.error('GitHub API Error:', error);
      repoList.innerHTML = `
        <div class="col-12 text-center text-muted">
          <p>Unable to load live activity. <a href="https://github.com/Bakame03" target="_blank">View profile on GitHub</a></p>
        </div>
      `;
    }
  }
  
  fetchGitHubActivity();

  /**
   * Scroll Progress Bar
   */
  const scrollProgress = select('#scroll-progress');
  if (scrollProgress) {
    window.addEventListener('scroll', () => {
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (window.scrollY / windowHeight) * 100;
      scrollProgress.style.width = scrolled + '%';
    });
  }

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


