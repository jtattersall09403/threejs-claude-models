// Skyrim "farm clothes": coarse tunic over an undershirt, braided shoulder strap,
// knotted waist belt, trousers, wrist wraps and worn shoes.
//
// Garments are built as OFFSETS OF THE BODY SURFACE, trimmed to a coverage volume.
// Authoring them from primitive radii instead does not work: smooth-min blending
// inflates the body several centimetres past its own primitives, and clothes
// authored that way end up buried inside the skin.
import { Field, capsule, ellipsoid, roundBox, offsetSurface, isect } from '../core/sdf.js';
import { sweep, curveRings } from '../core/geom.js';
import { fbm3 } from '../core/noise.js';
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
function garment(body, offset, cover, bounds, edge = 0.014, wrinkle = null) {
  const f = new Field();
  f.add(isect(offsetSurface(body, offset, bounds, 0.008, wrinkle), cover, edge));
  return f;
}

/**
 * Cloth folds, as a displacement of the offset distance. Without these the garments
 * are perfectly smooth shrink-wrap and read as CG-clean plastic rather than as worn
 * fabric. Folds are stretched vertically because real drape runs with gravity.
 */
function folds(amp, freq = 13, drape = 0.42) {
  return (x, y, z) => {
    const big = fbm3(x * freq, y * freq * drape, z * freq, 3);
    const fine = fbm3(x * freq * 3.1 + 17, y * freq * drape * 3.1, z * freq * 3.1, 2);
    return amp * (big * 0.72 + fine * 0.34);
  };
}

export function clothingFields(body) {
  const out = [];

  // ---- undershirt: thin, only visible at the collar and the V of the tunic ----
  {
    const bounds = [-0.26, 1.16, -0.24, 0.26, 1.56, 0.24];
    // coverage only bounds the EXTENT of the garment; it must be generously wider
    // than the offset body surface or the intersection lands inside the skin
    const cover = coverage([
      roundBox([0, 1.398, 0.005], [0.30, 0.108, 0.28], 0.02),
    ]);
    const f = garment(body, 0.010, cover, bounds, 0.020, folds(0.0032, 22));
    // a cowl wrapped at the throat, so the collar is cloth rather than a hole
    f.add(capsule([0, 1.436, -0.006], [0, 1.492, 0.006], 0.101, 0.094, { k: 0.024 }));
    f.sub(capsule([0, 1.43, -0.016], [0, 1.62, 0.012], 0.082, 0.080, { k: 0.018 })); // neck hole
    out.push({ field: f, bounds, cell: 0.0055, region: REGION.UNDERSHIRT });
  }

  // ---- tunic: torso + sleeves to mid-forearm + a skirt to above the knee -------
  {
    const bounds = [-0.33, 0.72, -0.27, 0.33, 1.52, 0.28];
    const cover = coverage([
      // waisted: wide at the chest, pinched at the waist, flaring again at the hips
      capsule([0, 1.415, 0.0], [0, 1.24, 0.008], 0.245, 0.235),
      capsule([0, 1.24, 0.008], [0, 1.10, 0.01], 0.235, 0.198),
      capsule([0, 1.10, 0.01], [0, 0.985, 0.005], 0.198, 0.212),
      capsule([-0.188, 1.40, 0], [-0.211, 1.128, -0.006], 0.15, 0.079),
      capsule([0.188, 1.40, 0], [0.211, 1.128, -0.006], 0.15, 0.079),
    ]);
    const f = garment(body, 0.028, cover, bounds, 0.016, folds(0.030, 6));
    // the skirt hangs clear of the body, so it is added rather than offset
    f.add(capsule([0, 1.0, 0.0], [0, 0.788, -0.012], 0.15, 0.149, { k: 0.055, scale: [1, 1, 0.9] }));
        // hem broken up so it does not end in a hard horizontal CSG cut
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      f.add(ellipsoid([Math.cos(a) * 0.126, 0.790 + Math.sin(a * 3) * 0.009, Math.sin(a) * 0.109 - 0.012],
        [0.036, 0.011, 0.034], { k: 0.038 }));
    }
    for (const s of [1, -1]) {
      f.add(ellipsoid([s * 0.2115, 1.052, -0.008], [0.054, 0.017, 0.054], { k: 0.015 })); // cuff
    }
    // Neckline: one tilted opening that dips at the front. Cutting a separate hole
    // for the undershirt reads as a disc stuck on the chest — don't.
    f.sub(capsule([0, 1.398, 0.048], [0, 1.60, 0.022], 0.068, 0.098, { k: 0.028 }));
    // rolled collar band around the opening, so the edge reads as a hem
    f.add(capsule([0, 1.408, 0.034], [0, 1.442, 0.026], 0.092, 0.090, { k: 0.018 }));
    f.sub(capsule([0, 1.39, 0.05], [0, 1.62, 0.020], 0.064, 0.092, { k: 0.020 }));
    out.push({ field: f, bounds, cell: 0.004, region: REGION.TUNIC });
  }

  // ---- trousers ---------------------------------------------------------------
  {
    const bounds = [-0.23, 0.11, -0.22, 0.23, 1.04, 0.22];
    const cover = coverage([
      roundBox([0, 0.925, 0.0], [0.26, 0.078, 0.24], 0.02),
      capsule([-0.09, 0.96, 0], [-0.1, 0.222, -0.008], 0.19, 0.082),
      capsule([0.09, 0.96, 0], [0.1, 0.222, -0.008], 0.19, 0.082),
    ]);
    const f = garment(body, 0.015, cover, bounds, 0.014, folds(0.0135, 12));
    for (const s of [1, -1]) {
      f.add(ellipsoid([s * 0.1, 0.152, -0.012], [0.055, 0.016, 0.055], { k: 0.016 })); // cuff
    }
    out.push({ field: f, bounds, cell: 0.0045, region: REGION.TROUSERS });
  }

  // ---- shoes ------------------------------------------------------------------
  {
    const bounds = [-0.19, -0.02, -0.15, 0.19, 0.175, 0.19];
    const cover = coverage([
      roundBox([-0.101, 0.045, 0.028], [0.07, 0.052, 0.125], 0.02),
      roundBox([0.101, 0.045, 0.028], [0.07, 0.052, 0.125], 0.02),
    ]);
    const f = garment(body, 0.009, cover, bounds, 0.012);
    for (const s of [1, -1]) {
      f.add(roundBox([s * 0.101, 0.019, 0.022], [0.043, 0.008, 0.104], 0.012, { k: 0.012 })); // sole
      f.add(roundBox([s * 0.101, 0.026, -0.052], [0.036, 0.014, 0.026], 0.010, { k: 0.012 })); // heel
      f.add(ellipsoid([s * 0.101, 0.122, -0.026], [0.05, 0.028, 0.056], { k: 0.03 }));     // ankle collar
    }
    out.push({ field: f, bounds, cell: 0.0045, region: REGION.LEATHER });
  }

  return out;
}

