// The SDF description of the Argonian's body and head.
// Two separate bakes: a coarse one for the body, a fine one for the head (which
// carries all the silhouette-critical detail). They overlap deep inside the neck,
// so the join is never visible.
//
// Head proportions target the references: length : height : width ≈ 1.6 : 1 : 0.9,
// i.e. long-snouted but with a tall braincase and a deep jaw — NOT a flat plank.
import { Field, capsule, ellipsoid, roundBox } from '../core/sdf.js';

export const EYE = {
  c: [0.0585, 1.6975, 0.0755],   // mirrored on x
  r: 0.0208,
  gaze: [0.34, 0.05, 0.939],     // outward/forward gaze axis for the left(+x) eye
};

// One knob for overall head size. Head anatomy, horns, spikes, teeth and eyes are
// all authored at scale 1 and pushed through this transform, and the skin shader
// undoes it to evaluate its head masks, so the whole head resizes coherently.
export const HEAD_XF = { scale: 1.0, pivot: [0, 1.578, 0.028] };

export function headPoint(p) {
  const { scale: s, pivot: c } = HEAD_XF;
  return [c[0] + (p[0] - c[0]) * s, c[1] + (p[1] - c[1]) * s, c[2] + (p[2] - c[2]) * s];
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
  f.add(ellipsoid([0, 1.378, -0.06], [0.122, 0.078, 0.058], { k: 0.06 })); // trapezius mass
  f.add(ellipsoid([0, 0.95, -0.062], [0.146, 0.09, 0.07], { k: K }));      // glutes

  // ---- neck (continues up into the head bake) --------------------------------
  f.add(capsule([0, 1.39, -0.018], [0, 1.575, 0.012], 0.092, 0.08, { k: 0.05 }));

  // ---- arms ------------------------------------------------------------------
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.186, 1.392, -0.004], [0.062, 0.072, 0.064], { k: 0.03 })); // deltoid
    f.add(capsule([s * 0.19, 1.388, 0], [s * 0.208, 1.145, -0.014], 0.05, 0.039, { k: 0.026 }));
    f.add(ellipsoid([s * 0.199, 1.275, -0.005], [0.047, 0.068, 0.048], { k: 0.03 }));  // biceps
    f.add(capsule([s * 0.208, 1.145, -0.014], [s * 0.216, 0.892, 0.014], 0.044, 0.029, { k: 0.026 }));
    f.add(ellipsoid([s * 0.211, 1.074, -0.008], [0.041, 0.06, 0.043], { k: 0.03 }));   // forearm swell
    // palm: a mitten; individual fingers are swept separately at higher detail
    f.add(roundBox([s * 0.217, 0.822, 0.01], [0.014, 0.036, 0.036], 0.016, { k: 0.03 }));
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

  // ---- braincase: tall and domed, widest at the temples -----------------------
  f.add(ellipsoid([0, 1.686, 0.004], [0.083, 0.079, 0.096], { k: 0.05 }));
  f.add(ellipsoid([0, 1.664, -0.05], [0.073, 0.068, 0.058], { k: 0.05 }));   // occiput
  f.add(ellipsoid([0, 1.742, -0.014], [0.058, 0.022, 0.066], { k: 0.032 })); // raised crown plate

  // ---- brow / eye ridges -------------------------------------------------------
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.058, 1.7175, 0.052], [0.036, 0.021, 0.044], { k: 0.028 })); // brow shelf
    f.add(ellipsoid([s * 0.0755, 1.686, 0.022], [0.021, 0.05, 0.056], { k: 0.035 }));  // temple
  }

  // ---- muzzle ------------------------------------------------------------------
  f.add(capsule([0, 1.6705, 0.058], [0, 1.6525, 0.2075], 0.0635, 0.0335,
    { k: 0.038, scale: [1, 0.76, 1] }));
  f.add(capsule([0, 1.6885, 0.07], [0, 1.6665, 0.196], 0.031, 0.018,
    { k: 0.028, scale: [1, 0.8, 1] }));                                       // nasal bridge ridge
  f.add(ellipsoid([0, 1.6555, 0.2155], [0.0355, 0.0245, 0.0205], { k: 0.022 })); // nose pad

  // ---- lower jaw: deep, giving the head real height ------------------------------
  f.add(capsule([0, 1.6115, 0.052], [0, 1.6055, 0.1955], 0.0585, 0.0305,
    { k: 0.038, scale: [1, 0.68, 1] }));
  f.add(ellipsoid([0, 1.612, 0.176], [0.033, 0.024, 0.036], { k: 0.028 }));   // chin
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.0625, 1.6385, 0.036], [0.031, 0.05, 0.061], { k: 0.038 })); // cheek / masseter
    f.add(ellipsoid([s * 0.0715, 1.6485, -0.012], [0.028, 0.05, 0.047], { k: 0.042 })); // jaw hinge
  }

  // ---- throat / neck (overlaps the body bake) ------------------------------------
  f.add(ellipsoid([0, 1.5955, 0.05], [0.062, 0.045, 0.058], { k: 0.05 }));
  f.add(capsule([0, 1.43, -0.012], [0, 1.578, 0.012], 0.086, 0.074, { k: 0.055 }));

  // ---- cuts ------------------------------------------------------------------
  for (const s of [1, -1]) {
    f.sub(ellipsoid([s * EYE.c[0], EYE.c[1], EYE.c[2]], [0.027, 0.025, 0.026], { k: 0.014 }));
  }
  // mouth crease — a thin slot, just enough to read as a closed lip line
  f.sub(roundBox([0, 1.6155, 0.15], [0.082, 0.001, 0.096], 0.002, { k: 0.005 }));
  // nostrils
  for (const s of [1, -1]) {
    f.sub(ellipsoid([s * 0.0145, 1.6605, 0.2295], [0.0055, 0.004, 0.007], { k: 0.004 }));
  }
  // ear depression
  for (const s of [1, -1]) {
    f.sub(ellipsoid([s * 0.0885, 1.6665, -0.036], [0.008, 0.014, 0.011], { k: 0.006 }));
  }

  return f.scaleAbout(HEAD_XF.scale, HEAD_XF.pivot);
}
