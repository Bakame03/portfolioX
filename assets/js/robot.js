/**
 * Portfolio robot - a small animated 3D robot that lives at the bottom of the
 * page (RobotExpressive by Tomás Laulhé / Quaternius, CC0, assets/3d/robot.glb).
 *
 * Loaded as a module (deferred) and kept cheap until it is needed:
 * - three.js (assets/vendor/three) is imported only after the page has loaded,
 *   on the visitor's first interaction (or 8 s later) and when the browser is
 *   idle; never on very small screens or when the visitor has hidden it;
 * - the canvas is a fixed, transparent band that lets clicks through;
 * - rendering stops while the tab is hidden or the robot is turned off.
 *
 * The scene uses an orthographic camera measured in CSS pixels, so the robot's
 * size and position are set in pixels (x from the left, feet at y = 0).
 *
 * Pages choose a flavour with <body data-robot="...">:
 * - (none) index.html: walks along the bottom edge and reacts to the page;
 * - "calm"  services.html: stays at its spot, waves, no strolls;
 * - "lost"  404.html: lives in the page's .robot-stage and plays a short
 *           "fall down, get up" scene.
 */

const MIN_WIDTH = 360;            // below this, no robot at all
const STORAGE_KEY = 'robot';      // 'on' | 'off'
const THREE_URL = '../vendor/three/three-robot.min.js';
const MODEL_URL = new URL('../3d/robot.glb', import.meta.url).href;

const toggle = document.getElementById('robot-toggle');
const PAGE = document.body.dataset.robot || 'full';   // 'full' | 'calm' | 'lost'
const calm = PAGE !== 'full';                         // no strolls, no running
const stage = PAGE === 'lost' ? document.querySelector('.robot-stage') : null;
const root = document.documentElement;
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

// Behaviour state (CSS pixels / radians). The model faces the camera at
// rotation 0; +PI/2 faces right, -PI/2 faces left.
let mode = 'idle';                // 'entering' | 'idle' | 'walking' | 'emote' | 'sitting'
let idleTimer = 0;                // seconds left before the next stroll
let hitbox = null;                // invisible element over the robot (pointer events)
let faces = [];                   // head meshes carrying the facial morph targets
const moods = {};                 // morph name (Surprised/Angry/Sad) -> { v, t }
let scripted = false;             // 404 scene playing: ignore pokes and reactions
let runTimer = 0;                 // seconds of running left (fast scroll)
let hoverCooldown = 0;            // seconds before hover can trigger again
let voiceState = 'idle';          // mirrors the voice assistant (voice.js)
let nodTimer = 0;                 // seconds before the next nod while the AI speaks
let headBone = null;              // skeleton bone "Head" (look-at offset)
let pointer = null;               // last mouse position (client px), fine pointers only
let lookYaw = 0;                  // current look offset (radians), eased
let lookPitch = 0;
let dancedAtBottom = false;       // bottom-of-page dance done for this visit down
let quietTime = 0;                // seconds since the visitor last did anything
let x = 0;                        // robot position along the bottom edge
let targetX = 0;
let facing = 0;
let targetFacing = 0;
let afterEmote = null;            // what to do when a one-shot emote ends
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
  // 404: the page provides its own box; elsewhere, a band along the bottom.
  layer = stage || document.createElement('div');
  if (!stage) layer.className = 'robot-layer';
  layer.setAttribute('aria-hidden', 'true'); // decorative
  // The band lets clicks through; only this box, kept over the robot, takes
  // hover and clicks.
  hitbox = document.createElement('div');
  hitbox.className = 'robot-hitbox';
  layer.append(hitbox);
  if (!stage) document.body.append(layer);
}

function setVisible(on) {
  visible = on;
  document.documentElement.classList.toggle('robot-off', !on);
  if (toggle) toggle.setAttribute('aria-pressed', String(on));
  updateLoop();
}

// ---- Sizes (CSS pixels) -------------------------------------------------
const robotHeightPx = () => (stage ? 140 : phone.matches ? 75 : 110);
// Resting spot: just right of the desktop menu rail, or near the left edge
// (services.html has no rail; 404: the middle of its box).
const homeX = () => {
  if (stage) return layer.clientWidth / 2;
  if (calm) return phone.matches ? 50 : 80;
  return desktopNav.matches ? 150 : 50;
};

