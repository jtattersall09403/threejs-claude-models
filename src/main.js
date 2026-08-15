import * as THREE from 'three';
import { createViewer } from './scene/viewer.js';
import { buildArgonian } from './model.js';

const errors = [];
window.__errors = errors;
addEventListener('error', (e) => errors.push(String(e.message)));
addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));

const container = document.getElementById('app');
const status = document.getElementById('status');
const hud = document.getElementById('hud');

function setStatus(text) {
  if (status) status.textContent = text;
}

function boot() {
  const t0 = performance.now();
  const viewer = createViewer(container);

  let model;
  try {
    model = buildArgonian({ log: setStatus });
  } catch (err) {
    errors.push(String(err && err.stack ? err.stack : err));
    setStatus('failed: ' + err);
    throw err;
  }

  viewer.scene.add(model.group);

  // Animation-ready: a mixer bound to the rig, with no clips yet.
  const mixer = new THREE.AnimationMixer(model.group);
  viewer.updaters.push((dt) => mixer.update(dt));

  window.argonian = {
    ...model,
    ...viewer,
    mixer,
    THREE,
    bone: (name) => model.rig.byName.get(name),
    boneNames: model.rig.bones.map((b) => b.name),
  };
  window.__setCamera = viewer.setCamera;
  window.__frameStats = () => viewer.frameStats(model.meshes.skin);

  const ms = Math.round(performance.now() - t0);
  const tris = Math.round(model.stats.triangles / 1000);
  if (status) status.remove();
  if (hud) hud.textContent = `${tris}k tris · built in ${ms} ms · drag to orbit · scroll to zoom`;

  viewer.setCamera(18, 6, 3.05, 1.02);
  requestAnimationFrame(() => { window.__ready = true; });
}

// presets
addEventListener('keydown', (e) => {
  if (!window.__setCamera) return;
  if (e.key === '1') window.__setCamera(18, 6, 3.05, 1.02);
  if (e.key === '2') window.__setCamera(12, 4, 0.62, 1.63, 26);
  if (e.key === '3') window.__setCamera(180, 8, 3.05, 1.02);
});

boot();
