/**
 * Hero shape - a small low-poly icosahedron in the accent colour, floating in
 * the hero's top-right corner. It turns slowly on its own and leans toward the
 * mouse. Decorative only (aria-hidden, no pointer events).
 *
 * Same loading rules as the robot (robot.js), and the same three.js file, so
 * the library is downloaded once for both:
 * - wide screens only (992px and up, where the hero has room for it);
 * - started on the first interaction (or 8 s after load), when idle;
 * - renders only while the hero is on screen and the tab is visible;
 * - reduced motion: drawn once, still.
 */

const THREE_URL = '../vendor/three/three-robot.min.js';
const SIZE = 210;                       // canvas size, CSS pixels

const hero = document.getElementById('hero');
const wide = window.matchMedia('(min-width: 992px)');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;

let THREE, renderer, scene, camera, gem, box;
let rafId = 0;
let last = 0;
let onScreen = true;
let pointer = null;                     // mouse position (client px)
let tiltX = 0;                          // current lean toward the mouse (radians)
let tiltY = 0;
let spin = 0;                           // slow turn on its own
let clock = 0;

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

// Accent colour of the current theme (style.css --accent).
const accent = () => getComputedStyle(root).getPropertyValue('--accent').trim() || '#b65530';

async function start() {
  if (!wide.matches) return;            // window made narrow before we started
  try {
    THREE = await import(THREE_URL);
    build();
    box.classList.add('is-ready');      // fade in (CSS)
    if (reduceMotion.matches) {
      render();
    } else {
      watch();
      updateLoop();
    }
  } catch (err) {
    console.warn('hero-gem: disabled', err);
    if (box) box.remove();
  }
}

function build() {
  box = document.createElement('div');
  box.className = 'hero-gem';
  box.setAttribute('aria-hidden', 'true');
  hero.append(box);

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(SIZE, SIZE, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  box.append(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  camera.position.set(0, 0, 5.2);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b5a4e, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(2, 3, 4);
  scene.add(sun);

  // Flat-shaded faces plus a fine outline on the edges: reads as "low poly".
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const material = new THREE.MeshStandardMaterial({ color: accent(), flatShading: true, roughness: 0.5, metalness: 0.05 });
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
  );
  gem = new THREE.Group();
  gem.add(new THREE.Mesh(geometry, material), edges);
  gem.rotation.set(0.4, 0.6, 0);
  scene.add(gem);

  // Theme switch: follow the new accent colour.
  new MutationObserver(() => {
    material.color = new THREE.Color(accent());
    render();
  }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
}

// Pause when the hero scrolls away, the tab is hidden or the window narrows.
function watch() {
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    updateLoop();
  }).observe(hero);
  document.addEventListener('visibilitychange', updateLoop);
  wide.addEventListener('change', updateLoop);
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') pointer = { x: e.clientX, y: e.clientY };
  }, { passive: true });
  root.addEventListener('pointerleave', () => { pointer = null; });
}

function frame(now) {
  rafId = requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  clock += dt;
  spin += dt * 0.25;

  // Lean toward the mouse (up to about 30 degrees), eased.
  let wantX = 0;
  let wantY = 0;
  if (pointer) {
    const r = box.getBoundingClientRect();
    wantY = Math.max(-0.55, Math.min(0.55, (pointer.x - (r.left + r.width / 2)) / 600));
    wantX = Math.max(-0.55, Math.min(0.55, (pointer.y - (r.top + r.height / 2)) / 600));
  }
  const k = Math.min(1, dt * 3);
  tiltX += (wantX - tiltX) * k;
  tiltY += (wantY - tiltY) * k;

  gem.rotation.set(0.4 + tiltX, 0.6 + spin + tiltY, 0);
  gem.position.y = Math.sin(clock * 1.2) * 0.08;   // gentle float
  render();
}

function render() {
  if (renderer) renderer.render(scene, camera);
}

function updateLoop() {
  const run = onScreen && !document.hidden && wide.matches;
  if (run && !rafId) {
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  } else if (!run && rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

// Start on the first interaction or LATE_START_MS after load, when idle
// (same rule as robot.js, plus GEM_DELAY_MS).
const LATE_START_MS = 8000;
const GEM_DELAY_MS = 2500;
const FIRST_INTERACTION = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];

function whenReady(fn) {
  let fired = false;
  let timer = 0;
  const go = () => {
    if (fired) return;
    fired = true;
    clearTimeout(timer);
    FIRST_INTERACTION.forEach((t) => window.removeEventListener(t, go));
    // A bit after the robot (robot.js starts on the same signal), so the
    // two never compile their shaders in the same moment.
    setTimeout(() => {
      if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2000 });
      else fn();
    }, GEM_DELAY_MS);
  };
  const arm = () => {
    FIRST_INTERACTION.forEach((t) => window.addEventListener(t, go, { passive: true, once: true }));
    timer = setTimeout(go, LATE_START_MS);
  };
  if (document.readyState === 'complete') arm();
  else window.addEventListener('load', arm, { once: true });
}

if (hero && wide.matches && webglAvailable()) whenReady(start);
