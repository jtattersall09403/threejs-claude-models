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

// The horn pair. The reference horn is a LONG, SLENDER, sharply-tapered spar that
// sweeps up and back well clear of the skull — not a stubby tusk. Curve and radius
// live at module scope because the metal cuff is swept along the same pair.
const HORN_STEPS = 46;
const HORN_DIR = (s) => [s * 0.55, 0.72, 0.2];

function hornPts(s) {
  return [
    [s * 0.0500, 1.7255, 0.004],
    [s * 0.0645, 1.7815, -0.020],
    [s * 0.0735, 1.8395, -0.062],
    [s * 0.0775, 1.8905, -0.112],
    [s * 0.0765, 1.9265, -0.162],
    [s * 0.0735, 1.9435, -0.202],
  ];
}

// Fine ring ridging concentrated near the base and gone by mid-length, as in the
// reference. Trap #10: keep the per-ring phase step under a radian — 38 rad over
// 46 rings is 0.84, so it reads as ridging rather than aliasing into a rope.
const hornRadius = (t) => (0.0158 * Math.pow(1 - t, 0.62) + 0.0006)
  * (1 + 0.055 * Math.sin(t * 38) * Math.max(0, 1 - t * 1.6));

function hornRings(side, field) {
  const pts = hornPts(side);
  pts[0] = seat(field, pts[0], HORN_DIR(side), 0.024);
  return curveRings(pts, hornRadius, HORN_STEPS, { tension: 0.5 });
}

/** The big rear-sweeping horn pair. uv.y carries the 0..1 run for shader banding. */
export function buildHorn(side, field) {
  const pts = hornPts(side);
  pts[0] = seat(field, pts[0], HORN_DIR(side), 0.024);
  const rings = curveRings(pts, hornRadius, HORN_STEPS, {
    tension: 0.5,
    profile: (a) => 1 + 0.10 * Math.cos(2 * a) - 0.04 * Math.cos(a),
  });
  return sweep(rings, { sides: 18, capEnd: false });
}

/**
 * The metal cuff clamped around each horn. Its own part so the horn shader can pick
 * it out by region and shade it as tarnished metal rather than keratin.
 */
export function buildHornCuff(side, field) {
  const full = hornRings(side, field);
  const a = Math.round(HORN_STEPS * 0.35), b = Math.round(HORN_STEPS * 0.42);
  const rings = full.slice(a, b + 1).map((ring, i, arr) => {
    const u = i / (arr.length - 1);
    // barrelled slightly, so it reads as a band clamped on rather than a swelling
    return { p: ring.p, r: ring.r * (1.20 + 0.06 * Math.sin(u * Math.PI)) };
  });
  return sweep(rings, { sides: 18 });
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
  // A low crest, not a crown. In the reference these are modest nubs behind the
  // brow; at the previous size they competed with the horns and read as antlers.
  const defs = [
    [-0.0305, 1.7485, -0.026, 0.0225, 0.0072],
    [-0.0102, 1.7545, -0.032, 0.0285, 0.0082],
    [0.0102, 1.7545, -0.032, 0.0285, 0.0082],
    [0.0305, 1.7485, -0.026, 0.0225, 0.0072],
    [-0.0200, 1.7315, -0.072, 0.0195, 0.0064],
    [0.0200, 1.7315, -0.072, 0.0195, 0.0064],
  ];
  for (const [x, y, z, len, r] of defs) {
    const dir = [x * 5.5, 0.86, -0.5];
    out.push(spike(seat(field, [x, y, z], dir, 0.004), dir, len, r, {
      taper: 0.55, bend: [0, 0.004, -0.014], sides: 10, steps: 8,
    }));
  }
  return out;
}

