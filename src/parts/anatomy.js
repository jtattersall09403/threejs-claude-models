// The SDF description of the Argonian's body and head.
// Two separate bakes: a coarse one for the body, a fine one for the head (which
// carries all the silhouette-critical detail). They overlap deep inside the neck,
// so the join is never visible.
//
// Head proportions target the references: length : height : width ≈ 1.6 : 1 : 0.9,
// i.e. long-snouted but with a tall braincase and a deep jaw — NOT a flat plank.
//
// Measured off the front reference: skull width is 0.69 of skull height (crown to
// chin), and the width at the mouth line is 0.58 of the width at the eyes. Getting
// EITHER of those wrong makes the head read as a rectangular box no matter how much
// detail is painted on it — that is the failure mode this file keeps falling into.
import { Field, capsule, ellipsoid, roundBox, creaseSlot } from '../core/sdf.js';

export const EYE = {
  c: [0.0468, 1.6975, 0.0705],   // mirrored on x
  r: 0.0196,
  gaze: [0.16, 0.0, 0.987],      // outward/forward gaze axis for the left(+x) eye
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

// The mouth line. The geometry cut and the shader's lip paint MUST share this or
// the dark line drifts off the groove and smears onto the cheek.
export const LIP = { y0: 1.6145, z0: 0.166, slope: 0.115 };

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
  f.add(capsule([0, 1.375, -0.02], [0, 1.535, 0.012], 0.098, 0.058, { k: 0.055 }));

  // ---- arms ------------------------------------------------------------------
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.186, 1.392, -0.004], [0.062, 0.072, 0.064], { k: 0.03 })); // deltoid
    f.add(capsule([s * 0.192, 1.388, 0], [s * 0.211, 1.145, -0.014], 0.05, 0.039, { k: 0.026 }));
    f.add(ellipsoid([s * 0.199, 1.275, -0.005], [0.047, 0.068, 0.048], { k: 0.03 }));  // biceps
    f.add(capsule([s * 0.211, 1.145, -0.014], [s * 0.228, 0.892, 0.012], 0.044, 0.029, { k: 0.026 }));
    f.add(ellipsoid([s * 0.216, 1.074, -0.008], [0.041, 0.06, 0.043], { k: 0.03 }));   // forearm swell
    // palm: a mitten; individual fingers are swept separately at higher detail
    f.add(roundBox([s * 0.229, 0.826, 0.004], [0.0095, 0.028, 0.026], 0.030, { k: 0.03 }));
    f.add(ellipsoid([s * 0.2235, 0.840, 0.030], [0.020, 0.030, 0.024], { k: 0.028 })); // thenar
    f.add(capsule([s * 0.2265, 0.842, 0.018], [s * 0.222, 0.828, 0.040], 0.017, 0.014, { k: 0.024 })); // thumb metacarpal
    f.add(capsule([s * 0.231, 0.798, 0.040], [s * 0.2265, 0.794, -0.040], 0.0125, 0.0105, { k: 0.018 })); // knuckles
  }

  // ---- legs ------------------------------------------------------------------
  for (const s of [1, -1]) {
    f.add(capsule([s * 0.078, 0.955, 0], [s * 0.086, 0.53, 0.012], 0.091, 0.056, { k: 0.05 }));
    f.add(ellipsoid([s * 0.082, 0.78, 0.012], [0.079, 0.13, 0.083], { k: 0.06 }));   // quad
    f.add(capsule([s * 0.086, 0.53, 0.012], [s * 0.089, 0.105, -0.012], 0.058, 0.033, { k: 0.045 }));
        f.add(ellipsoid([s * 0.086, 0.522, 0.020], [0.052, 0.038, 0.050], { k: 0.035 }));   // knee
    f.add(ellipsoid([s * 0.089, 0.432, -0.034], [0.049, 0.082, 0.048], { k: 0.05 }));     // calf
    f.add(roundBox([s * 0.090, 0.048, 0.028], [0.032, 0.022, 0.085], 0.028, { k: 0.04 })); // foot
  }

  // ---- tail ------------------------------------------------------------------
  const tail = [
    [[0, 0.940, -0.118], 0.062],
    [[0, 0.838, -0.272], 0.048],
    [[0, 0.694, -0.396], 0.036],
    [[0, 0.542, -0.468], 0.026],
    [[0, 0.398, -0.480], 0.017],
    [[0, 0.272, -0.440], 0.008],
  ];
  for (let i = 0; i < tail.length - 1; i++) {
    f.add(capsule(tail[i][0], tail[i + 1][0], tail[i][1], tail[i + 1][1], {
      k: 0.045, scale: [0.82, 1, 1],
    }));
  }
  f.add(ellipsoid([0, 0.962, -0.054], [0.078, 0.072, 0.072], { k: 0.05 })); // tail root blend

  return f;
}

