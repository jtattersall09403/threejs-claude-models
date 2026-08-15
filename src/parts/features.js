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
    [s * 0.0555, 1.7255, 0.004],
    [s * 0.0765, 1.7695, -0.03],
    [s * 0.0905, 1.8005, -0.082],
    [s * 0.0975, 1.8235, -0.141],
    [s * 0.0955, 1.8425, -0.194],
  ];
  const root = seat(field, pts[0], [s * 0.55, 0.72, 0.2], 0.024);
  pts[0] = root;
  const rings = curveRings(pts, (t) => {
    const base = 0.0232 * Math.pow(1 - t, 0.58) + 0.0014;
    // ridging must run the FULL length; a (1-t) falloff leaves the horn a smooth tube
    const ridge = 1 + 0.14 * Math.sin(t * 24) * Math.min(1, t * 4);
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
    [-0.0375, 1.7445, -0.022, 0.038, 0.0102],
    [-0.0135, 1.7515, -0.028, 0.050, 0.0118],
    [0.0135, 1.7515, -0.028, 0.050, 0.0118],
    [0.0375, 1.7445, -0.022, 0.038, 0.0102],
    [-0.0245, 1.7285, -0.070, 0.034, 0.0092],
    [0.0245, 1.7285, -0.070, 0.034, 0.0092],
  ];
  for (const [x, y, z, len, r] of defs) {
    const dir = [x * 5.5, 0.86, -0.5];
    out.push(spike(seat(field, [x, y, z], dir, 0.004), dir, len, r, {
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
      [s * 0.0485, 1.6005, 0.046, 0.042, 0.0080],
      [s * 0.0425, 1.5965, 0.092, 0.036, 0.0070],
      [s * 0.0345, 1.5945, 0.134, 0.030, 0.0058],
    ];
    for (const [x, y, z, len, r] of jaw) {
      const dir = [s * 0.42, -0.62, -0.66];
      out.push(spike(seat(field, [x, y, z], dir, 0.004), dir, len, r, { taper: 0.7, sides: 8, steps: 6 }));
    }
    // cheek / jaw-hinge spikes
    for (const [p, dir, len, r] of [
      [[s * 0.0685, 1.6435, -0.016], [s * 0.62, -0.1, -0.78], 0.023, 0.0084],
      [[s * 0.0645, 1.6165, 0.008], [s * 0.6, -0.4, -0.7], 0.019, 0.0070],
    ]) {
      out.push(spike(seat(field, p, dir), dir, len, r, { taper: 0.7, sides: 8, steps: 6 }));
    }
  }
  return out;
}

/** No teeth protrude in the references — the jaw is closed and shows only a crease. */
export function buildTeeth() {
  return [];
}

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];
const FINGER_R = { thumb: 0.0150, index: 0.0128, middle: 0.0134, ring: 0.0122, pinky: 0.0104 };
// relaxed curl: each joint bends a little forward, so the hand is not a garden fork
const FINGER_CURL = { thumb: 0.006, index: 0.012, middle: 0.014, ring: 0.012, pinky: 0.009 };

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
      const root = [p1[0] + (p1[0] - p2[0]) * 0.95, p1[1] + (p1[1] - p2[1]) * 0.95, p1[2] + (p1[2] - p2[2]) * 0.95];
      const c = FINGER_CURL[name];
      const curl = (q, amt) => [q[0], q[1], q[2] + amt];
      const rings = curveRings([root, p1, curl(p2, c), curl(p3, c * 2.4)], (t) => {
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
        geom: spike(clawBase, d, 0.012, r * 0.62, {
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