// ---- Lazy start ---------------------------------------------------------
async function start() {
  if (started) return;
  started = true;
  try {
    // Work split into short steps with a yield between each, so no single
    // task blocks the page for long (library, scene, model, shaders).
    THREE = await import(THREE_URL);
    await yieldToPage();
    setupScene();
    await yieldToPage();
    await loadRobot();
    if (stage) {                  // swap the static picture for the robot
      root.classList.add('robot-ready');
      resize();
    }
    await yieldToPage();
    // Compile the shaders before the first frame; compileAsync lets the
    // driver do it off the main thread where supported.
    if (renderer.compileAsync && renderer.extensions.has('KHR_parallel_shader_compile')) {
      await renderer.compileAsync(scene, camera);
    } else {
      renderer.compile(scene, camera);
    }
    await yieldToPage();
    enter();
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

  robot.traverse((o) => {
    if (o.morphTargetDictionary && 'Surprised' in o.morphTargetDictionary) faces.push(o);
    if (o.isBone && o.name === 'Head') headBone = o;
  });

  mixer = new THREE.AnimationMixer(robot);
  mixer.addEventListener('finished', onFinished);
  bindPointer();
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  placeRobot();
}

// Scale the model to the target height and stand it on the bottom edge.
function placeRobot() {
  if (!robot) return;
  const k = robotHeightPx() / modelHeight;
  robot.scale.setScalar(k);
  robot.position.set(x, 8 - robot.userData.minY * k, 0);
  placeHitbox();
}

// Walking speed scales with the robot's on-screen size (pixels per second).
const walkSpeed = () => robotHeightPx() * 0.75;

// Walkable stretch of the bottom edge: from the resting spot (clear of the
// desktop menu rail) to just before the voice/back-to-top buttons on the right.
const minX = () => homeX();
const maxX = () => (calm ? homeX() : Math.max(minX(), window.innerWidth - (phone.matches ? 100 : 270)));
const clampX = (v) => Math.min(maxX(), Math.max(minX(), v));
const rand = (a, b) => a + Math.random() * (b - a);

// ---- Behaviours ---------------------------------------------------------
// Entrance: walk in from the left edge, stop, wave, then idle. With reduced
// motion the robot simply stands at its spot.
function enter() {
  if (PAGE === 'lost') { lostScene(); return; }
  if (reduceMotion.matches || calm) {
    // Calm pages: appear at the spot and wave; reduced motion: just stand.
    x = homeX();
    facing = targetFacing = 0;
    play('Idle', 0);
    placeRobot();
    if (calm && !reduceMotion.matches) emote('Wave');
    else goIdle();
    return;
  }
  x = -robotHeightPx();           // just off screen
  targetX = homeX();
  facing = targetFacing = Math.PI / 2;
  play('Walking', 0);
  mode = 'entering';
  placeRobot();
}

// One-shot animation (wave, thumbs up...), then `then()` (default: idle).
function emote(name, then) {
  if (!actions[name]) return;
  mode = 'emote';
  afterEmote = then || (() => goIdle());
  play(name, 0.25, false);
}

// Stand facing the visitor, then stroll again after a short pause.
// Reduced motion: stay put for good.
function goIdle(pause = rand(3, 7)) {
  play('Idle');
  mode = 'idle';
  targetFacing = 0;
  idleTimer = reduceMotion.matches || calm ? Infinity : pause;
}

// Walk to a random spot at least a third of the stretch away, so each
// stroll is visible; the robot turns round at either end of the stretch.
function stroll() {
  const lo = minX();
  const hi = maxX();
  if (hi - lo < robotHeightPx()) { goIdle(); return; } // no room to walk
  let next = rand(lo, hi);
  if (Math.abs(next - x) < (hi - lo) / 3) next = x < (lo + hi) / 2 ? rand((lo + 2 * hi) / 3, hi) : rand(lo, (2 * lo + hi) / 3);
  targetX = next;
  targetFacing = targetX > x ? Math.PI / 2 : -Math.PI / 2;
  play(runTimer > 0 ? 'Running' : 'Walking');
  mode = 'walking';
}

// ---- Interactions -------------------------------------------------------
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Hover (mouse): stop, face the visitor, thumbs up or nod.
function onHover() {
  if (scripted || mode === 'entering' || mode === 'emote' || mode === 'sitting' || hoverCooldown > 0) return;
  hoverCooldown = 3;
  targetFacing = 0;
  emote(pick(['ThumbsUp', 'Yes']), () => goIdle(rand(2, 4)));
}

// Click / tap: a random emote with a surprised face.
function onPoke() {
  // Sitting: the click's pointerdown already makes it stand up; let it finish.
  if (scripted || mode === 'entering' || mode === 'sitting' || current === actions.Standing) return;
  targetFacing = 0;
  setMood('Surprised', 1);
  emote(pick(['Jump', 'Dance', 'Wave']), () => {
    setMood('Surprised', 0);
    goIdle(rand(2, 4));
  });
}

function bindPointer() {
  hitbox.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') onHover(); // touch has no hover: tap only
  });
  hitbox.addEventListener('click', onPoke);
}

