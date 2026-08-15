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

export const BODY_BOUNDS = [-0.34, -0.03, -0.62, 0.34, 1.50, 0.24];
export const HEAD_BOUNDS = [-0.175, 1.37, -0.155, 0.175, 1.80, 0.30];

export function buildBodyField() {
  const f = new Field();
  const K = 0.055;

  // ---- torso ----------------------------------------------------------------
  f.add(ellipsoid([0, 0.985, 0.005], [0.137, 0.108, 0.1], { k: K }));      // pelvis
  f.add(ellipsoid([0, 1.085, 0.012], [0.124, 0.092, 0.096], { k: K }));    // waist
  f.add(ellipsoid([0, 1.225, 0.008], [0.152, 0.128, 0.108], { k: K }));    // ribcage
  f.add(ellipsoid([0, 1.305, 0.0], [0.145, 0.085, 0.1], { k: K }));        // upper chest
  f.add(capsule([-0.15, 1.352, -0.002], [0.15, 1.352, -0.002], 0.078, 0.078, { k: 0.06 })); // clavicle/traps
  f.add(ellipsoid([0, 1.335, -0.055], [0.11, 0.075, 0.055], { k: 0.06 })); // trapezius mass
  f.add(ellipsoid([0, 0.95, -0.06], [0.145, 0.09, 0.07], { k: K }));       // glutes

  // ---- neck (continues up into the head bake) --------------------------------
  f.add(capsule([0, 1.36, -0.012], [0, 1.55, 0.012], 0.082, 0.072, { k: 0.05 }));

  // ---- arms ------------------------------------------------------------------
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.168, 1.35, -0.002], [0.063, 0.072, 0.066], { k: 0.05 })); // deltoid
    f.add(capsule([s * 0.176, 1.35, 0], [s * 0.196, 1.108, -0.012], 0.052, 0.041, { k: 0.045 }));
    f.add(ellipsoid([s * 0.185, 1.24, -0.004], [0.05, 0.07, 0.05], { k: 0.05 }));    // biceps
    f.add(capsule([s * 0.196, 1.108, -0.012], [s * 0.206, 0.858, 0.016], 0.046, 0.03, { k: 0.04 }));
    f.add(ellipsoid([s * 0.199, 1.04, -0.008], [0.043, 0.06, 0.045], { k: 0.05 }));  // forearm swell
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
  f.add(ellipsoid([0, 1.6425, 0.018], [0.0885, 0.0625, 0.0985], { k: 0.05 }));
  f.add(ellipsoid([0, 1.6255, -0.048], [0.079, 0.058, 0.062], { k: 0.05 }));  // occiput
  f.add(ellipsoid([0, 1.6795, -0.008], [0.062, 0.021, 0.07], { k: 0.035 }));  // raised crown plate

  // ---- brow / eye ridges -------------------------------------------------------
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.0555, 1.6805, 0.062], [0.036, 0.021, 0.045], { k: 0.03 })); // brow shelf
    f.add(ellipsoid([s * 0.0715, 1.657, 0.036], [0.021, 0.036, 0.05], { k: 0.035 }));  // temple
  }

  // ---- muzzle ------------------------------------------------------------------
  f.add(capsule([0, 1.6455, 0.062], [0, 1.6285, 0.2405], 0.0645, 0.0345,
    { k: 0.04, scale: [1, 0.66, 1] }));
  f.add(capsule([0, 1.6605, 0.075], [0, 1.6425, 0.221], 0.031, 0.019,
    { k: 0.03, scale: [1, 0.72, 1] }));                                        // nasal bridge ridge
  f.add(ellipsoid([0, 1.6335, 0.2385], [0.038, 0.024, 0.021], { k: 0.025 }));  // nose pad

  // ---- lower jaw ----------------------------------------------------------------
  f.add(capsule([0, 1.5955, 0.058], [0, 1.5885, 0.2265], 0.058, 0.0325,
    { k: 0.04, scale: [1, 0.6, 1] }));
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
  f.sub(roundBox([0, 1.5995, 0.165], [0.09, 0.0016, 0.105], 0.003, { k: 0.007 }));
  // nostrils
  for (const s of [1, -1]) {
    f.sub(ellipsoid([s * 0.0175, 1.6385, 0.2465], [0.0085, 0.0065, 0.011], { k: 0.006 }));
  }
  // ear depression
  for (const s of [1, -1]) {
    f.sub(ellipsoid([s * 0.087, 1.634, -0.03], [0.014, 0.02, 0.016], { k: 0.008 }));
  }

  return f;
}
