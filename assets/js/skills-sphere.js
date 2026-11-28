/**
 * Skills sphere - the skill chips of the #skills section, laid out on a 3D
 * sphere that turns slowly. The mouse (or a horizontal swipe) steers it.
 *
 * Plain DOM and CSS transforms, no WebGL. Decorative copy of the lists above
 * it (aria-hidden), which stay the accessible version. Runs only while the
 * section is on screen and the tab is visible; reduced motion: drawn once,
 * still.
 */
(function () {
  'use strict';

  var box = document.querySelector('.skills-sphere');
  if (!box) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AUTO = { x: 0.05, y: 0.25 };      // turning speed on its own (rad/s)

  var items = [];                       // { el, x, y, z } points on the unit sphere
  var angleX = 0.3;
  var angleY = 0;
  var speed = { x: AUTO.x, y: AUTO.y };
  var target = { x: AUTO.x, y: AUTO.y };
  var radius = 150;
  var onScreen = false;
  var rafId = 0;
  var last = 0;

  // Short label of a chip ("IA générative : LLM, ..." -> "IA générative").
  function label(badge) {
    var ai = badge.querySelector('[data-i18n="skills_ai"]');
    var text = ai ? ai.textContent.split(':')[0] : badge.textContent;
    return text.replace(/\s+/g, ' ').trim();
  }

  // One chip per skill, spread evenly over the sphere (Fibonacci lattice).
  function build() {
    var badges = document.querySelectorAll('#skills .row .badge');
    box.textContent = '';
    items = [];
    var n = badges.length;
    var golden = Math.PI * (3 - Math.sqrt(5));
    badges.forEach(function (badge, i) {
      var el = document.createElement('span');
      el.className = 'skills-sphere__item';
      var icon = badge.querySelector('i');
      if (icon) {
        var copy = icon.cloneNode(false);
        copy.classList.remove('me-1');
        el.append(copy);
      }
      el.append(document.createTextNode(label(badge)));
      box.append(el);
      var y = 1 - (i + 0.5) * 2 / n;
      var r = Math.sqrt(1 - y * y);
      var phi = i * golden;
      items.push({ el: el, x: Math.cos(phi) * r, y: y, z: Math.sin(phi) * r });
    });
    measure();
  }

  function measure() {
    radius = Math.max(80, Math.min(box.clientWidth, box.clientHeight) / 2 - 40);
    draw();
  }

  // Rotate every point (around Y, then X) and project it: closer chips are
  // bigger, more opaque and drawn on top.
  function draw() {
    var cx = Math.cos(angleX), sx = Math.sin(angleX);
    var cy = Math.cos(angleY), sy = Math.sin(angleY);
    for (var i = 0; i < items.length; i++) {
      var p = items[i];
      var x1 = p.x * cy + p.z * sy;
      var z1 = -p.x * sy + p.z * cy;
      var y2 = p.y * cx - z1 * sx;
      var z2 = p.y * sx + z1 * cx;
      var depth = (z2 + 1) / 2;          // 0 at the back, 1 at the front
      var s = 0.62 + 0.48 * depth;
      p.el.style.transform = 'translate(-50%, -50%) translate3d(' +
        (x1 * radius).toFixed(1) + 'px, ' + (y2 * radius).toFixed(1) + 'px, 0) scale(' + s.toFixed(3) + ')';
      p.el.style.opacity = (0.22 + 0.78 * depth).toFixed(3);
      p.el.style.zIndex = String(Math.round(depth * 100));
    }
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    var dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    var k = Math.min(1, dt * 3);
    speed.x += (target.x - speed.x) * k;
    speed.y += (target.y - speed.y) * k;
    angleX += speed.x * dt;
    angleY += speed.y * dt;
    draw();
  }

  function updateLoop() {
    var run = onScreen && !document.hidden;
    if (run && !rafId) {
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    } else if (!run && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  // The pointer's offset from the centre sets the direction and speed: to
  // the right turns the front to the right, up turns it up.
  function steer(e) {
    var r = box.getBoundingClientRect();
    var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    target.y = Math.max(-1, Math.min(1, dx)) * 1.4;
    target.x = -Math.max(-1, Math.min(1, dy)) * 1.4;
  }

  function release() {
    target.x = AUTO.x;
    target.y = target.y < 0 ? -AUTO.y : AUTO.y;   // keep the last direction
  }

  build();

  // Language switch: main.js rewrites the chips, then sets <html lang>.
  new MutationObserver(function () { setTimeout(build, 0); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  window.addEventListener('resize', measure);

  if (reduceMotion) return;             // static sphere

  box.addEventListener('pointermove', steer);
  box.addEventListener('pointerleave', release);
  box.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') release(); });
  box.addEventListener('pointercancel', release);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      updateLoop();
    }).observe(box);
  } else {
    onScreen = true;
  }
  document.addEventListener('visibilitychange', updateLoop);
  updateLoop();
})();
