// Skyrim "farm clothes": coarse tunic over an undershirt, braided shoulder strap,
// knotted waist belt, trousers, wrist wraps and worn shoes.
//
// Garments are built as OFFSETS OF THE BODY SURFACE, trimmed to a coverage volume.
// Authoring them from primitive radii instead does not work: smooth-min blending
// inflates the body several centimetres past its own primitives, and clothes
// authored that way end up buried inside the skin.
import { Field, capsule, ellipsoid, roundBox, offsetSurface, isect } from '../core/sdf.js';
import { sweep, curveRings } from '../core/geom.js';
import { REGION } from './regions.js';

/** Union of primitives describing where a garment exists at all. */
function coverage(prims, pad = 0.04) {
  const f = new Field();
  for (const p of prims) f.add(p);
  const bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (const p of prims) {
    for (let i = 0; i < 3; i++) {
      bb[i] = Math.min(bb[i], p.aabb[i] - pad);
      bb[i + 3] = Math.max(bb[i + 3], p.aabb[i + 3] + pad);
    }
  }
  return f.asPrimitive(bb);
}

/**
 * @param body   the body Field
 * @param offset how far the garment stands off the skin
 * @param cover  coverage volume
 * @param edge   softness of the garment's hem / opening
 */
function garment(body, offset, cover, bounds, edge = 0.014) {
  const f = new Field();
  f.add(isect(offsetSurface(body, offset, bounds, 0.008), cover, edge));
  return f;
}

export function clothingFields(body) {
  const out = [];

  // ---- undershirt: thin, only visible at the collar and the V of the tunic ----
  {
    const bounds = [-0.26, 1.02, -0.22, 0.26, 1.5, 0.22];
    // coverage only bounds the EXTENT of the garment; it must be generously wider
    // than the offset body surface or the intersection lands inside the skin
    const cover = coverage([
      roundBox([0, 1.245, 0.005], [0.30, 0.195, 0.28], 0.02),
    ]);
    const f = garment(body, 0.009, cover, bounds);
    f.sub(capsule([0, 1.4, -0.02], [0, 1.6, 0.014], 0.084, 0.082, { k: 0.018 })); // neck hole
    out.push({ field: f, bounds, cell: 0.0055, region: REGION.UNDERSHIRT });
  }

  // ---- tunic: torso + sleeves to mid-forearm + a skirt to above the knee -------
  {
    const bounds = [-0.33, 0.72, -0.27, 0.33, 1.52, 0.28];
    const cover = coverage([
      roundBox([0, 1.212, 0.005], [0.30, 0.228, 0.30], 0.02),
      capsule([-0.188, 1.40, 0], [-0.212, 1.135, -0.006], 0.145, 0.088),
      capsule([0.188, 1.40, 0], [0.212, 1.135, -0.006], 0.145, 0.088),
    ]);
    const f = garment(body, 0.024, cover, bounds, 0.016);
    // the skirt hangs clear of the body, so it is added rather than offset
    f.add(capsule([0, 1.0, 0.0], [0, 0.775, -0.012], 0.163, 0.178, { k: 0.05, scale: [1, 1, 0.84] }));
    f.add(ellipsoid([0, 0.778, -0.012], [0.18, 0.02, 0.148], { k: 0.024 }));  // hem roll
    for (const s of [1, -1]) {
      f.add(ellipsoid([s * 0.2145, 1.048, -0.004], [0.052, 0.017, 0.052], { k: 0.016 })); // cuff
    }
    f.sub(capsule([0, 1.4, -0.02], [0, 1.62, 0.016], 0.098, 0.096, { k: 0.02 }));  // neck opening
    f.sub(roundBox([0, 1.362, 0.135], [0.033, 0.058, 0.06], 0.018, { k: 0.026 })); // collar V
    out.push({ field: f, bounds, cell: 0.0055, region: REGION.TUNIC });
  }

  // ---- trousers ---------------------------------------------------------------
  {
    const bounds = [-0.23, 0.13, -0.22, 0.23, 1.04, 0.22];
    const cover = coverage([
      roundBox([0, 0.925, 0.0], [0.26, 0.078, 0.24], 0.02),
      capsule([-0.09, 0.96, 0], [-0.1, 0.245, -0.008], 0.19, 0.078),
      capsule([0.09, 0.96, 0], [0.1, 0.245, -0.008], 0.19, 0.078),
    ]);
    const f = garment(body, 0.013, cover, bounds);
    for (const s of [1, -1]) {
      f.add(ellipsoid([s * 0.1, 0.172, -0.012], [0.052, 0.014, 0.052], { k: 0.016 })); // cuff
    }
    out.push({ field: f, bounds, cell: 0.0055, region: REGION.TROUSERS });
  }

  // ---- shoes ------------------------------------------------------------------
  {
    const bounds = [-0.19, -0.02, -0.15, 0.19, 0.175, 0.19];
    const cover = coverage([
      roundBox([-0.101, 0.05, 0.03], [0.09, 0.062, 0.15], 0.02),
      roundBox([0.101, 0.05, 0.03], [0.09, 0.062, 0.15], 0.02),
    ]);
    const f = garment(body, 0.012, cover, bounds, 0.012);
    for (const s of [1, -1]) {
      f.add(roundBox([s * 0.101, 0.022, 0.022], [0.04, 0.009, 0.1], 0.014, { k: 0.016 })); // sole
      f.add(ellipsoid([s * 0.101, 0.122, -0.026], [0.05, 0.028, 0.056], { k: 0.03 }));     // ankle collar
    }
    out.push({ field: f, bounds, cell: 0.0045, region: REGION.LEATHER });
  }

  return out;
}

