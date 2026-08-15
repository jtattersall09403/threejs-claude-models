// The SDF description of the Argonian's body and head.
// Two separate bakes: a coarse one for the body, a fine one for the head (which
// carries all the silhouette-critical detail). They overlap deep inside the neck,
// so the join is never visible.
import { Field, capsule, ellipsoid, roundBox } from '../core/sdf.js';

export const EYE = {
  c: [0.0555, 1.6635, 0.0885],   // mirrored on x
  r: 0.0198,
  gaze: [0.30, 0.02, 0.954],     // outward/forward gaze axis for the left(+x) eye
};

// One knob for overall head size. Head anatomy, horns, spikes, teeth and eyes are
// all authored at scale 1 and pushed through this transform, and the skin shader
// undoes it to evaluate its head masks, so the whole head resizes coherently.
export const HEAD_XF = { scale: 1.16, pivot: [0, 1.578, 0.028] };

export function headPoint(p) {
  const { scale: s, pivot: c } = HEAD_XF;
  return [c[0] + (p[0] - c[0]) * s, c[1] + (p[1] - c[1]) * s, c[2] + (p[2] - c[2]) * s];
}

export const EYE_WORLD = headPoint(EYE.c);

export const BODY_BOUNDS = [-0.34, -0.03, -0.62, 0.34, 1.50, 0.24];
const HEAD_BOX = [-0.175, 1.37, -0.16, 0.175, 1.80, 0.30];
export const HEAD_BOUNDS = [
  ...headPoint([HEAD_BOX[0], HEAD_BOX[1], HEAD_BOX[2]]),
  ...headPoint([HEAD_BOX[3], HEAD_BOX[4], HEAD_BOX[5]]),
];

export function buildBodyField() {
  const f = new Field();
  const K = 0.055;

  // ---- torso ----------------------------------------------------------------
  f.add(ellipsoid([0, 0.985, 0.005], [0.137, 0.108, 0.1], { k: K }));      // pelvis
  f.add(ellipsoid([0, 1.085, 0.012], [0.124, 0.092, 0.096], { k: K }));    // waist
  f.add(ellipsoid([0, 1.225, 0.008], [0.152, 0.128, 0.108], { k: K }));    // ribcage
  f.add(ellipsoid([0, 1.305, 0.0], [0.145, 0.085, 0.1], { k: K }));        // upper chest
  f.add(capsule([-0.142, 1.346, -0.002], [0.142, 1.346, -0.002], 0.072, 0.072, { k: 0.045 })); // clavicle/traps
  f.add(ellipsoid([0, 1.335, -0.055], [0.11, 0.075, 0.055], { k: 0.06 })); // trapezius mass
  f.add(ellipsoid([0, 0.95, -0.06], [0.145, 0.09, 0.07], { k: K }));       // glutes

  // ---- neck (continues up into the head bake) --------------------------------
  f.add(capsule([0, 1.35, -0.015], [0, 1.545, 0.014], 0.088, 0.079, { k: 0.05 }));

  // ---- arms ------------------------------------------------------------------
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.172, 1.348, -0.002], [0.058, 0.068, 0.060], { k: 0.028 })); // deltoid
    f.add(capsule([s * 0.178, 1.345, 0], [s * 0.196, 1.108, -0.012], 0.048, 0.038, { k: 0.026 }));
    f.add(ellipsoid([s * 0.187, 1.238, -0.004], [0.045, 0.066, 0.046], { k: 0.03 }));   // biceps
    f.add(capsule([s * 0.196, 1.108, -0.012], [s * 0.206, 0.858, 0.016], 0.043, 0.028, { k: 0.026 }));
    f.add(ellipsoid([s * 0.199, 1.04, -0.008], [0.040, 0.058, 0.042], { k: 0.03 }));  // forearm swell
    // palm: a mitten; individual fingers are swept separately at higher detail
    f.add(roundBox([s * 0.207, 0.788, 0.012], [0.014, 0.036, 0.036], 0.016, { k: 0.03 }));
  }

  // ---- legs ------------------------------------------------------------------
  for (const s of [1, -1]) {
    f.add(capsule([s * 0.088, 0.955, 0], [s * 0.098, 0.53, 0.012], 0.09, 0.056, { k: 0.05 }));
    f.add(ellipsoid([s * 0.092, 0.78, 0.012], [0.078, 0.13, 0.082], { k: 0.06 }));   // quad
    f.add(capsule([s * 0.098, 0.53, 0.012], [s * 0.1, 0.105, -0.012], 0.058, 0.033, { k: 0.045 }));
    f.add(ellipsoid([s * 0.1, 0.415, -0.028], [0.05, 0.085, 0.05], { k: 0.055 }));   // calf
    f.add(roundBox([s * 0.101, 0.048, 0.028], [0.032, 0.022, 0.085], 0.028, { k: 0.04 })); // foot
  }

  // ---- tail ------------------------------------------------------------------
  const tail = [
    [[0, 0.985, -0.085], 0.09],
    [[0, 0.925, -0.215], 0.072],
    [[0, 0.83, -0.335], 0.055],
    [[0, 0.7, -0.435], 0.04],
    [[0, 0.555, -0.5], 0.026],
    [[0, 0.415, -0.525], 0.013],
  ];
  for (let i = 0; i < tail.length - 1; i++) {
    f.add(capsule(tail[i][0], tail[i + 1][0], tail[i][1], tail[i + 1][1], {
      k: 0.045, scale: [0.82, 1, 1],
    }));
  }
  f.add(ellipsoid([0, 0.98, -0.06], [0.1, 0.09, 0.09], { k: 0.06 })); // tail root blend

  return f;
}

