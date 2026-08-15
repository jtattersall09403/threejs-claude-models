// Skyrim "farm clothes": coarse tunic over an undershirt, braided shoulder strap,
// knotted waist belt, trousers, wrist wraps and worn shoes.
//
// Garments are built as OFFSETS OF THE BODY SURFACE, trimmed to a coverage volume.
// Authoring them from primitive radii instead does not work: smooth-min blending
// inflates the body several centimetres past its own primitives, and clothes
// authored that way end up buried inside the skin.
import { Field, capsule, ellipsoid, roundBox, offsetSurface, isect, raySurface } from '../core/sdf.js';
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
    // RIDGED noise, not plain fbm. Plain fbm displaces the offset smoothly and the
    // garment comes out gently lumpy — from any distance it still reads as a
    // shrink-wrapped bodysuit. Cloth creases: sharp valleys, rounded crests, which
    // is what folding the noise about its midpoint gives.
    const a = fbm3(x * freq, y * freq * drape, z * freq, 3);
    const b = fbm3(x * freq * 2.7 + 17, y * freq * drape * 2.7, z * freq * 2.7, 2);
    const ridge = 1 - Math.abs(a * 2 - 1);
    const fine = 1 - Math.abs(b * 2 - 1);
    // STRICTLY NON-NEGATIVE. This displaces the garment's offset from the skin, so a
    // zero-mean version drives the offset negative in every valley and the body
    // erupts through the cloth in patches. Folds may only ever push outwards.
    return amp * (ridge * 0.78 + fine * 0.30);
  };
}

export function clothingFields(body) {
  const out = [];

  // ---- undershirt: thin, only visible at the collar and the V of the tunic ----
  {
    const bounds = [-0.26, 1.12, -0.24, 0.26, 1.66, 0.24];
    // coverage only bounds the EXTENT of the garment; it must be generously wider
    // than the offset body surface or the intersection lands inside the skin
    const cover = coverage([
      roundBox([0, 1.352, 0.005], [0.30, 0.156, 0.28], 0.02),
    ]);
    const f = garment(body, 0.010, cover, bounds, 0.020, folds(0.0060, 30));
    // A wrapped cloth cowl that rises to just under the jaw. It used to stop ~6 cm
    // short, leaving a bare column of neck almost as wide as the skull — head and
    // neck then fused into one box and the jaw line disappeared. In the references
    // the neck is not visible at all.
    f.add(capsule([0, 1.432, -0.008], [0, 1.550, 0.006], 0.102, 0.082, { k: 0.024 }));
    f.add(ellipsoid([0, 1.490, 0.038], [0.084, 0.042, 0.062], { k: 0.020 }));  // knotted front
    f.add(ellipsoid([0.030, 1.462, 0.066], [0.036, 0.026, 0.030], { k: 0.018 }));
    f.sub(capsule([0, 1.43, -0.016], [0, 1.70, 0.014], 0.066, 0.074, { k: 0.018 })); // neck hole
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
    const f = garment(body, 0.026, cover, bounds, 0.016, folds(0.0175, 18));
    // a cut-free copy of the same shell, used only as a projection target for the
    // sash and medallion
    const shell = garment(body, 0.026, cover, bounds, 0.016, folds(0.0175, 18));
    // the skirt hangs clear of the body, so it is added rather than offset
    f.add(capsule([0, 1.0, 0.0], [0, 0.788, -0.012], 0.15, 0.149, { k: 0.055, scale: [1, 1, 0.9] }));
        // hem broken up so it does not end in a hard horizontal CSG cut
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      f.add(ellipsoid([Math.cos(a) * 0.126, 0.790 + Math.sin(a * 3) * 0.009, Math.sin(a) * 0.109 - 0.012],
        [0.036, 0.011, 0.034], { k: 0.038 }));
    }
    for (const s of [1, -1]) {
      f.add(ellipsoid([s * 0.2115, 1.056, -0.008], [0.0555, 0.024, 0.0555], { k: 0.010 })); // rolled cuff
      f.add(ellipsoid([s * 0.2113, 1.085, -0.008], [0.0525, 0.0085, 0.0525], { k: 0.008 })); // cuff seam
      // shoulder yoke: a raised rolled seam over the deltoid, so sleeve and torso
      // read as separate pieces instead of one continuous moulded mass
      f.add(capsule([s * 0.076, 1.412, 0.056], [s * 0.172, 1.376, -0.052], 0.0215, 0.0185, { k: 0.0075 }));
      f.add(capsule([s * 0.172, 1.376, -0.052], [s * 0.196, 1.330, -0.030], 0.0185, 0.0155, { k: 0.0075 }));
    }
    // front opening: a narrow vertical slot down the chest centre, with a raised hem
    // roll either side, so the undershirt shows through a placket rather than a hole
    f.sub(capsule([0, 1.352, 0.150], [0, 1.268, 0.156], 0.0135, 0.0115, { k: 0.014 }));
    for (const s2 of [1, -1]) {
      f.add(capsule([s2 * 0.0205, 1.360, 0.149], [s2 * 0.0205, 1.262, 0.155], 0.0088, 0.0072,
        { k: 0.011 }));
    }
    // Neckline: one tilted opening that dips at the front. Cutting a separate hole
    // for the undershirt reads as a disc stuck on the chest — don't.
    f.sub(capsule([0, 1.398, 0.048], [0, 1.60, 0.022], 0.068, 0.098, { k: 0.028 }));
    // rolled collar band around the opening, so the edge reads as a hem
    f.add(capsule([0, 1.408, 0.034], [0, 1.442, 0.026], 0.092, 0.090, { k: 0.018 }));
    f.sub(capsule([0, 1.39, 0.05], [0, 1.62, 0.020], 0.064, 0.092, { k: 0.020 }));
    out.push({ field: f, bounds, cell: 0.004, region: REGION.TUNIC, tunic: true, shell });
  }

  // ---- trousers ---------------------------------------------------------------
  {
    const bounds = [-0.23, 0.11, -0.22, 0.23, 1.04, 0.22];
    const cover = coverage([
      roundBox([0, 0.925, 0.0], [0.26, 0.078, 0.24], 0.02),
      capsule([-0.08, 0.96, 0], [-0.089, 0.222, -0.008], 0.19, 0.082),
      capsule([0.08, 0.96, 0], [0.089, 0.222, -0.008], 0.19, 0.082),
    ]);
    const f = garment(body, 0.015, cover, bounds, 0.014, folds(0.0125, 22));
    for (const s of [1, -1]) {
      f.add(ellipsoid([s * 0.089, 0.152, -0.012], [0.055, 0.016, 0.055], { k: 0.016 })); // cuff
    }
    out.push({ field: f, bounds, cell: 0.0045, region: REGION.TROUSERS });
  }

  // ---- shoes ------------------------------------------------------------------
  {
    const bounds = [-0.19, -0.02, -0.15, 0.19, 0.175, 0.19];
    const cover = coverage([
      roundBox([-0.090, 0.045, 0.028], [0.07, 0.052, 0.125], 0.02),
      roundBox([0.090, 0.045, 0.028], [0.07, 0.052, 0.125], 0.02),
    ]);
    const f = garment(body, 0.009, cover, bounds, 0.012);
    for (const s of [1, -1]) {
      f.add(roundBox([s * 0.090, 0.019, 0.022], [0.043, 0.008, 0.104], 0.012, { k: 0.012 })); // sole
      f.add(roundBox([s * 0.090, 0.026, -0.052], [0.036, 0.014, 0.026], 0.010, { k: 0.012 })); // heel
      f.add(ellipsoid([s * 0.090, 0.122, -0.026], [0.05, 0.028, 0.056], { k: 0.03 }));     // ankle collar
    }
    out.push({ field: f, bounds, cell: 0.0045, region: REGION.LEATHER });
  }

  return out;
}

