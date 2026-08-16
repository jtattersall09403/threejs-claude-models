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
    // SMOOTH fbm, and STRICTLY NON-NEGATIVE.
    //  - non-negative because this displaces the garment's offset from the skin: a
    //    zero-mean version drives the offset negative in every valley and the body
    //    erupts through the cloth in patches.
    //  - smooth because a ridged (folded-absolute) version has a kink in its
    //    gradient that the voxel bake cannot represent, and marching cubes turns it
    //    into hard-edged faceted plateaus that read as peeling paint.
    // Creases fine enough to read as cloth are shaded in CLOTH_FRAG instead, where
    // no bake resolution is involved.
    // Frequency is bounded by the BAKE CELL, not by taste. The tunic bakes at 4 mm and
    // the fine octave ran at freq*3.1 — about 10 mm per feature, i.e. 2.5 cells — so
    // marching cubes could not resolve it and turned every crease into a hard faceted
    // plateau. Across the hip that reads as layered slivers of peeling paint, which is
    // easy to misdiagnose as a print-through or a winding fault. Same family as trap 12.
    const big = fbm3(x * freq, y * freq * drape, z * freq, 3);
    const fine = fbm3(x * freq * 2.0 + 17, y * freq * drape * 2.0, z * freq * 2.0, 2);
    return amp * (big * 0.80 + fine * 0.22);
  };
}

