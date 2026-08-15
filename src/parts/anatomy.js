// The SDF description of the Argonian's body and head.
// Two separate bakes: a coarse one for the body, a fine one for the head (which
// carries all the silhouette-critical detail). They overlap deep inside the neck,
// so the join is never visible.
//
// Head proportions target the references: length : height : width ≈ 1.6 : 1 : 0.9,
// i.e. long-snouted but with a tall braincase and a deep jaw — NOT a flat plank.
import { Field, capsule, ellipsoid, roundBox, creaseSlot } from '../core/sdf.js';

export const EYE = {
  c: [0.0578, 1.6975, 0.0675],   // mirrored on x
  r: 0.0176,
  gaze: [0.34, 0.05, 0.939],     // outward/forward gaze axis for the left(+x) eye
};

// One knob for overall head size. Head anatomy, horns, spikes, teeth and eyes are
// all authored at scale 1 and pushed through this transform, and the skin shader
// undoes it to evaluate its head masks, so the whole head resizes coherently.
export const HEAD_XF = { scale: 1.0, pivot: [0, 1.578, 0.028], offset: [0, -0.034, 0.004] };

export function headPoint(p) {
  const { scale: s, pivot: c, offset: o } = HEAD_XF;
  return [
    c[0] + (p[0] - c[0]) * s + o[0],
    c[1] + (p[1] - c[1]) * s + o[1],
    c[2] + (p[2] - c[2]) * s + o[2],
  ];
}

export const EYE_WORLD = headPoint(EYE.c);

export const BODY_BOUNDS = [-0.35, -0.03, -0.62, 0.35, 1.55, 0.24];
const HEAD_BOX = [-0.15, 1.40, -0.16, 0.15, 1.82, 0.28];
export const HEAD_BOUNDS = [
  ...headPoint([HEAD_BOX[0], HEAD_BOX[1], HEAD_BOX[2]]),
  ...headPoint([HEAD_BOX[3], HEAD_BOX[4], HEAD_BOX[5]]),
];

export function buildBodyField() {
  const f = new Field();
  const K = 0.055;

  // ---- torso ----------------------------------------------------------------
  f.add(ellipsoid([0, 0.985, 0.005], [0.138, 0.108, 0.1], { k: K }));      // pelvis
  f.add(ellipsoid([0, 1.095, 0.012], [0.126, 0.095, 0.097], { k: K }));    // waist
  f.add(ellipsoid([0, 1.245, 0.008], [0.158, 0.135, 0.111], { k: K }));    // ribcage
  f.add(ellipsoid([0, 1.345, 0.0], [0.152, 0.09, 0.103], { k: K }));       // upper chest
  f.add(capsule([-0.155, 1.392, -0.004], [0.155, 1.392, -0.004], 0.076, 0.076, { k: 0.045 }));
  f.add(ellipsoid([0, 1.386, -0.055], [0.134, 0.086, 0.066], { k: 0.06 })); // trapezius mass
  f.add(ellipsoid([0, 0.95, -0.062], [0.146, 0.09, 0.07], { k: K }));      // glutes

  // ---- neck (continues up into the head bake) --------------------------------
  f.add(capsule([0, 1.375, -0.02], [0, 1.535, 0.012], 0.108, 0.084, { k: 0.055 }));

  // ---- arms ------------------------------------------------------------------
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.186, 1.392, -0.004], [0.062, 0.072, 0.064], { k: 0.03 })); // deltoid
    f.add(capsule([s * 0.192, 1.388, 0], [s * 0.211, 1.145, -0.014], 0.05, 0.039, { k: 0.026 }));
    f.add(ellipsoid([s * 0.199, 1.275, -0.005], [0.047, 0.068, 0.048], { k: 0.03 }));  // biceps
    f.add(capsule([s * 0.211, 1.145, -0.014], [s * 0.228, 0.892, 0.012], 0.044, 0.029, { k: 0.026 }));
    f.add(ellipsoid([s * 0.216, 1.074, -0.008], [0.041, 0.06, 0.043], { k: 0.03 }));   // forearm swell
    // palm: a mitten; individual fingers are swept separately at higher detail
    f.add(roundBox([s * 0.229, 0.822, 0.006], [0.013, 0.034, 0.031], 0.026, { k: 0.03 }));
  }

  // ---- legs ------------------------------------------------------------------
  for (const s of [1, -1]) {
    f.add(capsule([s * 0.088, 0.955, 0], [s * 0.098, 0.53, 0.012], 0.091, 0.056, { k: 0.05 }));
    f.add(ellipsoid([s * 0.092, 0.78, 0.012], [0.079, 0.13, 0.083], { k: 0.06 }));   // quad
    f.add(capsule([s * 0.098, 0.53, 0.012], [s * 0.1, 0.105, -0.012], 0.058, 0.033, { k: 0.045 }));
    f.add(ellipsoid([s * 0.1, 0.415, -0.028], [0.05, 0.085, 0.05], { k: 0.055 }));   // calf
    f.add(roundBox([s * 0.101, 0.048, 0.028], [0.032, 0.022, 0.085], 0.028, { k: 0.04 })); // foot
  }

  // ---- tail ------------------------------------------------------------------
  const tail = [
    [[0, 0.968, -0.078], 0.076],
    [[0, 0.892, -0.182], 0.059],
    [[0, 0.772, -0.256], 0.044],
    [[0, 0.628, -0.298], 0.031],
    [[0, 0.482, -0.312], 0.02],
    [[0, 0.342, -0.302], 0.009],
  ];
  for (let i = 0; i < tail.length - 1; i++) {
    f.add(capsule(tail[i][0], tail[i + 1][0], tail[i][1], tail[i + 1][1], {
      k: 0.045, scale: [0.82, 1, 1],
    }));
  }
  f.add(ellipsoid([0, 0.968, -0.056], [0.088, 0.08, 0.08], { k: 0.055 })); // tail root blend

  return f;
}

