// Hard, silhouette-defining parts that the voxel bake can't resolve:
// horns, crown/jaw spikes, teeth, claws, fingers and eyeballs.
import * as THREE from 'three';
import { sweep, curveRings, spike } from '../core/geom.js';
import { EYE } from './anatomy.js';
import { raySurface } from '../core/sdf.js';

export function fromGeometry(geo) {
  const pos = geo.attributes.position.array;
  const uv = geo.attributes.uv ? geo.attributes.uv.array : null;
  const nrm = geo.attributes.normal ? geo.attributes.normal.array : null;
  const idx = geo.index ? Array.from(geo.index.array) : [...Array(pos.length / 3).keys()];
  return { positions: pos, indices: idx, uvs: uv, normals: nrm };
}

/** The big rear-sweeping horn pair. uv.y carries the 0..1 run for shader banding. */
export function buildHorn(side, field) {
  const s = side;
  const pts = [
    [s * 0.0555, 1.7285, 0.006],
    [s * 0.0745, 1.7565, -0.036],
    [s * 0.0885, 1.7715, -0.092],
    [s * 0.0955, 1.7795, -0.15],
    [s * 0.0935, 1.7815, -0.201],
  ];
  const root = seat(field, pts[0], [s * 0.55, 0.72, 0.2], 0.024);
  pts[0] = root;
  const rings = curveRings(pts, (t) => {
    const base = 0.0298 * Math.pow(1 - t, 0.6) + 0.0018;
    const ridge = 1 + 0.062 * Math.sin(t * 40) * Math.min(1, t * 5) * (1 - t);
    return base * ridge;
  }, 34, {
    tension: 0.5,
    profile: (a) => 1 + 0.13 * Math.cos(2 * a) - 0.05 * Math.cos(a),
  });
  return sweep(rings, { sides: 18, capEnd: false });
}

/**
 * Seat a feature on the skin: march out along `dir` to the real surface, then sink
 * the base back in by `inset`. Without this, blend-inflated surfaces swallow the
 * spikes and the horns look like stubs.
 */
function seat(field, p, dir, inset = 0.008) {
  if (!field) return p;
  const hit = raySurface(field, p, dir, { start: -0.09, max: 0.14 });
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  return [hit[0] - (dir[0] / l) * inset, hit[1] - (dir[1] / l) * inset, hit[2] - (dir[2] / l) * inset];
}

/** Cream crown spikes fanned across the top-rear of the skull. */
export function buildCrownSpikes(field) {
  const out = [];
  const defs = [
    [-0.0525, 1.7495, -0.02, 0.032, 0.0155],
    [-0.0215, 1.7595, -0.026, 0.044, 0.0178],
    [0.0215, 1.7595, -0.026, 0.044, 0.0178],
    [0.0525, 1.7495, -0.02, 0.032, 0.0155],
    [-0.033, 1.7305, -0.072, 0.03, 0.0135],
    [0.033, 1.7305, -0.072, 0.03, 0.0135],
  ];
  for (const [x, y, z, len, r] of defs) {
    const dir = [x * 5.5, 0.86, -0.5];
    out.push(spike(seat(field, [x, y, z], dir, 0.01), dir, len, r, {
      taper: 0.55, bend: [0, 0.004, -0.014], sides: 10, steps: 8,
    }));
  }
  return out;
}

/** Small spikes along the jaw line, cheek and the back of the neck. */
export function buildJawSpikes(field) {
  const out = [];
  for (const s of [1, -1]) {
    const jaw = [
      [s * 0.0635, 1.6155, 0.05, 0.031, 0.0098],
      [s * 0.058, 1.6095, 0.1, 0.027, 0.0086],
      [s * 0.0485, 1.6065, 0.146, 0.022, 0.007],
    ];
    for (const [x, y, z, len, r] of jaw) {
      const dir = [s * 0.45, -0.42, -0.79];
      out.push(spike(seat(field, [x, y, z], dir), dir, len, r, { taper: 0.7, sides: 8, steps: 6 }));
    }
    // cheek / jaw-hinge spikes
    for (const [p, dir, len, r] of [
      [[s * 0.0805, 1.6555, -0.015], [s * 0.62, 0.05, -0.78], 0.038, 0.0115],
      [[s * 0.076, 1.6265, 0.008], [s * 0.6, -0.35, -0.72], 0.031, 0.0098],
    ]) {
      out.push(spike(seat(field, p, dir), dir, len, r, { taper: 0.7, sides: 8, steps: 6 }));
    }
  }
  // dorsal neck ridge
  const neck = [
    [0, 1.6015, -0.081, 0.022, 0.0092],
    [0, 1.5595, -0.092, 0.02, 0.0084],
    [0, 1.5165, -0.095, 0.017, 0.0074],
    [0, 1.4735, -0.091, 0.014, 0.0064],
  ];
  for (const [x, y, z, len, r] of neck) {
    const dir = [0, 0.35, -0.94];
    out.push(spike(seat(field, [x, y, z], dir), dir, len, r, { taper: 0.75, sides: 8, steps: 6 }));
  }
  return out;
}

/** Teeth along the closed mouth line, plus two lower tusks. */
export function buildTeeth() {
  const out = [];
  for (const s of [1, -1]) {
    // lower tusk poking up outside the lip
    out.push(spike([s * 0.0345, 1.6095, 0.1585], [s * 0.15, 0.96, 0.22], 0.0072, 0.0030,
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