// ---- Voice assistant ----------------------------------------------------
// voice.js fires 'voice:state' (idle | connecting | listening | speaking).
// When a conversation starts the robot waves; during it, it stays put facing
// the visitor and nods now and then while the AI speaks.
const inConversation = () => voiceState !== 'idle';

function onVoiceState(event) {
  const prev = voiceState;
  voiceState = event.detail.state;
  if (!robot) return;
  if (prev === 'idle' && voiceState === 'connecting') {
    targetFacing = 0;
    if (mode === 'sitting') emote('Standing', () => emote('Wave'));
    else emote('Wave');
  } else if (voiceState === 'speaking') {
    nodTimer = rand(1, 2);
  } else if (voiceState === 'idle' && mode === 'idle') {
    idleTimer = rand(2, 4);      // conversation over: stroll again soon
  }
}

document.addEventListener('voice:state', onVoiceState);

// ---- Bonus: look at the cursor, dance at the bottom of the page --------
// The head turns toward the mouse while the robot stands facing the visitor.
// The offset is applied in world space on top of the animated pose, and the
// pose is restored right after rendering, so it never accumulates.
const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)');
const tmpQ = { a: null, b: null, c: null, e: null, saved: null };

window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') pointer = { x: e.clientX, y: e.clientY };
}, { passive: true });
document.documentElement.addEventListener('pointerleave', () => { pointer = null; });

function updateLook(dt) {
  let yaw = 0;
  let pitch = 0;
  const canLook = headBone && pointer && fineHover.matches && !reduceMotion.matches &&
    (mode === 'idle' || mode === 'emote') && Math.abs(facing) < 0.3;
  if (canLook) {
    const box = layer.getBoundingClientRect();
    const headX = box.left + x;
    const headY = box.bottom - 8 - robotHeightPx() * 0.8;
    yaw = Math.max(-0.7, Math.min(0.7, (pointer.x - headX) / 500));
    pitch = Math.max(-0.35, Math.min(0.35, (pointer.y - headY) / 600));
  }
  const k = Math.min(1, dt * 6);           // ease toward the target
  lookYaw += (yaw - lookYaw) * k;
  lookPitch += (pitch - lookPitch) * k;
}

let savedHead = null;
function applyLook() {
  if (!headBone || (Math.abs(lookYaw) < 0.001 && Math.abs(lookPitch) < 0.001)) { savedHead = null; return; }
  if (!tmpQ.a) {
    tmpQ.a = new THREE.Quaternion(); tmpQ.b = new THREE.Quaternion(); tmpQ.c = new THREE.Quaternion();
    tmpQ.e = new THREE.Euler(); tmpQ.saved = new THREE.Quaternion();
  }
  savedHead = tmpQ.saved.copy(headBone.quaternion);
  // world-space rotation: yaw around world Y, pitch around world X
  tmpQ.a.setFromEuler(tmpQ.e.set(lookPitch, lookYaw, 0, 'YXZ'));
  headBone.parent.getWorldQuaternion(tmpQ.b);
  // local = parentWorld^-1 * offset * parentWorld * local
  tmpQ.c.copy(tmpQ.b).invert().multiply(tmpQ.a).multiply(tmpQ.b);
  headBone.quaternion.premultiply(tmpQ.c);
}

