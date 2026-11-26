/**
 * Portfolio robot - a small animated 3D robot that lives at the bottom of the
 * page (RobotExpressive by Tomás Laulhé / Quaternius, CC0, assets/3d/robot.glb).
 *
 * Loaded as a module (deferred) and kept cheap until it is needed:
 * - three.js (assets/vendor/three) is imported only after the page has loaded
 *   and the browser is idle, and never on very small screens or when the
 *   visitor has hidden the robot;
 * - the canvas is a fixed, transparent band that lets clicks through;
 * - rendering stops while the tab is hidden or the robot is turned off.
 *
 * The scene uses an orthographic camera measured in CSS pixels, so the robot's
 * size and position are set in pixels (x from the left, feet at y = 0).
 */

const MIN_WIDTH = 360;            // below this, no robot at all
const STORAGE_KEY = 'robot';      // 'on' | 'off'
const THREE_URL = '../vendor/three/three-robot.min.js';
const MODEL_URL = new URL('../3d/robot.glb', import.meta.url).href;

const toggle = document.getElementById('robot-toggle');
const tooSmall = window.matchMedia(`(max-width: ${MIN_WIDTH - 1}px)`);
const phone = window.matchMedia('(max-width: 767px)');
const desktopNav = window.matchMedia('(min-width: 992px)');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let layer = null;
let THREE = null;
let renderer, scene, camera, mixer;
let robot = null;                 // the loaded model (THREE.Group)
let actions = {};                 // animation name -> AnimationAction
let current = null;               // action currently playing
let modelHeight = 1;              // model height in model units
let started = false;
let visible = true;
let rafId = 0;
let last = 0;

// ---- Visitor choice -----------------------------------------------------
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
  visible = on;
  document.documentElement.classList.toggle('robot-off', !on);
  if (toggle) toggle.setAttribute('aria-pressed', String(on));
  updateLoop();
}

// ---- Sizes (CSS pixels) -------------------------------------------------
const robotHeightPx = () => (phone.matches ? 75 : 110);
// Resting spot: just right of the desktop menu rail, or near the left edge.
const homeX = () => (desktopNav.matches ? 150 : 50);

// ---- Lazy start ---------------------------------------------------------
async function start() {
  if (started) return;
  started = true;
  try {
    THREE = await import(THREE_URL);
    setupScene();
    await loadRobot();
    play('Idle', 0);
    updateLoop();
  } catch (err) {
    // Never let the robot break the page: log, remove the layer and button.
    console.warn('robot: disabled', err);
    stopLoop();
    if (layer) layer.remove();
    if (toggle) toggle.hidden = true;
  }
}

function setupScene() {
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  // Phones: cap the pixel ratio a bit lower to keep the GPU work small.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, phone.matches ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  layer.append(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000);
  camera.position.z = 500;

  // Same lighting idea as the three.js RobotExpressive example.
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
  hemi.position.set(0, 400, 0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.position.set(150, 300, 400);
  scene.add(sun);

  resize();
  window.addEventListener('resize', resize);
}

async function loadRobot() {
  const gltf = await new THREE.GLTFLoader().loadAsync(MODEL_URL);
  robot = gltf.scene;

  const box = new THREE.Box3().setFromObject(robot);
  modelHeight = box.max.y - box.min.y || 1;
  robot.userData.minY = box.min.y;
  scene.add(robot);

  mixer = new THREE.AnimationMixer(robot);
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  placeRobot();
}

// Scale the model to the target height and stand it on the bottom edge.
function placeRobot() {
  if (!robot) return;
  const k = robotHeightPx() / modelHeight;
  robot.scale.setScalar(k);
  robot.position.set(homeX(), 8 - robot.userData.minY * k, 0);
}

// Cross-fade to an animation (looping states for now).
function play(name, fade = 0.4) {
  const next = actions[name];
  if (!next || next === current) return;
  next.reset().setEffectiveWeight(1).play();
  if (current) current.crossFadeTo(next, fade, false);
  current = next;
}

function resize() {
  if (!renderer) return;
  const w = layer.clientWidth;
  const h = layer.clientHeight;
  renderer.setSize(w, h, false);
  camera.left = 0;
  camera.right = w;
  camera.top = h;
  camera.bottom = 0;
  camera.updateProjectionMatrix();
  placeRobot();
  render();
}

// ---- Render loop --------------------------------------------------------
function render() {
  if (renderer) renderer.render(scene, camera);
}

function frame(now) {
  rafId = requestAnimationFrame(frame);
  // Clamp the step so a long pause (background tab) doesn't jump animations.
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (mixer) mixer.update(dt);
  render();
}

function updateLoop() {
  const shouldRun = visible && !document.hidden && !!mixer;
  if (shouldRun && !rafId) {
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  } else if (!shouldRun) {
    stopLoop();
  }
}

function stopLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

document.addEventListener('visibilitychange', updateLoop);

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