/** Braided strap from the left shoulder across the chest to the right hip. */
export function buildStrap() {
  const pts = [
    [-0.160, 1.438, -0.058],
    [-0.190, 1.412, 0.050],
    [-0.111, 1.322, 0.168],
    [0.0, 1.222, 0.186],
    [0.111, 1.112, 0.165],
    [0.183, 1.006, 0.068],
    [0.198, 0.963, -0.038],
  ];
  const rings = curveRings(pts, () => [0.019, 0.0072], 150, {
    tension: 0.4,
    profile: (a, t) => 1 + 0.085 * Math.sin(a * 3.0 + t * 52.0)
                     + 0.045 * Math.sin(a * 6.0 - t * 84.0),  // braided relief
  });
  return sweep(rings, {
    sides: 28,
    // width across the chest, thickness along the outward radial — otherwise the
    // parallel-transport frame twists the ribbon into a rope
    frameFn: (p, tan) => {
      const out = [p[0], 0, p[2] - 0.02];
      const l = Math.hypot(out[0], out[2]) || 1;
      const v = [out[0] / l, 0.12, out[2] / l];
      const u = [tan[1] * v[2] - tan[2] * v[1], tan[2] * v[0] - tan[0] * v[2], tan[0] * v[1] - tan[1] * v[0]];
      const ul = Math.hypot(u[0], u[1], u[2]) || 1;
      return [[u[0] / ul, u[1] / ul, u[2] / ul], v];
    },
  });
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
      r: [0.038, 0.0085],
      profile: (t) => 1 + 0.06 * Math.sin(t * 6),
    });
  }
  parts.push(sweep(ring, {
    sides: 16, capStart: false, capEnd: false,
    frameFn: (p, tan) => {
      const l = Math.hypot(p[0], p[2] - 0.004) || 1;
      const v = [p[0] / l, 0, (p[2] - 0.004) / l];
      const u = [tan[1] * v[2] - tan[2] * v[1], tan[2] * v[0] - tan[0] * v[2], tan[0] * v[1] - tan[1] * v[0]];
      const ul = Math.hypot(u[0], u[1], u[2]) || 1;
      return [[u[0] / ul, u[1] / ul, u[2] / ul], v];
    },
  }));

  const knot = curveRings(
    [[0.03, 0.976, 0.158], [0.006, 0.966, 0.174], [-0.024, 0.956, 0.162]],
    (t) => 0.021 - 0.005 * Math.abs(t - 0.5), 12, { tension: 0.4 },
  );
  parts.push(sweep(knot, { sides: 12 }));
  for (const dx of [-0.028, 0.014]) {
    const tail = curveRings(
      [[dx, 0.962, 0.168], [dx * 1.5 - 0.008, 0.906, 0.170], [dx * 2.0 - 0.014, 0.852, 0.150]],
      (t) => [0.017 * (1 - 0.45 * t), 0.007 * (1 - 0.3 * t)], 16,
      { tension: 0.4, profile: (a, u) => 1 + 0.10 * Math.sin(a * 2.0 + u * 12.0) },
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
    // closed shell: an open tube shows its zero-thickness edges and audits negative
    // overlaps the sleeve cuff above and the bare arm below, so no black slot shows
    const rings = curveRings([at(0.700), at(0.80), at(0.90), at(0.965)], (t) =>
      0.0505 - 0.011 * t - 0.012 * Math.max(0, Math.abs(t - 0.5) * 2 - 0.80)
      + 0.0011 * Math.sin(t * 13.0), 24, { tension: 0.4 });
    parts.push(sweep(rings, { sides: 20 }));
  }
  return parts;
}
