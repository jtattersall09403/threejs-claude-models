// Skyrim "farm clothes": coarse tunic over an undershirt, braided shoulder strap,
// knotted waist belt, trousers, wrist wraps and worn shoes.
// Garments are separate SDF bakes (one per material) plus a few swept parts.
import { Field, capsule, ellipsoid, roundBox } from '../core/sdf.js';
import { sweep, curveRings } from '../core/geom.js';
import { REGION } from './regions.js';

function undershirtField() {
  const f = new Field();
  const K = 0.05;
  f.add(ellipsoid([0, 1.228, 0.008], [0.161, 0.128, 0.117], { k: K }));
  f.add(ellipsoid([0, 1.308, 0.0], [0.154, 0.088, 0.109], { k: K }));
  f.add(capsule([-0.152, 1.354, -0.002], [0.152, 1.354, -0.002], 0.086, 0.086, { k: 0.055 }));
  f.add(ellipsoid([0, 1.336, -0.055], [0.117, 0.078, 0.062], { k: 0.055 }));
  f.add(ellipsoid([0, 1.16, 0.012], [0.14, 0.075, 0.104], { k: K }));
  // collar opening
  f.sub(capsule([0, 1.33, -0.01], [0, 1.5, 0.012], 0.088, 0.085, { k: 0.02 }));
  return { field: f, bounds: [-0.22, 1.05, -0.2, 0.22, 1.45, 0.2], cell: 0.006, region: REGION.UNDERSHIRT };
}

function tunicField() {
  const f = new Field();
  const K = 0.055;
  // torso shell
  f.add(ellipsoid([0, 1.235, 0.008], [0.176, 0.135, 0.13], { k: K }));
  f.add(ellipsoid([0, 1.315, 0.0], [0.166, 0.095, 0.12], { k: K }));
  f.add(capsule([-0.158, 1.358, -0.002], [0.158, 1.358, -0.002], 0.095, 0.095, { k: 0.06 }));
  f.add(ellipsoid([0, 1.34, -0.058], [0.126, 0.085, 0.07], { k: 0.06 }));
  f.add(ellipsoid([0, 1.105, 0.012], [0.152, 0.1, 0.118], { k: K }));
  f.add(ellipsoid([0, 0.985, 0.005], [0.163, 0.115, 0.126], { k: K }));
  // skirt, flaring slightly to the hem
  f.add(capsule([0, 0.985, 0.0], [0, 0.858, -0.006], 0.166, 0.181, { k: 0.05, scale: [1, 1, 0.78] }));
  f.add(ellipsoid([0, 0.862, -0.006], [0.184, 0.028, 0.146], { k: 0.035 }));

  // sleeves
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.172, 1.352, -0.002], [0.081, 0.088, 0.084], { k: 0.05 }));
    f.add(capsule([s * 0.176, 1.35, 0], [s * 0.197, 1.115, -0.012], 0.073, 0.058, { k: 0.045 }));
    f.add(capsule([s * 0.197, 1.115, -0.012], [s * 0.202, 1.008, -0.002], 0.058, 0.053, { k: 0.04 }));
    f.add(ellipsoid([s * 0.202, 1.006, -0.002], [0.056, 0.017, 0.056], { k: 0.02 })); // rolled cuff
  }

  // neck opening
  f.sub(capsule([0, 1.33, -0.01], [0, 1.52, 0.014], 0.098, 0.095, { k: 0.022 }));
  // V of the collar, showing the undershirt
  f.sub(roundBox([0, 1.318, 0.108], [0.036, 0.062, 0.06], 0.02, { k: 0.03 }));
  return { field: f, bounds: [-0.31, 0.8, -0.24, 0.31, 1.47, 0.25], cell: 0.006, region: REGION.TUNIC };
}

function trousersField() {
  const f = new Field();
  const K = 0.05;
  f.add(ellipsoid([0, 0.955, 0.005], [0.152, 0.105, 0.114], { k: K }));
  f.add(ellipsoid([0, 0.93, -0.06], [0.157, 0.09, 0.082], { k: K }));
  for (const s of [1, -1]) {
    f.add(capsule([s * 0.088, 0.955, 0], [s * 0.098, 0.53, 0.012], 0.101, 0.07, { k: 0.05 }));
    f.add(ellipsoid([s * 0.092, 0.78, 0.012], [0.09, 0.132, 0.094], { k: 0.06 }));
    f.add(capsule([s * 0.098, 0.53, 0.012], [s * 0.1, 0.155, -0.01], 0.071, 0.05, { k: 0.045 }));
    f.add(ellipsoid([s * 0.1, 0.418, -0.028], [0.062, 0.088, 0.062], { k: 0.055 }));
    f.add(ellipsoid([s * 0.1, 0.16, -0.01], [0.05, 0.016, 0.05], { k: 0.02 })); // cuff
  }
  return { field: f, bounds: [-0.2, 0.12, -0.19, 0.2, 1.02, 0.2], cell: 0.006, region: REGION.TROUSERS };
}