export function buildHeadField() {
  const f = new Field();

  // ---- braincase: tall and domed, widest at the temples -----------------------
  f.add(ellipsoid([0, 1.686, 0.004], [0.083, 0.079, 0.096], { k: 0.05 }));
  f.add(ellipsoid([0, 1.664, -0.05], [0.073, 0.068, 0.058], { k: 0.05 }));   // occiput
  f.add(ellipsoid([0, 1.742, -0.014], [0.058, 0.022, 0.066], { k: 0.032 })); // raised crown plate

  // ---- brow / eye ridges -------------------------------------------------------
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.0585, 1.7235, 0.044], [0.035, 0.018, 0.038], { k: 0.024 })); // brow shelf
    f.add(ellipsoid([s * 0.0755, 1.686, 0.022], [0.021, 0.05, 0.056], { k: 0.035 }));  // temple
  }

  // ---- muzzle: squared blocks, not tubes. The reference snout is a box with a
  // level top and near-parallel sides; capsules give a drooping bulb instead. -----
  f.add(roundBox([0, 1.6555, 0.108], [0.038, 0.023, 0.062], 0.017, { k: 0.045 }));
  f.add(roundBox([0, 1.6545, 0.186], [0.028, 0.018, 0.024], 0.014, { k: 0.030 }));
  f.add(capsule([0, 1.6845, 0.07], [0, 1.6805, 0.196], 0.030, 0.019,
    { k: 0.020, scale: [1, 0.72, 1] }));                                      // nasal bridge ridge
  f.add(ellipsoid([0, 1.6535, 0.2165], [0.0225, 0.0162, 0.0125], { k: 0.011 })); // nose pad

  // ---- lower jaw: deep and straight, turning up at a visible hinge --------------
  f.add(roundBox([0, 1.6035, 0.106], [0.034, 0.018, 0.060], 0.016, { k: 0.042 }));
  f.add(roundBox([0, 1.6055, 0.178], [0.025, 0.014, 0.022], 0.013, { k: 0.028 }));
  f.add(ellipsoid([0, 1.6105, 0.196], [0.024, 0.019, 0.020], { k: 0.016 }));   // chin
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.0575, 1.6425, 0.048], [0.033, 0.048, 0.068], { k: 0.048 })); // cheek / masseter
    f.add(ellipsoid([s * 0.0725, 1.6445, -0.008], [0.029, 0.054, 0.044], { k: 0.032 })); // jaw hinge
  }

  // ---- throat / neck (overlaps the body bake) ------------------------------------
  f.add(ellipsoid([0, 1.5955, 0.05], [0.062, 0.045, 0.058], { k: 0.05 }));
  f.add(capsule([0, 1.472, -0.012], [0, 1.578, 0.012], 0.088, 0.078, { k: 0.05 }));

  // ---- cuts ------------------------------------------------------------------
  for (const s of [1, -1]) {
        // A LENS-shaped cut, not a round crater: the skin left above and below forms
    // the upper and lower lids, so the eyeball is clipped the way a real eye is.
    f.sub(ellipsoid([s * EYE.c[0], EYE.c[1] + 0.0015, EYE.c[2] + 0.010],
      [0.0335, 0.0182, 0.032], { k: 0.006 }));
    // a lid rim above and below, so the opening reads as lidded rather than as a crater
    f.add(ellipsoid([s * 0.0575, 1.7155, 0.0625], [0.0300, 0.0072, 0.0250], { k: 0.007 }));
    f.add(ellipsoid([s * 0.0565, 1.6795, 0.0635], [0.0280, 0.0060, 0.0230], { k: 0.007 }));
  }
  // mouth crease — rises toward the jaw hinge like a real reptile jaw line
  f.sub(creaseSlot((z) => 1.6215 + (0.200 - z) * 0.062, 0.0016, [0.032, 0.212], 0.084,
    { k: 0.0045, yMin: 1.56, yMax: 1.68 }));
  // nostrils
  for (const s of [1, -1]) {
    f.sub(ellipsoid([s * 0.0145, 1.6605, 0.2295], [0.0055, 0.004, 0.007], { k: 0.004 }));
  }
  // ear depression
  for (const s of [1, -1]) {
    f.sub(ellipsoid([s * 0.0885, 1.6665, -0.036], [0.008, 0.014, 0.011], { k: 0.006 }));
  }

  return f;
}

/**
 * Apply the head transform. Kept separate from buildHeadField() because features
 * (horns, spikes) are seated against the field with `raySurface` using
 * AUTHORING-space coordinates — seating against an already-transformed field
 * misses the surface and the features end up buried inside the skull.
 */
export function transformHeadField(f) {
  return f.scaleAbout(HEAD_XF.scale, HEAD_XF.pivot, HEAD_XF.offset);
}