function restoreLook() {
  if (savedHead) headBone.quaternion.copy(savedHead);
  savedHead = null;
}

// Dance once when the visitor reaches the bottom of the page; re-armed after
// scrolling back up a bit. Calm pages (services.html): a wave instead, toward
// the coffee link and contacts.
let lastScrollY = window.scrollY;
let lastScrollT = performance.now();

function onScroll() {
  const doc = document.documentElement;
  measureScrollSpeed();
  const atBottom = window.scrollY + window.innerHeight >= doc.scrollHeight - 40;
  if (atBottom && !dancedAtBottom) {
    dancedAtBottom = true;
    if (robot && !scripted && !reduceMotion.matches && !inConversation() && mode !== 'entering' && mode !== 'emote' && mode !== 'sitting') {
      targetFacing = 0;
      emote(calm ? 'Wave' : 'Dance', () => goIdle(rand(2, 4)));
    }
  } else if (!atBottom && window.scrollY + window.innerHeight < doc.scrollHeight - 400) {
    dancedAtBottom = false;
  }
}
window.addEventListener('scroll', onScroll, { passive: true });

// ---- Rest: sit down when the visitor is inactive ------------------------
// After SIT_AFTER seconds without any activity (mouse, scroll, key, touch)
// the robot sits down at its spot; the next activity makes it stand up.
// Not with reduced motion (the robot stays still there anyway).
const SIT_AFTER = 30;
const ACTIVITY = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];

function sitDown() {
  if (!actions.Sitting || !actions.Standing) return;
  mode = 'sitting';
  // Three-quarter view toward the middle of the page: the seated pose reads
  // much better than straight on.
  targetFacing = x < window.innerWidth / 2 ? 0.6 : -0.6;
  play('Sitting', 0.5, false);    // one-shot that holds the seated pose
}

function onActivity() {
  quietTime = 0;
  if (robot && mode === 'sitting') emote('Standing', () => goIdle(rand(1, 3)));
}
ACTIVITY.forEach((t) => window.addEventListener(t, onActivity, { passive: true }));

// ---- Fast scroll: run ---------------------------------------------------
// Scrolling fast (more than RUN_SPEED px/s, measured over 50 ms or more)
// makes the robot run for a moment; it goes back to walking afterwards.
const RUN_SPEED = 2500;

function measureScrollSpeed() {
  const now = performance.now();
  const dt = (now - lastScrollT) / 1000;
  if (dt < 0.05) return;
  const speed = Math.abs(window.scrollY - lastScrollY) / dt;
  lastScrollY = window.scrollY;
  lastScrollT = now;
  if (dt < 0.5 && speed > RUN_SPEED) onFastScroll();
}

function onFastScroll() {
  if (!robot || calm || scripted || reduceMotion.matches || inConversation()) return;
  runTimer = 1.4;
  if (mode === 'idle') stroll();
}

// ---- Reactions to the page ----------------------------------------------
// One-shot emote facing the visitor; sitting: stand up first. Returns false
// when the robot can't react right now (not loaded, entering, 404 scene,
// conversation with the assistant).
function react(name, then) {
  if (!robot || scripted || mode === 'entering' || inConversation()) return false;
  targetFacing = 0;
  const done = then || (() => goIdle(rand(2, 4)));
  if (mode === 'sitting') emote('Standing', () => emote(name, done));
  else emote(name, done);
  return true;
}

// Back on the tab after a while: a wave.
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = performance.now(); return; }
  if (hiddenAt && performance.now() - hiddenAt > 5000) react('Wave');
  hiddenAt = 0;
});

// Theme and language switches (any page): dark mode surprises it, light mode
// gets a thumbs up, a new language gets a wave.
new MutationObserver((records) => {
  for (const r of records) {
    const value = root.getAttribute(r.attributeName);
    if (value === r.oldValue) continue;
    if (r.attributeName === 'data-theme') {
      if (react(value === 'dark' ? 'Jump' : 'ThumbsUp')) flashMood('Surprised', 1.6);
    } else if (r.attributeName === 'lang') {
      react('Wave');
    }
  }
}).observe(root, { attributes: true, attributeFilter: ['data-theme', 'lang'], attributeOldValue: true });