export function buildHeadField() {
  const f = new Field();

  // ---- braincase: tall and domed, widest at the temples -----------------------
  f.add(ellipsoid([0, 1.684, -0.010], [0.0605, 0.072, 0.101], { k: 0.055 }));
  f.add(ellipsoid([0, 1.668, -0.052], [0.047, 0.054, 0.052], { k: 0.05 }));  // domed occiput
  f.add(ellipsoid([0, 1.742, -0.014], [0.043, 0.023, 0.066], { k: 0.030 })); // raised crown plate

  // ---- brow / eye ridges -------------------------------------------------------
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.0455, 1.7195, 0.058], [0.028, 0.018, 0.040], { k: 0.022 })); // brow shelf
    f.add(ellipsoid([s * 0.0545, 1.686, 0.022], [0.016, 0.052, 0.057], { k: 0.035 }));  // temple
  }

  // ---- muzzle: squared blocks, not tubes. The reference snout is a box with a
  // level top and near-parallel sides; capsules give a drooping bulb instead. -----
  f.add(roundBox([0, 1.6555, 0.076], [0.026, 0.024, 0.032], 0.015, { k: 0.048 }));
  f.add(roundBox([0, 1.6552, 0.126], [0.0195, 0.019, 0.024], 0.0125, { k: 0.032 }));
  f.add(roundBox([0, 1.6545, 0.162], [0.0125, 0.013, 0.017], 0.0098, { k: 0.024 }));
  f.add(capsule([0, 1.6935, 0.026], [0, 1.6795, 0.162], 0.024, 0.014,
    { k: 0.024, scale: [1, 0.72, 1] }));                                      // nasal bridge ridge
  f.add(ellipsoid([0, 1.6545, 0.1765], [0.0175, 0.0155, 0.0135], { k: 0.014 })); // nose pad

  // ---- lower jaw: deep and straight, turning up at a visible hinge --------------
  // Narrower than the upper muzzle at every station, so the jaw tucks under the lip
  // instead of squaring off flush with it.
  f.add(roundBox([0, 1.5935, 0.076], [0.0225, 0.020, 0.032], 0.014, { k: 0.046 }));
  f.add(roundBox([0, 1.5950, 0.124], [0.0175, 0.018, 0.024], 0.0118, { k: 0.032 }));
  f.add(roundBox([0, 1.5960, 0.158], [0.0122, 0.014, 0.017], 0.0098, { k: 0.024 }));
  f.add(ellipsoid([0, 1.6010, 0.160], [0.016, 0.016, 0.017], { k: 0.014 }));   // chin
  // The cheeks are the whole reason the head reads as a box or as a snouted skull.
  // Kept narrow and swept BACK: in the reference the face steps in hard below the
  // eyes, so the muzzle — not the jaw — is what you see from the front.
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.0305, 1.6335, 0.014], [0.0140, 0.044, 0.046], { k: 0.048 })); // cheek / masseter
    f.add(ellipsoid([s * 0.0430, 1.6405, -0.022], [0.0155, 0.050, 0.038], { k: 0.032 })); // jaw hinge
  }

  // ---- throat / neck (overlaps the body bake) ------------------------------------
  // Kept narrower than the jaw. When the neck matched the skull for width the head
  // and neck fused into one vertical box and the jaw line vanished.
  f.add(ellipsoid([0, 1.5855, 0.046], [0.052, 0.042, 0.053], { k: 0.05 }));
  f.add(capsule([0, 1.462, -0.012], [0, 1.578, 0.012], 0.070, 0.056, { k: 0.05 }));

  // ---- cuts ------------------------------------------------------------------
  for (const s of [1, -1]) {
        // A LENS-shaped cut, not a round crater: the skin left above and below forms
    // the upper and lower lids, so the eyeball is clipped the way a real eye is.
    f.sub(ellipsoid([s * EYE.c[0], EYE.c[1] + 0.0015, EYE.c[2] + 0.008],
      [0.0255, 0.0175, 0.029], { k: 0.006 }));
    // a lid rim above and below, so the opening reads as lidded rather than as a crater
    f.add(ellipsoid([s * 0.0490, 1.7150, 0.0620], [0.0270, 0.0070, 0.0245], { k: 0.007 }));
    f.add(ellipsoid([s * 0.0482, 1.6800, 0.0630], [0.0250, 0.0058, 0.0225], { k: 0.007 }));
  }
  // mouth crease — rises toward the jaw hinge like a real reptile jaw line
  f.sub(creaseSlot((z) => LIP.y0 + (LIP.z0 - z) * LIP.slope, 0.0024, [-0.005, 0.176], 0.058,
    { k: 0.0045, yMin: 1.56, yMax: 1.68 }));
  // nostrils — at the old size they were below the bake resolution and invisible
  for (const s of [1, -1]) {
    f.sub(ellipsoid([s * 0.0098, 1.6630, 0.1755], [0.0056, 0.0070, 0.0118], { k: 0.0035 }));
  }
  // ear depression
  for (const s of [1, -1]) {
    f.sub(ellipsoid([s * 0.0745, 1.6665, -0.036], [0.008, 0.014, 0.011], { k: 0.006 }));
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