export function buildHeadField() {
  const f = new Field();

  // ---- braincase --------------------------------------------------------------
  f.add(ellipsoid([0, 1.6415, 0.014], [0.0905, 0.0585, 0.1005], { k: 0.05 }));
  f.add(ellipsoid([0, 1.6255, -0.048], [0.079, 0.058, 0.062], { k: 0.05 }));  // occiput
  f.add(ellipsoid([0, 1.6795, -0.008], [0.062, 0.021, 0.07], { k: 0.035 }));  // raised crown plate

  // ---- brow / eye ridges -------------------------------------------------------
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.0555, 1.6805, 0.062], [0.036, 0.021, 0.045], { k: 0.03 })); // brow shelf
    f.add(ellipsoid([s * 0.0715, 1.657, 0.036], [0.021, 0.036, 0.05], { k: 0.035 }));  // temple
  }

  // ---- muzzle ------------------------------------------------------------------
  f.add(capsule([0, 1.6435, 0.060], [0, 1.6255, 0.2555], 0.0655, 0.0335,
    { k: 0.04, scale: [1, 0.62, 1] }));
  f.add(capsule([0, 1.6605, 0.075], [0, 1.6425, 0.221], 0.031, 0.019,
    { k: 0.03, scale: [1, 0.72, 1] }));                                        // nasal bridge ridge
  f.add(ellipsoid([0, 1.6305, 0.2525], [0.037, 0.0225, 0.019], { k: 0.025 }));  // nose pad

  // ---- lower jaw ----------------------------------------------------------------
  f.add(capsule([0, 1.5945, 0.056], [0, 1.5865, 0.2415], 0.059, 0.0315,
    { k: 0.04, scale: [1, 0.56, 1] }));
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.0625, 1.6125, 0.048], [0.031, 0.041, 0.058], { k: 0.04 })); // cheek
    f.add(ellipsoid([s * 0.0705, 1.6055, -0.004], [0.03, 0.044, 0.046], { k: 0.045 })); // jaw hinge
  }

  // ---- throat / neck (overlaps the body bake) ------------------------------------
  f.add(ellipsoid([0, 1.5725, 0.055], [0.062, 0.045, 0.062], { k: 0.05 }));
  f.add(capsule([0, 1.4, -0.006], [0, 1.556, 0.012], 0.081, 0.07, { k: 0.055 }));

  // ---- cuts ------------------------------------------------------------------
  // eye sockets
  for (const s of [1, -1]) {
    f.sub(ellipsoid([s * EYE.c[0], EYE.c[1], EYE.c[2]], [0.026, 0.024, 0.026], { k: 0.014 }));
  }
  // mouth crease
  f.sub(roundBox([0, 1.5998, 0.168], [0.086, 0.0011, 0.1], 0.0022, { k: 0.005 }));
  // nostrils
  for (const s of [1, -1]) {
    f.sub(ellipsoid([s * 0.0165, 1.6395, 0.2455], [0.0062, 0.0048, 0.008], { k: 0.005 }));
  }
  // ear depression
  for (const s of [1, -1]) {
    f.sub(ellipsoid([s * 0.0905, 1.633, -0.032], [0.008, 0.014, 0.011], { k: 0.006 }));
  }

  return f.scaleAbout(HEAD_XF.scale, HEAD_XF.pivot);
}