/**
 * A frame for a flat band lying on the body: `v` is the outward radial, `u` the
 * width direction across the band.
 *
 * The orthogonalisation needs a guard. Where the band wraps — over the shoulder,
 * around the hip — the tangent swings parallel to the outward direction, `v`
 * collapses towards zero length, and normalising it flips the ring basis from one
 * step to the next. The sweep then renders as a fragmented row of triangular
 * slivers: it looks like torn geometry, not like a twisted strap, so it is easy to
 * misread as a bake or winding problem. Falling back to the previous ring's frame
 * across the degenerate stretch keeps the band continuous.
 */
function bandFrame(outwardOf) {
  let prevV = null;
  return (p, tan) => {
    let v = outwardOf(p);
    const d = v[0] * tan[0] + v[1] * tan[1] + v[2] * tan[2];
    v = [v[0] - tan[0] * d, v[1] - tan[1] * d, v[2] - tan[2] * d];
    let vl = Math.hypot(v[0], v[1], v[2]);
    if (vl < 0.22 && prevV) {
      // re-project the previous frame instead of normalising near-zero noise
      const pd = prevV[0] * tan[0] + prevV[1] * tan[1] + prevV[2] * tan[2];
      v = [prevV[0] - tan[0] * pd, prevV[1] - tan[1] * pd, prevV[2] - tan[2] * pd];
      vl = Math.hypot(v[0], v[1], v[2]) || 1;
    }
    vl = vl || 1;
    v = [v[0] / vl, v[1] / vl, v[2] / vl];
    prevV = v;
    const u = [tan[1] * v[2] - tan[2] * v[1], tan[2] * v[0] - tan[0] * v[2],
               tan[0] * v[1] - tan[1] * v[0]];
    const ul = Math.hypot(u[0], u[1], u[2]) || 1;
    return [[u[0] / ul, u[1] / ul, u[2] / ul], v];
  };
}

/**
 * Braided strap, the character's right shoulder to left hip.
 * The control points are PROJECTED ONTO THE BODY SURFACE and pushed out past the
 * tunic. Authored in world space the strap drifts in and out of the coat — from the
 * side it detaches and hangs in mid-air, and from the front you see its shadowed
 * underside, so it reads as a slash in the cloth rather than a strap lying on it.
 */