function shoesField() {
  const f = new Field();
  for (const s of [1, -1]) {
    f.add(roundBox([s * 0.101, 0.052, 0.03], [0.036, 0.026, 0.09], 0.031, { k: 0.035 }));
    f.add(roundBox([s * 0.101, 0.026, 0.02], [0.04, 0.011, 0.098], 0.014, { k: 0.02 })); // sole
    f.add(ellipsoid([s * 0.101, 0.108, -0.028], [0.042, 0.036, 0.05], { k: 0.04 }));     // ankle collar
  }
  return { field: f, bounds: [-0.18, -0.02, -0.13, 0.18, 0.17, 0.17], cell: 0.005, region: REGION.LEATHER };
}

export function clothingFields() {
  return [undershirtField(), tunicField(), trousersField(), shoesField()];
}

/** Braided strap from the left shoulder across the chest to the right hip. */
export function buildStrap() {
  const pts = [
    [-0.128, 1.372, -0.052],
    [-0.148, 1.352, 0.052],
    [-0.09, 1.278, 0.132],
    [0.0, 1.19, 0.148],
    [0.093, 1.088, 0.128],
    [0.152, 0.995, 0.055],
    [0.166, 0.962, -0.035],
  ];
  const rings = curveRings(pts, () => 0.021, 60, {
    tension: 0.4,
    profile: (a, t) => {
      const flat = 1 - 0.52 * Math.abs(Math.cos(a));      // flat leather band
      const braid = 1 + 0.1 * Math.sin(a * 3 + t * 110);  // braided texture
      return flat * braid;
    },
  });
  return sweep(rings, { sides: 20 });
}

/** Wide cloth belt with a knotted, hanging end at the front. */
export function buildBelt() {
  const parts = [];
  const ring = [];
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const rx = 0.168, rz = 0.132;
    ring.push({
      p: [Math.cos(a) * rx, 0.968 + Math.sin(a * 2) * 0.004, Math.sin(a) * rz + 0.004],
      r: [0.03, 0.019],
      twist: 0,
      profile: (t) => 1 + 0.06 * Math.sin(t * 6),
    });
  }
  parts.push(sweep(ring, { sides: 14, capStart: false, capEnd: false }));

  // knot + hanging tail
  const knot = curveRings(
    [[0.028, 0.972, 0.138], [0.006, 0.962, 0.152], [-0.022, 0.952, 0.142]],
    (t) => 0.026 - 0.006 * Math.abs(t - 0.5), 12, { tension: 0.4 },
  );
  parts.push(sweep(knot, { sides: 12 }));
  for (const dx of [-0.026, 0.014]) {
    const tail = curveRings(
      [[dx, 0.958, 0.146], [dx * 1.3 - 0.004, 0.9, 0.142], [dx * 1.5 - 0.006, 0.848, 0.128]],
      (t) => 0.016 * (1 - 0.45 * t), 12, { tension: 0.4, profile: (a) => 1 - 0.45 * Math.abs(Math.cos(a)) },
    );
    parts.push(sweep(tail, { sides: 12 }));
  }
  return parts;
}

/** Pale cloth wrist wraps where the sleeve ends. */
export function buildWristWraps(rig) {
  const parts = [];
  for (const s of [1, -1]) {
    const el = rig.restPos.get('elbow' + (s > 0 ? '.L' : '.R'));
    const wr = rig.restPos.get('wrist' + (s > 0 ? '.L' : '.R'));
    const at = (t) => [el[0] + (wr[0] - el[0]) * t, el[1] + (wr[1] - el[1]) * t, el[2] + (wr[2] - el[2]) * t];
    const rings = curveRings([at(0.55), at(0.68), at(0.82)], (t) => 0.0415 - 0.006 * t, 14, { tension: 0.4 });
    parts.push(sweep(rings, { sides: 16, capStart: false, capEnd: false }));
  }
  return parts;
}