/** Small spikes along the jaw line, cheek, brow and the back of the neck. */
export function buildJawSpikes(field) {
  const out = [];
  for (const s of [1, -1]) {
    // A continuous row running the length of the jaw. The references show four
    // clearly separated spikes a side, angled out and down so they break the
    // silhouette from the front as well as in profile.
    const jaw = [
      [s * 0.0385, 1.6020, 0.018, 0.0335, 0.0092],
      [s * 0.0360, 1.5975, 0.058, 0.0305, 0.0084],
      [s * 0.0315, 1.5940, 0.096, 0.0265, 0.0074],
      [s * 0.0255, 1.5920, 0.130, 0.0210, 0.0060],
    ];
    for (const [x, y, z, len, r] of jaw) {
      // mostly LATERAL. Angled down-and-back they seated on the jaw underside and
      // were invisible from every angle that matters.
      const dir = [s * 0.88, -0.40, -0.26];
      out.push(spike(seat(field, [x, y, z], dir, 0.004), dir, len, r, { taper: 0.7, sides: 8, steps: 6 }));
    }
    // cheek / jaw-hinge spikes
    for (const [p, dir, len, r] of [
      [[s * 0.0605, 1.6395, -0.016], [s * 0.62, -0.1, -0.78], 0.026, 0.0088],
      [[s * 0.0570, 1.6110, 0.008], [s * 0.6, -0.4, -0.7], 0.022, 0.0074],
    ]) {
      out.push(spike(seat(field, p, dir), dir, len, r, { taper: 0.7, sides: 8, steps: 6 }));
    }
    // brow scutes: three flat claw-like plates lying back along the brow ridge,
    // one of the most recognisable markings on the reference face
    for (const [p, dir, len, r] of [
      [[s * 0.0300, 1.7305, 0.0460], [s * 0.26, 0.34, 0.90], 0.030, 0.0055],
      [[s * 0.0435, 1.7285, 0.0390], [s * 0.48, 0.30, 0.82], 0.027, 0.0051],
      [[s * 0.0545, 1.7220, 0.0285], [s * 0.70, 0.26, 0.66], 0.023, 0.0046],
    ]) {
      out.push(spike(seat(field, p, dir, 0.003), dir, len, r, { taper: 0.85, sides: 8, steps: 6 }));
    }
  }
  return out;
}

/** No teeth protrude in the references — the jaw is closed and shows only a crease. */
export function buildTeeth() {
  return [];
}

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];
const FINGER_R = { thumb: 0.0132, index: 0.0112, middle: 0.0118, ring: 0.0106, pinky: 0.0092 };
// Relaxed curl: each joint bends forward, so the hand is not a garden fork. Whatever
// this is, the claw MUST be placed off the curled tip — see buildFingers.
const FINGER_CURL = { thumb: 0.010, index: 0.018, middle: 0.020, ring: 0.018, pinky: 0.014 };

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
      // Curled joint positions are computed ONCE and shared with the claw below.
      // Deriving the claw from the uncurled p2/p3 leaves it hanging in mid-air a
      // couple of centimetres off the fingertip.
      const p2c = curl(p2, c);
      const p3c = curl(p3, c * 2.4);
      const rings = curveRings([root, p1, p2c, p3c], (t) => {
        const taper = 1 - 0.32 * t;
        const knuckle = 1 + 0.1 * Math.exp(-Math.pow((t - 0.34) * 7, 2)) + 0.08 * Math.exp(-Math.pow((t - 0.66) * 8, 2));
        return r * taper * knuckle;
      }, 16, { tension: 0.4 });
      parts.push({ geom: sweep(rings, { sides: 12, capEnd: false }), region: 'skin' });

      // claw, seated on the CURLED tip
      const dir = [p3c[0] - p2c[0], p3c[1] - p2c[1], p3c[2] - p2c[2]];
      const l = Math.hypot(...dir) || 1;
      const d = [dir[0] / l, dir[1] / l, dir[2] / l];
      const clawBase = [p3c[0] - d[0] * 0.008, p3c[1] - d[1] * 0.008, p3c[2] - d[2] * 0.008];
      parts.push({
        geom: spike(clawBase, d, 0.0095, r * 0.66, {
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