// index.html sections: thumbs up when the projects come into view, a wave at
// the contact form. Once each per visit.
if (PAGE === 'full' && 'IntersectionObserver' in window) {
  const sections = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting || mode === 'emote' || mode === 'sitting') continue;
      if (react(e.target.id === 'contact' ? 'Wave' : 'ThumbsUp')) sections.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -55% 0px' });   // section top reaches mid-screen
  ['projects', 'contact'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) sections.observe(el);
  });
}

// Contact form: shakes its head (angry) at an invalid field, thumbs up and a
// jump once the message is sent, a sad "no" if sending failed. index.html's
// form script fires 'contact:sent' / 'contact:error'.
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  let lastInvalid = 0;
  contactForm.addEventListener('invalid', () => {
    const now = performance.now();
    if (now - lastInvalid < 1500) return;       // one reaction per submit
    lastInvalid = now;
    if (react('No')) flashMood('Angry', 1.8);
  }, true);
}
document.addEventListener('contact:sent', () => {
  if (react('ThumbsUp', () => emote('Jump', () => goIdle(rand(2, 4))))) flashMood('Surprised', 1);
});
document.addEventListener('contact:error', () => {
  if (react('No')) flashMood('Sad', 2.5);
});

// ---- 404 scene ------------------------------------------------------------
// Stands a moment, looks surprised, falls over (sad face), lies there, gets
// back up (the fall played backwards) and waves toward the "back" button.
// Reduced motion: it just stands there looking a bit sad.
function lostScene() {
  x = homeX();
  facing = targetFacing = 0;
  play('Idle', 0);
  placeRobot();
  if (reduceMotion.matches) { setMood('Sad', 0.7); goIdle(); return; }
  scripted = true;
  mode = 'emote';
  const wait = (ms, fn) => setTimeout(fn, ms);
  wait(700, () => {
    setMood('Surprised', 1);
    wait(500, () => {
      setMood('Surprised', 0);
      setMood('Sad', 1);
      emote('Death', () => wait(1300, () => {
        emoteReverse('Death', () => {
          setMood('Sad', 0);
          scripted = false;
          emote('Wave', () => goIdle());
        });
      }));
    });
  });
}

// Play a one-shot backwards from its end (or from where it is held).
function emoteReverse(name, then) {
  const action = actions[name];
  if (!action) return;
  mode = 'emote';
  afterEmote = then;
  if (current !== action) {
    play(name, 0.25, false);
    action.time = action.getClip().duration;
  }
  action.enabled = true;
  action.paused = false;
  action.timeScale = -1;
}

// ---- Facial expressions (morph targets) -----------------------------------
function setMood(name, target) {
  (moods[name] || (moods[name] = { v: 0, t: 0 })).t = target;
}

function flashMood(name, seconds) {
  setMood(name, 1);
  setTimeout(() => setMood(name, 0), seconds * 1000);
}

// Ease every expression toward its target and apply it to the face meshes.
function updateMoods(dt) {
  for (const name in moods) {
    const m = moods[name];
    if (m.v === m.t) continue;
    m.v += Math.sign(m.t - m.v) * Math.min(Math.abs(m.t - m.v), dt * 5);
    for (const mesh of faces) {
      const i = mesh.morphTargetDictionary[name];
      if (i !== undefined) mesh.morphTargetInfluences[i] = m.v;
    }
  }
}

// Keep the hit box over the robot (it is narrower than tall).
function placeHitbox() {
  if (!hitbox) return;
  const h = robotHeightPx();
  const w = h * 0.7;
  hitbox.style.width = w + 'px';
  hitbox.style.height = h + 'px';
  hitbox.style.transform = `translateX(${Math.round(x - w / 2)}px)`;
}

function onFinished(event) {
  if (event.action !== current || mode !== 'emote') return;
  const next = afterEmote;
  afterEmote = null;
  if (next) next();
}

// Turn smoothly toward targetFacing (shortest way round).
function turn(dt) {
  let d = targetFacing - facing;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  const step = Math.min(Math.abs(d), dt * 7);
  facing += Math.sign(d) * step;
}