/** Braided strap from the left shoulder across the chest to the right hip. */
export function buildStrap() {
  const pts = [
    [-0.152, 1.432, -0.062],
    [-0.178, 1.408, 0.056],
    [-0.104, 1.318, 0.168],
    [0.0, 1.215, 0.186],
    [0.106, 1.104, 0.162],
    [0.171, 1.0, 0.07],
    [0.186, 0.962, -0.036],
  ];
  const rings = curveRings(pts, () => 0.022, 64, {
    tension: 0.4,
    profile: (a, t) => {
      const flat = 1 - 0.5 * Math.abs(Math.cos(a));       // flat leather band
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
  const N = 72;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const rx = 0.186, rz = 0.152;
    ring.push({
      p: [Math.cos(a) * rx, 0.972 + Math.sin(a * 2) * 0.004, Math.sin(a) * rz + 0.004],
      r: [0.032, 0.02],
      profile: (t) => 1 + 0.06 * Math.sin(t * 6),
    });
  }
  parts.push(sweep(ring, { sides: 14, capStart: false, capEnd: false }));

  const knot = curveRings(
    [[0.03, 0.976, 0.158], [0.006, 0.966, 0.174], [-0.024, 0.956, 0.162]],
    (t) => 0.027 - 0.006 * Math.abs(t - 0.5), 12, { tension: 0.4 },
  );
  parts.push(sweep(knot, { sides: 12 }));
  for (const dx of [-0.028, 0.014]) {
    const tail = curveRings(
      [[dx, 0.962, 0.166], [dx * 1.3 - 0.004, 0.902, 0.162], [dx * 1.5 - 0.006, 0.848, 0.146]],
      (t) => 0.017 * (1 - 0.4 * t), 12,
      { tension: 0.4, profile: (a) => 1 - 0.45 * Math.abs(Math.cos(a)) },
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
    const rings = curveRings([at(0.62), at(0.74), at(0.87)], (t) => 0.046 - 0.007 * t, 14, { tension: 0.4 });
    parts.push(sweep(rings, { sides: 16, capStart: false, capEnd: false }));
  }
  return parts;
}
