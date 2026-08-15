// Hard, silhouette-defining parts that the voxel bake can't resolve:
// horns, crown/jaw spikes, teeth, claws, fingers and eyeballs.
import * as THREE from 'three';
import { sweep, curveRings, spike } from '../core/geom.js';
import { EYE } from './anatomy.js';

export function fromGeometry(geo) {
  const pos = geo.attributes.position.array;
  const uv = geo.attributes.uv ? geo.attributes.uv.array : null;
  const nrm = geo.attributes.normal ? geo.attributes.normal.array : null;
  const idx = geo.index ? Array.from(geo.index.array) : [...Array(pos.length / 3).keys()];
  return { positions: pos, indices: idx, uvs: uv, normals: nrm };
}

/** The big rear-sweeping horn pair. uv.y carries the 0..1 run for shader banding. */
export function buildHorn(side) {
  const s = side;
  const pts = [
    [s * 0.0575, 1.6835, 0.012],
    [s * 0.0795, 1.7105, -0.033],
    [s * 0.0935, 1.7255, -0.094],
    [s * 0.0965, 1.7325, -0.155],
    [s * 0.0895, 1.7365, -0.2],
  ];
  const rings = curveRings(pts, (t) => {
    const base = 0.0275 * Math.pow(1 - t, 0.8) + 0.0022;
    const ridge = 1 + 0.045 * Math.sin(t * 34) * Math.min(1, t * 4) * (1 - t);
    return base * ridge;
  }, 34, {
    tension: 0.5,
    profile: (a) => 1 + 0.1 * Math.cos(2 * a) - 0.04 * Math.cos(a),
  });
  return sweep(rings, { sides: 18, capEnd: false });
}

/** Cream crown spikes fanned across the top-rear of the skull. */
export function buildCrownSpikes() {
  const out = [];
  const defs = [
    [-0.052, 1.6935, -0.012, 0.033, 0.0105],
    [-0.0225, 1.7, -0.017, 0.046, 0.0125],
    [0.0225, 1.7, -0.017, 0.046, 0.0125],
    [0.052, 1.6935, -0.012, 0.033, 0.0105],
    [-0.036, 1.6795, -0.062, 0.03, 0.0095],
    [0.036, 1.6795, -0.062, 0.03, 0.0095],
  ];
  for (const [x, y, z, len, r] of defs) {
    out.push(spike([x, y, z], [x * 5.5, 0.86, -0.5], len, r, {
      taper: 0.72, bend: [0, 0.004, -0.012], sides: 9, steps: 8,
    }));
  }
  return out;
}

/** Small spikes along the jaw line, cheek and the back of the neck. */
export function buildJawSpikes() {
  const out = [];
  for (const s of [1, -1]) {
    const jaw = [
      [s * 0.062, 1.5945, 0.052, 0.03, 0.0092],
      [s * 0.0565, 1.5885, 0.104, 0.026, 0.0082],
      [s * 0.0475, 1.5855, 0.152, 0.021, 0.0068],
    ];
    for (const [x, y, z, len, r] of jaw) {
      out.push(spike([x, y, z], [s * 0.45, -0.42, -0.79], len, r, { taper: 0.7, sides: 8, steps: 6 }));
    }
    // cheek / jaw-hinge spikes
    out.push(spike([s * 0.0765, 1.6155, -0.005], [s * 0.62, 0.05, -0.78], 0.035, 0.0105,
      { taper: 0.7, sides: 8, steps: 6 }));
    out.push(spike([s * 0.0715, 1.5915, 0.018], [s * 0.6, -0.35, -0.72], 0.029, 0.0092,
      { taper: 0.7, sides: 8, steps: 6 }));
  }
  // dorsal neck ridge
  const neck = [
    [0, 1.5715, -0.072, 0.021, 0.0088],
    [0, 1.5285, -0.081, 0.019, 0.008],
    [0, 1.4855, -0.083, 0.016, 0.0072],
    [0, 1.4425, -0.079, 0.013, 0.0062],
  ];
  for (const [x, y, z, len, r] of neck) {
    out.push(spike([x, y, z], [0, 0.35, -0.94], len, r, { taper: 0.75, sides: 8, steps: 6 }));
  }
  return out;
}

/** Teeth along the closed mouth line, plus two lower tusks. */
export function buildTeeth() {
  const out = [];
  for (const s of [1, -1]) {
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const z = 0.075 + t * 0.148;
      const x = s * (0.0505 - t * 0.0185);
      const len = 0.011 - t * 0.0035;
      out.push(spike([x, 1.6015, z], [s * 0.18, -1, 0.04], len, 0.0043,
        { taper: 0.6, sides: 6, steps: 4 }));
    }
    // lower tusk poking up outside the lip
    out.push(spike([s * 0.0405, 1.5945, 0.196], [s * 0.16, 0.97, 0.18], 0.021, 0.0058,
      { taper: 0.62, sides: 7, steps: 5 }));
  }
  return out;
}

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];
const FINGER_R = { thumb: 0.0145, index: 0.0125, middle: 0.013, ring: 0.0118, pinky: 0.0102 };

/** Fingers swept along their bones, each finished with a claw. */
export function buildFingers(rig) {
  const parts = [];
  for (const sfx of ['.L', '.R']) {
    for (const name of FINGERS) {
      const p1 = rig.restPos.get(name + '1' + sfx);
      const p2 = rig.restPos.get(name + '2' + sfx);
      const p3 = rig.restPos.get(name + '3' + sfx);
      const r = FINGER_R[name];
      // start inside the palm so the join is hidden
      const root = [p1[0] + (p1[0] - p2[0]) * 0.7, p1[1] + (p1[1] - p2[1]) * 0.7, p1[2] + (p1[2] - p2[2]) * 0.7];
      const rings = curveRings([root, p1, p2, p3], (t) => {
        const taper = 1 - 0.32 * t;
        const knuckle = 1 + 0.1 * Math.exp(-Math.pow((t - 0.34) * 7, 2)) + 0.08 * Math.exp(-Math.pow((t - 0.66) * 8, 2));
        return r * taper * knuckle;
      }, 16, { tension: 0.4 });
      parts.push({ geom: sweep(rings, { sides: 12, capEnd: false }), region: 'skin' });

      // claw
      const dir = [p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2]];
      const l = Math.hypot(...dir) || 1;
      const d = [dir[0] / l, dir[1] / l, dir[2] / l];
      const clawBase = [p3[0] - d[0] * 0.006, p3[1] - d[1] * 0.006, p3[2] - d[2] * 0.006];
      parts.push({
        geom: spike(clawBase, d, 0.019, r * 0.72, {
          taper: 0.62, sides: 8, steps: 7,
          bend: [d[2] * 0.004, -0.007, -d[0] * 0.004],
        }),
        region: 'horn',
      });
    }
  }
  return parts;
}

/** Eyeballs: slightly flattened spheres; iris + slit pupil are drawn in the shader. */
export function buildEyes() {
  const out = [];
  for (const s of [1, -1]) {
    const g = new THREE.SphereGeometry(EYE.r, 26, 20);
    g.scale(1, 1, 0.92);
    g.translate(s * EYE.c[0], EYE.c[1], EYE.c[2]);
    out.push(fromGeometry(g));
  }
  return out;
}
