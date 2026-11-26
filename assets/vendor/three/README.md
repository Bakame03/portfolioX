# three.js subset for the portfolio robot

`three-robot.min.js` is three.js **r187 (npm `three@0.187.0`)**, MIT licence
(see `LICENSE`), bundled and minified into one ES module that exports only
what `assets/js/robot.js` uses (renderer, scene, lights, AnimationMixer,
GLTFLoader...). No build step in this repo: to regenerate, list the exports in
an entry file and run

    npx esbuild entry.js --bundle --format=esm --minify --legal-comments=eof --outfile=three-robot.min.js

with `three/build/three.module.js` and `three/examples/jsm/loaders/GLTFLoader.js`
as sources (rewrite their `from 'three'` imports to the module file first).