export function clothingFields(body) {
  const out = [];

  // ---- undershirt: thin, only visible at the collar and the V of the tunic ----
  {
    const bounds = [-0.28, 1.12, -0.30, 0.28, 1.68, 0.24];
    // coverage only bounds the EXTENT of the garment; it must be generously wider
    // than the offset body surface or the intersection lands inside the skin
    const cover = coverage([
      roundBox([0, 1.352, 0.005], [0.30, 0.156, 0.28], 0.02),
      roundBox([0, 1.452, -0.078], [0.13, 0.075, 0.09], 0.03),   // rolled-down cowl
    ]);
    const f = garment(body, 0.010, cover, bounds, 0.020, folds(0.0038, 24));
    // A wrapped cloth cowl sitting at the base of the throat. Height here is delicate
    // in BOTH directions (trap 17): too low and the head and a bare neck fuse into one
    // vertical box, too high and it swallows the jaw. The references show a definite
    // throat column — a jawline with a shadowed neck and clavicle underneath it — so
    // the collar must clear the jaw by roughly a quarter of a head height. After any
    // change to HEAD_XF.scale this needs re-checking: scaling the head moves the jaw
    // but leaves the collar where it was.
    f.add(capsule([0, 1.366, -0.008], [0, 1.408, 0.006], 0.108, 0.092, { k: 0.024 }));
    f.add(ellipsoid([0, 1.372, 0.038], [0.090, 0.040, 0.064], { k: 0.020 }));  // knotted front
    // Wrap ridges. Without them the cowl is a smooth shield and, seen through the
    // coat's neckline, reads as a moulded bib rather than as cloth wound round a neck.
    for (const [y, z, r] of [[1.354, 0.030, 0.098], [1.374, 0.026, 0.100], [1.394, 0.020, 0.096]]) {
      f.add(capsule([-0.070, y, z], [0.070, y, z], r * 0.13, r * 0.13,
        { k: 0.016, scale: [1, 1, 0.86] }));
    }
    // a rolled rim right around the opening, so the collar reads as a hemmed edge
    // the head sits down into, rather than as a smooth funnel
    f.add(capsule([0, 1.388, 0.010], [0, 1.392, -0.006], 0.098, 0.096, { k: 0.012 }));
    f.add(ellipsoid([0.030, 1.394, 0.066], [0.036, 0.026, 0.030], { k: 0.018 }));
    // The cowl rolled down at the nape. Kept LOW and small — built up as a full hood
    // it read as a backpack strapped between the shoulder blades.
    f.add(ellipsoid([0, 1.368, -0.074], [0.092, 0.044, 0.044], { k: 0.030 }));
    f.add(ellipsoid([0, 1.400, -0.086], [0.070, 0.032, 0.032], { k: 0.028 }));
    f.sub(capsule([0, 1.394, -0.016], [0, 1.70, 0.014], 0.066, 0.076, { k: 0.018 })); // neck hole
    out.push({ field: f, bounds, cell: 0.0055, region: REGION.UNDERSHIRT });
  }

  // ---- tunic: torso + sleeves to mid-forearm + a skirt to above the knee -------
  {
    // The bake box has to CLEAR the skirt, not clip it. The skirt capsule below bulges
    // to y 0.639 through its bottom cap; with the box floored at 0.72 marching cubes
    // sealed it off with a flat plate, and from any low angle you saw a bare disc under
    // the hem instead of a hem. The dome is cut off deliberately further down instead.
    const bounds = [-0.33, 0.60, -0.27, 0.33, 1.52, 0.28];
    const cover = coverage([
      // waisted: wide at the chest, pinched at the waist, flaring again at the hips
      capsule([0, 1.415, 0.0], [0, 1.24, 0.008], 0.300, 0.245),
      capsule([0, 1.24, 0.008], [0, 1.10, 0.01], 0.245, 0.198),
      capsule([0, 1.10, 0.01], [0, 0.985, 0.005], 0.198, 0.212),
      // The sleeve coverage capsule must START INBOARD, inside the torso volume.
      // Anchored out over the deltoid its end cap is the outermost coverage surface
      // at the shoulder, and since the garment is a smooth intersection with this
      // volume, that cap prints straight through as a balloon — a leg-of-mutton
      // sleeve with a seam ring around the upper arm.
      capsule([-0.110, 1.425, 0], [-0.222, 1.128, -0.006], 0.098, 0.082),
      capsule([0.110, 1.425, 0], [0.222, 1.128, -0.006], 0.098, 0.082),
    ]);
    const f = garment(body, 0.026, cover, bounds, 0.016, folds(0.0092, 12));
    // The projection target for the sash, the medallion and the belt. It has to carry
    // EVERY ADDITIVE part of the coat and none of the cuts.
    //
    // It used to be the bare offset shell, which is the coat only over the ribcage. At
    // the waist and hip the coat is the SKIRT, standing over a centimetre proud of the
    // shell in z — so the strap and the belt were projected onto a surface that is
    // *inside* the visible coat, and they surfaced only where a fold happened to poke
    // through. That reads as torn geometry: a diagonal row of hard-edged slivers across
    // the chest and a belt reduced to a blade stuck through the cloth.
    const shell = garment(body, 0.026, cover, bounds, 0.016, folds(0.0092, 12));
    const addBoth = (prim) => { f.add(prim); shell.add(prim); };
    // the skirt hangs clear of the body, so it is added rather than offset
    // A coat skirt, not a peplum: it reaches mid-thigh and FLARES, so the figure gets a
    // waist. Stopping it just under the belt left the hips as the widest thing in the
    // silhouette and the whole figure read pear-shaped.
    addBoth(capsule([0, 1.0, 0.0], [0, 0.700, -0.016], 0.148, 0.170, { k: 0.055, scale: [1, 1, 0.9] }));
    // hem roll, waved so the border is not a dead-level line
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      addBoth(ellipsoid([Math.cos(a) * 0.146, 0.700 + Math.sin(a * 3) * 0.017, Math.sin(a) * 0.126 - 0.016],
        [0.038, 0.021, 0.036], { k: 0.038 }));
    }
    for (const s of [1, -1]) {
      addBoth(ellipsoid([s * 0.2205, 1.098, -0.008], [0.0560, 0.024, 0.0560], { k: 0.010 })); // rolled cuff
      addBoth(ellipsoid([s * 0.2203, 1.127, -0.008], [0.0530, 0.0085, 0.0530], { k: 0.008 })); // cuff seam
      // shoulder yoke: a raised rolled seam over the deltoid, so sleeve and torso
      // read as separate pieces instead of one continuous moulded mass
      addBoth(capsule([s * 0.080, 1.420, 0.058], [s * 0.180, 1.384, -0.054], 0.0215, 0.0185, { k: 0.0075 }));
      addBoth(capsule([s * 0.180, 1.384, -0.054], [s * 0.207, 1.336, -0.030], 0.0185, 0.0155, { k: 0.0075 }));
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
    f.sub(capsule([0, 1.370, 0.062], [0, 1.60, 0.010], 0.058, 0.094, { k: 0.028 }));
    // rolled collar band around the opening, so the edge reads as a hem
    f.add(capsule([0, 1.370, 0.040], [0, 1.400, 0.030], 0.082, 0.080, { k: 0.018 }));
    f.sub(capsule([0, 1.362, 0.064], [0, 1.62, 0.008], 0.054, 0.088, { k: 0.020 }));
    // The hem. A garment edge is a real edge — cloth stops. Cut it flat and let the
    // ring of hem ellipsoids above roll over the cut, so it reads as a hemmed border
    // rather than as a sawn plane or as a closed dome.
    // Lower than the hem roll's centre, so what you see from behind and below is the
    // ROLL's rounded underside rather than the flat face of the cut itself.
    f.sub(roundBox([0, 0.45, -0.006], [0.6, 0.222, 0.6], 0.012, { k: 0.020 }));
    out.push({ field: f, bounds, cell: 0.004, region: REGION.TUNIC, tunic: true, shell });
  }

  // ---- trousers ---------------------------------------------------------------
  {
    const bounds = [-0.25, 0.11, -0.22, 0.25, 1.04, 0.22];
    const cover = coverage([
      // Topped out BELOW the coat skirt. The trouser waist reached y 1.02 and, offset
      // 15 mm off a pelvis that is wider than the skirt is at that height, it stood
      // proud of the coat and printed through it as a scatter of hard slivers around
      // the hip — which reads as torn geometry, not as a garment.
      roundBox([0, 0.880, 0.0], [0.27, 0.060, 0.24], 0.02),
      capsule([-0.090, 0.96, 0], [-0.104, 0.222, -0.008], 0.19, 0.082),
      capsule([0.090, 0.96, 0], [0.104, 0.222, -0.008], 0.19, 0.082),
    ]);
    const f = garment(body, 0.012, cover, bounds, 0.014, folds(0.0080, 13));
    for (const s of [1, -1]) {
      f.add(ellipsoid([s * 0.104, 0.152, -0.012], [0.055, 0.016, 0.055], { k: 0.016 })); // cuff
    }
    out.push({ field: f, bounds, cell: 0.0045, region: REGION.TROUSERS });
  }

  // ---- shoes ------------------------------------------------------------------
  {
    const bounds = [-0.21, -0.02, -0.15, 0.21, 0.175, 0.19];
    const cover = coverage([
      roundBox([-0.105, 0.045, 0.028], [0.07, 0.052, 0.125], 0.02),
      roundBox([0.105, 0.045, 0.028], [0.07, 0.052, 0.125], 0.02),
    ]);
    const f = garment(body, 0.009, cover, bounds, 0.012);
    for (const s of [1, -1]) {
      // The sole has to be WIDER than the shoe upper or it sits inside the offset
      // surface and contributes nothing: the upper reaches ~0.069 half-width here.
      f.add(roundBox([s * 0.105, 0.014, 0.030], [0.054, 0.008, 0.118], 0.010, { k: 0.005 })); // sole
      f.add(roundBox([s * 0.105, 0.026, -0.052], [0.048, 0.018, 0.032], 0.008, { k: 0.005 })); // heel
      f.add(ellipsoid([s * 0.105, 0.122, -0.026], [0.05, 0.028, 0.056], { k: 0.03 }));     // ankle collar
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
export function buildStrap(tunicField, lift = 0.019) {
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
  const dirs = [], hits = [];
  for (const p of centres) {
    const outward = [p[0], (p[1] - 1.16) * 0.25, p[2]];
    const l = Math.hypot(outward[0], outward[1], outward[2]) || 1;
    const dir = [outward[0] / l, outward[1] / l, outward[2] / l];
    dirs.push(dir);
    if (!tunicField) { hits.push(0); continue; }
    const h = raySurface(tunicField, p, dir, { start: -0.16, max: 0.14 });
    hits.push((h[0] - p[0]) * dir[0] + (h[1] - p[1]) * dir[1] + (h[2] - p[2]) * dir[2]);
  }
  // RUNNING MAXIMUM of the projected distance, exactly as buildBelt does. Smoothing the
  // projected polyline averages the strap THROUGH the folds instead of over them, so it
  // emerges on the peaks and submerges in the troughs — a diagonal row of hard-edged
  // slivers across the coat that reads as torn geometry rather than as a half-buried
  // strap. Confirmed by ablation: removing the strap removed the slivers.
  const W = 5;
  const ride = hits.map((_, i) => {
    let m = -Infinity;
    for (let j = -W; j <= W; j++) {
      m = Math.max(m, hits[Math.min(hits.length - 1, Math.max(0, i + j))]);
    }
    return m;
  });
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < ride.length - 1; i++) ride[i] = ride[i] * 0.5 + (ride[i - 1] + ride[i + 1]) * 0.25;
  }
  const pts = centres.map((p, i) => {
    const d = dirs[i], t = ride[i] + lift;
    return [p[0] + d[0] * t, p[1] + d[1] * t, p[2] + d[2] * t];
  });

  // A broad strap. At half this width it rendered as a dark diagonal scratch across
  // the chest rather than a band of braided cord lying on the coat.
  const rings = pts.map((p, i) => {
    const t = i / (N - 1);
    return {
      p,
      // FLAT: the reference strap is a broad braided band lying on the coat, so the
      // cross-section is a wide thin ribbon. Nearer to round it reads as a rope.
      // Tapered at both ends, or a flat band terminates in a hard cap that catches
      // the light edge-on and reads as a knife blade laid across the hip.
// Narrower: the reference sash is a braided CORD lying on the coat, not the wide
      // flat belt-width band ours had become.
      r: [0.0146 * (0.62 + 0.38 * Math.min(1, Math.min(t, 1 - t) / 0.05)), 0.0046],
      profile: (a) => 1 + 0.10 * Math.sin(a * 3.0 + t * 40.0)
                    + 0.05 * Math.sin(a * 6.0 - t * 62.0),  // braid relief
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

/**
 * Wide cloth belt with a knotted, hanging end at the front.
 *
 * Like the sash, the ring is PROJECTED onto the tunic surface rather than placed at
 * an authored radius. Guessing the radius does not converge: the tunic's own surface
 * at the waist depends on its offset plus its fold displacement, so a hand-picked
 * value is either just inside it — leaving only a sliver of the belt's top edge
 * showing, which reads as a blade stuck through the coat — or just outside it, where
 * the belt becomes a hoop floating clear of the body with a hard flat underside.
 */
export function buildBelt(tunicField, lift = 0.025) {
  const parts = [];
  const ring = [];
  const N = 72;
  // Project every sample, then take a RUNNING MAXIMUM of the projected radius before
  // laying the band on it.
  //
  // Averaging (which is what smoothing the projected polyline does) puts the band
  // through the middle of the folds, so it emerges on the fold peaks and submerges in
  // the troughs. Around a waist that alternation is regular, and it renders as a stack
  // of thin horizontal louvres — which looks like torn or z-fighting geometry, not like
  // a half-buried strap, and cost an iteration to diagnose as such. A max over a window
  // wider than one fold makes the band ride OVER every peak it crosses.
  const dirs = [], ys = [], rad = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const p0 = [Math.cos(a) * 0.20, 0.972 + Math.sin(a * 2) * 0.004, Math.sin(a) * 0.17 + 0.004];
    const out = [p0[0], 0, p0[2] - 0.004];
    const l = Math.hypot(out[0], out[2]) || 1;
    const dir = [out[0] / l, 0, out[2] / l];
    dirs.push(dir);
    ys.push(p0[1]);
    if (!tunicField) { rad.push(l); continue; }
    const hit = raySurface(tunicField, p0, dir, { start: -0.16, max: 0.14 });
    rad.push(Math.hypot(hit[0], hit[2] - 0.004));
  }
  const W = 4;
  const ridden = rad.map((_, i) => {
    let m = -Infinity;
    for (let j = -W; j <= W; j++) m = Math.max(m, rad[(i + j + N + 1) % (N + 1)]);
    return m;
  });
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < ridden.length - 1; i++) {
      ridden[i] = ridden[i] * 0.5 + (ridden[i - 1] + ridden[i + 1]) * 0.25;
    }
  }

  for (let i = 0; i <= N; i++) {
    const dir = dirs[i], r = ridden[i] + lift;
    const p = [dir[0] * r, ys[i], dir[2] * r + 0.004];
    ring.push({
      p,
      // Narrower, thicker, and barely modulated. At 70 mm tall with a 15% profile
      // wobble the band read as a stiff flat plank with a sawtooth top edge (trap 10)
      // rather than as cloth wound round the waist.
      r: [0.0285, 0.0165],
      profile: (t) => 1 + 0.045 * Math.sin(t * 3) + 0.022 * Math.sin(t * 7),
    });
  }
  parts.push(sweep(ring, {
    sides: 16, capStart: false, capEnd: false,
    // An EXPLICIT frame, not bandFrame. bandFrame derives the width axis from the
    // ring's tangent, and once the ring is projected onto folded cloth that tangent
    // is noisy enough to tilt the band out of vertical — the belt then reads as a
    // wedge tapering to a point rather than a band of constant height. Around a
    // waist the frame is known exactly: width straight up, thickness straight out.
    frameFn: (p) => {
      const l = Math.hypot(p[0], p[2] - 0.004) || 1;
      return [[0, 1, 0], [p[0] / l, 0, (p[2] - 0.004) / l]];
    },
  }));

  // Knot and hanging ends. Kept small and narrow: oversized they read as a mushroom
  // with two flat blades bolted to the hip rather than as tied cloth.
  const knot = curveRings(
    [[0.028, 0.974, 0.166], [0.004, 0.964, 0.180], [-0.022, 0.955, 0.169]],
    (t) => 0.0185 - 0.005 * Math.abs(t - 0.5), 12, { tension: 0.4 },
  );
  parts.push(sweep(knot, { sides: 12 }));
  for (const dx of [-0.024, 0.012]) {
    const tail = curveRings(
      [[dx, 0.958, 0.181], [dx * 1.4 - 0.006, 0.892, 0.184], [dx * 1.8 - 0.012, 0.824, 0.178]],
      (t) => [0.0155 * (1 - 0.30 * t), 0.0072 * (1 - 0.22 * t)], 18,
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