export function buildStrap(tunicField, lift = 0.013) {
  const raw = [
    [-0.160, 1.438, -0.058],
    [-0.190, 1.412, 0.050],
    [-0.111, 1.322, 0.168],
    [0.0, 1.222, 0.186],
    [0.111, 1.112, 0.165],
    [0.183, 1.006, 0.068],
    [0.198, 0.963, -0.038],
  ];
  const N = 150;
  // Project EVERY ring centre, not just the seven control points. Projecting the
  // control points and then interpolating draws a smooth curve between widely spaced
  // anchors, which cuts straight through the cloth folds in between — the strap then
  // renders as a row of disconnected slivers where it happens to surface. The lift
  // must also clear the fold amplitude, or it submerges again.
  const centres = curveRings(raw, () => 0, N, { tension: 0.4 }).map((r) => r.p);
  const pts = centres.map((p) => {
    const outward = [p[0], (p[1] - 1.16) * 0.25, p[2]];
    const l = Math.hypot(outward[0], outward[1], outward[2]) || 1;
    const dir = [outward[0] / l, outward[1] / l, outward[2] / l];
    if (!tunicField) return p;
    const hit = raySurface(tunicField, p, dir, { start: -0.16, max: 0.14 });
    return [hit[0] + dir[0] * lift, hit[1] + dir[1] * lift, hit[2] + dir[2] * lift];
  });
  // light smoothing: raySurface returns a slightly noisy polyline over folded cloth
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < pts.length - 1; i++) {
      for (let c = 0; c < 3; c++) {
        pts[i][c] = pts[i][c] * 0.5 + (pts[i - 1][c] + pts[i + 1][c]) * 0.25;
      }
    }
  }

  // A broad strap. At half this width it rendered as a dark diagonal scratch across
  // the chest rather than a band of braided cord lying on the coat.
  const rings = pts.map((p, i) => {
    const t = i / (N - 1);
    return {
      p,
      r: [0.0175, 0.0078],
      profile: (a) => 1 + 0.20 * Math.sin(a * 3.0 + t * 40.0)
                    + 0.09 * Math.sin(a * 6.0 - t * 62.0),  // braided cord relief
    };
  });
  return sweep(rings, {
    sides: 28,
    // width across the chest, thickness along the outward radial — otherwise the
    // parallel-transport frame twists the ribbon into a rope
    frameFn: bandFrame((p) => [p[0], (p[1] - 1.16) * 0.28, p[2] - 0.01]),
  });
}

/** Round medallion where the sash crosses the chest — the reference has one. */
export function buildMedallion(tunicField) {
  const anchor = [0.028, 1.238, 0.180];
  const l = Math.hypot(anchor[0], anchor[2]) || 1;
  const dir = [anchor[0] / l, 0.10, anchor[2] / l];
  const dl = Math.hypot(dir[0], dir[1], dir[2]);
  const d = [dir[0] / dl, dir[1] / dl, dir[2] / dl];
  const hit = tunicField ? raySurface(tunicField, anchor, d, { start: -0.16, max: 0.14 }) : anchor;
  const base = [hit[0] + d[0] * 0.004, hit[1] + d[1] * 0.004, hit[2] + d[2] * 0.004];
  const rings = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    rings.push({
      p: [base[0] + d[0] * t * 0.011, base[1] + d[1] * t * 0.011, base[2] + d[2] * t * 0.011],
      r: 0.0235 * Math.sqrt(Math.max(0.06, 1 - Math.pow(t * 2 - 1, 2) * 0.55)),
      profile: (a) => 1 + 0.05 * Math.sin(a * 8.0),
    });
  }
  return sweep(rings, { sides: 26 });
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
      r: [0.043, 0.0125],
      profile: (t) => 1 + 0.10 * Math.sin(t * 5) + 0.05 * Math.sin(t * 11),
    });
  }
  parts.push(sweep(ring, {
    sides: 16, capStart: false, capEnd: false,
    frameFn: bandFrame((p) => [p[0], 0, p[2] - 0.004]),
  }));

  // Knot and hanging ends. Kept small and narrow: oversized they read as a mushroom
  // with two flat blades bolted to the hip rather than as tied cloth.
  const knot = curveRings(
    [[0.026, 0.974, 0.156], [0.004, 0.964, 0.170], [-0.020, 0.955, 0.159]],
    (t) => 0.0155 - 0.004 * Math.abs(t - 0.5), 12, { tension: 0.4 },
  );
  parts.push(sweep(knot, { sides: 12 }));
  for (const dx of [-0.024, 0.012]) {
    const tail = curveRings(
      [[dx, 0.958, 0.164], [dx * 1.4 - 0.006, 0.892, 0.166], [dx * 1.8 - 0.012, 0.824, 0.142]],
      (t) => [0.0115 * (1 - 0.35 * t), 0.0052 * (1 - 0.25 * t)], 18,
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