function update(dt) {
  if (mode === 'entering') {
    x = Math.min(targetX, x + walkSpeed() * dt);
    if (x >= targetX) {
      targetFacing = 0;           // turn to the visitor
      emote('Wave');
    }
  } else if (mode === 'walking' && inConversation()) {
    goIdle();
  } else if (mode === 'walking') {
    // Wait until it has turned to face the way it goes, then move.
    const gait = runTimer > 0 ? 'Running' : 'Walking';
    if (actions[gait] && current !== actions[gait]) play(gait, 0.25);
    if (Math.abs(facing - targetFacing) < 0.3) {
      const dir = Math.sign(targetX - x);
      x += dir * walkSpeed() * (runTimer > 0 ? 2.4 : 1) * dt;
      if ((dir > 0 && x >= targetX) || (dir < 0 && x <= targetX) || dir === 0) {
        x = targetX;
        goIdle();
      }
    }
  } else if (mode === 'idle') {
    if (inConversation()) {
      // Stay with the visitor; nod while the AI talks (not with reduced motion).
      targetFacing = 0;
      if (voiceState === 'speaking' && !reduceMotion.matches) {
        nodTimer -= dt;
        if (nodTimer <= 0) {
          nodTimer = rand(3, 5);
          emote('Yes');
        }
      }
    } else if (quietTime >= SIT_AFTER && !reduceMotion.matches) {
      sitDown();
    } else {
      idleTimer -= dt;
      if (idleTimer <= 0) stroll();
    }
  }
  quietTime = inConversation() ? 0 : quietTime + dt;
  turn(dt);
  hoverCooldown = Math.max(0, hoverCooldown - dt);
  runTimer = Math.max(0, runTimer - dt);
  updateMoods(dt);
  if (robot) {
    robot.rotation.y = facing;
    robot.position.x = x;
  }
  placeHitbox();
}

// Cross-fade to an animation: a looping state (Idle, Walking...) or, with
// loop = false, a one-shot that holds its last pose until something else plays.
function play(name, fade = 0.4, loop = true) {
  const next = actions[name];
  if (!next) return;
  next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  next.clampWhenFinished = !loop;
  next.timeScale = 1;
  if (next === current) {
    if (!loop) next.reset().play(); // same emote again: restart it
    return;
  }
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
  // Keep the robot inside the walkable stretch when the window changes size.
  if (mode !== 'entering') {
    x = clampX(x);
    targetX = clampX(targetX);
  }
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
  update(dt);
  if (mixer) mixer.update(dt);
  updateLook(dt);
  if (robot) robot.updateMatrixWorld(true);
  applyLook();
  render();
  restoreLook();
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

const yieldToPage = () => new Promise((resolve) => setTimeout(resolve, 0));

// Start the robot once the visitor first interacts with the page (scroll,
// mouse, touch, key), or at the latest LATE_START_MS after the page has
// loaded - then still wait for an idle moment. Keeps the first seconds of
// the visit, when the page is being read, completely free of 3D work.
const LATE_START_MS = 8000;
const FIRST_INTERACTION = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];

function whenReady(fn) {
  let fired = false;
  let timer = 0;
  const go = () => {
    if (fired) return;
    fired = true;
    clearTimeout(timer);
    FIRST_INTERACTION.forEach((t) => window.removeEventListener(t, go));
    if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2000 });
    else setTimeout(fn, 200);
  };
  const arm = () => {
    FIRST_INTERACTION.forEach((t) => window.addEventListener(t, go, { passive: true, once: true }));
    timer = setTimeout(go, LATE_START_MS);
  };
  if (document.readyState === 'complete') arm();
  else window.addEventListener('load', arm, { once: true });
}

// ---- Init ---------------------------------------------------------------
if (PAGE === 'lost') {
  // 404: no toggle (the visitor's choice from the other pages still counts);
  // the robot is the page's picture, so it starts as soon as the page loads.
  if (stage && readChoice() && webglAvailable()) {
    createLayer();
    const go = () => start();
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  }
} else if (toggle && !tooSmall.matches && webglAvailable()) {
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

  if (on) whenReady(start);
}

