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
    debugMasks: (n) => {
      const u = model.materials.skin.userData.shader.uniforms.uDebug;
      u.value = n;
    },
  };
  window.__setCamera = viewer.setCamera;
  window.__frameStats = () => viewer.frameStats(model.meshes.skin);

  // Winding audit. Inverted triangles cull the front faces, so you see the inside
  // of the far surface — it reads as translucency, not as an obvious error.
  // tools/capture.mjs fails the run if this regresses.
  window.__meshAudit = () => Object.entries(model.meshes).map(([name, m]) => {
    const g = m.geometry, pos = g.attributes.position.array;
    const idx = g.index.array, nrm = g.attributes.normal.array;
    let volume = 0, agree = 0, total = 0;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      const ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
      const bx = pos[b], by = pos[b + 1], bz = pos[b + 2];
      const cx = pos[c], cy = pos[c + 1], cz = pos[c + 2];
      volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
      const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
      const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
      const fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x;
      if (fx * nrm[a] + fy * nrm[a + 1] + fz * nrm[a + 2] > 0) agree++;
      total++;
    }
    return { name, volume, agree: agree / total, doubleSided: m.material.side !== THREE.FrontSide };
  });

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
