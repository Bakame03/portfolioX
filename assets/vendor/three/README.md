# three.js subset for the portfolio robot

`three-robot.min.js` is three.js **r187 (npm `three@0.187.0`)**, MIT licence
(see `LICENSE`), bundled and minified into one ES module that exports only
what `assets/js/robot.js` and `assets/js/hero-gem.js` use (renderer, scene,
lights, AnimationMixer, GLTFLoader, icosahedron mesh...). No build step in this repo: to regenerate, list the exports in
an entry file and run

    npx esbuild entry.js --bundle --format=esm --minify --legal-comments=eof --outfile=three-robot.min.js

with `three/build/three.module.js` and `three/examples/jsm/loaders/GLTFLoader.js`
as sources (rewrite their `from 'three'` imports to the module file first).

Current entry file:

    export {
      WebGLRenderer, Scene, PerspectiveCamera, OrthographicCamera, HemisphereLight, DirectionalLight,
      AnimationMixer, LoopOnce, LoopRepeat, Timer, Vector2, Vector3, Quaternion, Euler,
      MathUtils, Raycaster, Box3, SRGBColorSpace, REVISION,
      Group, Mesh, IcosahedronGeometry, MeshStandardMaterial, EdgesGeometry, LineSegments, LineBasicMaterial, Color
    } from './package/build/three.module.js';
    export { GLTFLoader } from './package/examples/jsm/loaders/GLTFLoader.js';
