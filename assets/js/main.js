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
  if (typed) {
    let typed_strings = typed.getAttribute('data-typed-items')
    typed_strings = typed_strings.split(',')
    new Typed('.typed', {
      strings: typed_strings,
      loop: true,
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000
    });
  }

  /**
   * Skills animation
   */
  let skilsContent = select('.skills-content');
  if (skilsContent) {
    new Waypoint({
      element: skilsContent,
      offset: '80%',
      handler: function(direction) {
        let progress = select('.progress .progress-bar', true);
        progress.forEach((el) => {
          el.style.width = el.getAttribute('aria-valuenow') + '%'
        });
      }
    })
  }

  /**
   * Projects section - Isotope masonry layout with show-more
   */
  window.addEventListener('load', () => {
    let projectsContainer = select('#projects .portfolio-container');
    if (projectsContainer) {
      let projectsIsotope = new Isotope(projectsContainer, {
        itemSelector: '.portfolio-item',
        layoutMode: 'masonry',
        masonry: {
          columnWidth: '.portfolio-sizer',
          gutter: 0
        },
        percentPosition: true,
        transitionDuration: '0.6s',
        filter: function(itemElem) {
          return !itemElem.classList.contains('hidden-item');
        }
      });

      let projectFilters = select('#projects #portfolio-flters li', true);

      on('click', '#projects #portfolio-flters li', function(e) {
        e.preventDefault();
        projectFilters.forEach(function(el) {
          el.classList.remove('filter-active');
        });
        this.classList.add('filter-active');

        let filterValue = this.getAttribute('data-filter');

        if (filterValue === '*') {
          projectsIsotope.arrange({ filter: function(itemElem) {
            if (itemElem.classList.contains('hidden-item') && !itemElem.classList.contains('show-item')) {
              return false;
            }
            return true;
          }});
        } else {
          projectsIsotope.arrange({ filter: function(itemElem) {
            let matchesFilter = itemElem.classList.contains(filterValue.replace('.', ''));
            if (itemElem.classList.contains('hidden-item') && !itemElem.classList.contains('show-item')) {
              return false;
            }
            return matchesFilter;
          }});
        }

        projectsIsotope.on('arrangeComplete', function() {
          AOS.refresh();
        });
      }, true);

      let btnShowMore = select('#btnShowMore');
      if (btnShowMore) {
        let expanded = false;
        btnShowMore.addEventListener('click', function() {
          expanded = !expanded;
          let hiddenItems = select('#projects .hidden-item', true);

          hiddenItems.forEach(function(item) {
            if (expanded) {
              item.classList.add('show-item');
            } else {
              item.classList.remove('show-item');
            }
          });

          this.classList.toggle('expanded', expanded);
          this.querySelector('span').textContent = expanded ? 'Show Less' : 'View All Projects';

          let activeFilter = select('#projects #portfolio-flters li.filter-active');
          let filterValue = activeFilter ? activeFilter.getAttribute('data-filter') : '*';

          if (filterValue === '*') {
            projectsIsotope.arrange({ filter: function(itemElem) {
              if (itemElem.classList.contains('hidden-item') && !itemElem.classList.contains('show-item')) {
                return false;
              }
              return true;
            }});
          } else {
            projectsIsotope.arrange({ filter: function(itemElem) {
              let matchesFilter = itemElem.classList.contains(filterValue.replace('.', ''));
              if (itemElem.classList.contains('hidden-item') && !itemElem.classList.contains('show-item')) {
                return false;
              }
              return matchesFilter;
            }});
          }

          AOS.refresh();
        });
      }
    }
  });

  /**
   * CV section - basic Isotope (no masonry needed)
   */
  window.addEventListener('load', () => {
    let cvContainer = select('#portfolio .portfolio-container');
    if (cvContainer) {
      new Isotope(cvContainer, {
        itemSelector: '.portfolio-item'
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
   * Initiate Pure Counter 
   */
  new PureCounter();

})()

let a = new Date().getFullYear();
document.getElementById("current_year").innerText = a;
document.getElementById("myAge").innerText = a - 2002; //my age
var elements = document.querySelectorAll('.it_experience');
    elements.forEach(function(element){
        element.innerText = a - 2022;
    }); //my it experience
var elements = document.querySelectorAll('.currentYear');
    elements.forEach(function(element){
        element.innerText = a;
    });

