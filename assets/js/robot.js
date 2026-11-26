/**
 * Portfolio robot - a small animated 3D robot that lives at the bottom of the
 * page (RobotExpressive, CC0, assets/3d/robot.glb).
 *
 * Loaded as a module (deferred) and kept cheap until it is needed:
 * - three.js (assets/vendor/three) is imported only after the page has loaded
 *   and the browser is idle, and never on very small screens or when the
 *   visitor has hidden the robot;
 * - the canvas is a fixed, transparent layer that lets clicks through.
 *
 * Step 1: layer, show/hide toggle (remembered) and lazy library loading.
 */

const MIN_WIDTH = 360;            // below this, no robot at all
const STORAGE_KEY = 'robot';      // 'on' | 'off'
const THREE_URL = '../vendor/three/three-robot.min.js';

const toggle = document.getElementById('robot-toggle');
const tooSmall = window.matchMedia(`(max-width: ${MIN_WIDTH - 1}px)`);

let layer = null;
let THREE = null;
let renderer = null;
let started = false;

function readChoice() {
  try { return localStorage.getItem(STORAGE_KEY) !== 'off'; } catch (e) { return true; }
}

function saveChoice(on) {
  try { localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off'); } catch (e) {}
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

// ---- Layer --------------------------------------------------------------
function createLayer() {
  layer = document.createElement('div');
  layer.className = 'robot-layer';
  layer.setAttribute('aria-hidden', 'true'); // decorative
  document.body.append(layer);
}

function setVisible(on) {
  document.documentElement.classList.toggle('robot-off', !on);
  if (toggle) toggle.setAttribute('aria-pressed', String(on));
}

// ---- Lazy start ---------------------------------------------------------
async function start() {
  if (started) return;
  started = true;
  THREE = await import(THREE_URL);

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  layer.append(renderer.domElement);
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  if (!renderer) return;
  renderer.setSize(layer.clientWidth, layer.clientHeight, false);
}

function whenIdle(fn) {
  const run = () => ('requestIdleCallback' in window
    ? requestIdleCallback(fn, { timeout: 3000 })
    : setTimeout(fn, 1200));
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}

// ---- Init ---------------------------------------------------------------
if (toggle && !tooSmall.matches && webglAvailable()) {
  createLayer();
  toggle.hidden = false;
  let on = readChoice();
  setVisible(on);

  toggle.addEventListener('click', () => {
    on = !on;
    saveChoice(on);
    setVisible(on);
    if (on) start();
  });

  if (on) whenIdle(start);
}
