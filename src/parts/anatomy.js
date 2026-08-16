// The SDF description of the Argonian's body and head.
// Two separate bakes: a coarse one for the body, a fine one for the head (which
// carries all the silhouette-critical detail). They overlap deep inside the neck,
// so the join is never visible.
//
// The reference face is BROAD — a wide shield seen from the front, widest across the
// temples and cheeks. Ours read as a narrow tower with a long snout, so the skull, the
// temples, the cheekbones, the jaw hinges and the eye spacing were all widened together.
// Head proportions target the references: length : height : width ≈ 1.6 : 1 : 0.9,
// i.e. long-snouted but with a tall braincase and a deep jaw — NOT a flat plank.
//
// Measured off the front reference: skull width is 0.69 of skull height (crown to
// chin), and the width at the mouth line is 0.58 of the width at the eyes. Getting
// EITHER of those wrong makes the head read as a rectangular box no matter how much
// detail is painted on it — that is the failure mode this file keeps falling into.
import { Field, capsule, ellipsoid, roundBox, creaseSlot } from '../core/sdf.js';
import { TAIL_SPINE } from '../rig/skeleton.js';

export const EYE = {
  c: [0.0512, 1.6975, 0.0688],   // mirrored on x
  r: 0.0180,   // The ball stays a decent size; what stops a free sphere edge showing
               // is the APERTURE being clearly smaller than the ball, below. Shrinking
               // and sinking the ball instead just makes the eye vanish.
  gaze: [0.055, 0.0, 0.9985],    // near-forward. At 0.16 outward the iris sat off to
                                 // one side and the front view showed a plain blob.
};

// One knob for overall head size. Head anatomy, horns, spikes, teeth and eyes are
// all authored at scale 1 and pushed through this transform, and the skin shader
// undoes it to evaluate its head masks, so the whole head resizes coherently.
// scale 1.16: measured against the full-body reference, head height against shoulder
// width was 0.38 where the reference is ~0.6. The head was reading as too small for
// the body from every full-length angle.
// 1.21. At 1.16 the head read as small on a heavy body in every full-length framing.
// TRAP 17: scaling the head moves the JAW but not the collar, so the cowl and the coat
// neckline have to be re-checked after any change here — and so do the head capture
// framings.
export const HEAD_XF = { scale: 1.21, pivot: [0, 1.578, 0.028], offset: [0, -0.030, 0.004] };

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
export const LIP = { y0: 1.6250, z0: 0.142, slope: 0.176 };

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
  // Depth, not just width. In profile the torso was a slab: the chest and the belly sat
  // in the same plane as the back, so from the side the figure had no barrel to it and
  // the coat hung off a plank.
  f.add(ellipsoid([0, 1.245, 0.012], [0.158, 0.135, 0.122], { k: K }));    // ribcage
  f.add(ellipsoid([0, 1.330, 0.030], [0.130, 0.072, 0.098], { k: 0.05 })); // pectoral shelf
  f.add(ellipsoid([0, 1.345, 0.0], [0.152, 0.09, 0.112], { k: K }));       // upper chest
  f.add(capsule([-0.166, 1.390, -0.004], [0.166, 1.390, -0.004], 0.074, 0.074, { k: 0.045 }));
  f.add(ellipsoid([0, 1.376, -0.055], [0.140, 0.082, 0.070], { k: 0.06 })); // trapezius mass
  f.add(ellipsoid([0, 0.95, -0.062], [0.146, 0.09, 0.07], { k: K }));      // glutes

  // ---- neck (continues up into the head bake) --------------------------------
  // STOPS BELOW THE HEAD BAKE. The two bakes overlap inside the neck, and the body's
  // is the coarse one (6.2 mm cells, body-shaded, body scale frequency). Run up to
  // y 1.535 at r 0.066 it matched the head's own throat radius almost exactly and won
  // the overlap in patches, so the underside of the jaw rendered as a smooth pale
  // untextured balloon while the sides of the same jaw were finely scaled. Three
  // attempts to fix that "pale throat" in the shader were chasing the wrong surface.
  f.add(capsule([0, 1.375, -0.02], [0, 1.492, 0.008], 0.100, 0.054, { k: 0.055 }));

  // ---- arms ------------------------------------------------------------------
  for (const s of [1, -1]) {
    // The deltoid is the shoulder CORNER: it has to sit outboard of the joint, so the
    // top line runs out flat from the neck and then turns down. FLAT in section, not a
    // ball — a near-spherical deltoid puts a hemispherical cap on top of the sleeve and
    // the coat renders a leg-of-mutton puff over it. The mass it loses in height is put
    // back below as a tail running down into the biceps.
    f.add(ellipsoid([s * 0.194, 1.386, -0.004], [0.072, 0.052, 0.070], { k: 0.03 })); // deltoid
    f.add(ellipsoid([s * 0.186, 1.330, -0.004], [0.055, 0.052, 0.058], { k: 0.03 })); // deltoid tail
    f.add(capsule([s * 0.203, 1.388, 0], [s * 0.222, 1.145, -0.014], 0.05, 0.039, { k: 0.026 }));
    f.add(ellipsoid([s * 0.210, 1.275, -0.005], [0.047, 0.068, 0.048], { k: 0.03 }));  // biceps
    f.add(capsule([s * 0.222, 1.145, -0.014], [s * 0.239, 0.892, 0.012], 0.044, 0.029, { k: 0.026 }));
    f.add(ellipsoid([s * 0.227, 1.074, -0.008], [0.041, 0.06, 0.043], { k: 0.03 }));   // forearm swell
    // palm: a mitten; individual fingers are swept separately at higher detail
    // A flattened WEDGE, not a ball. At half-extent 0.024 plus a 0.024 round radius the
    // palm was 9.6 cm deep before smooth-min even inflated it, and the hand read as a
    // scaly knuckle-ball with cylinders radiating out of it.
    f.add(roundBox([s * 0.240, 0.828, 0.006], [0.0085, 0.028, 0.010], 0.012, { k: 0.012 }));
    f.add(ellipsoid([s * 0.2335, 0.842, 0.026], [0.013, 0.026, 0.017], { k: 0.012 })); // thenar
    f.add(capsule([s * 0.2375, 0.842, 0.018], [s * 0.233, 0.828, 0.040], 0.017, 0.014, { k: 0.024 })); // thumb metacarpal
    f.add(capsule([s * 0.242, 0.800, 0.040], [s * 0.2375, 0.796, -0.040], 0.0110, 0.0092, { k: 0.010 })); // knuckles
  }

  // ---- legs ------------------------------------------------------------------
  // Thighs are narrowed in x and deepened in z rather than simply slimmed: the mass has
  // to stay (this is a heavy figure) but it cannot cross the centreline, or smooth-min
  // fuses the two legs into a single column. `scale` squashes the distance field in x
  // only, so the section becomes an oval standing front-to-back.
  for (const s of [1, -1]) {
    f.add(capsule([s * 0.090, 0.955, 0], [s * 0.100, 0.53, 0.012], 0.088, 0.056,
      { k: 0.05, scale: [0.88, 1, 1.04] }));
    f.add(ellipsoid([s * 0.096, 0.78, 0.012], [0.075, 0.13, 0.088], { k: 0.06 }));   // quad
    f.add(capsule([s * 0.100, 0.53, 0.012], [s * 0.104, 0.105, -0.012], 0.058, 0.033, { k: 0.045 }));
    f.add(ellipsoid([s * 0.100, 0.522, 0.020], [0.052, 0.038, 0.050], { k: 0.035 }));   // knee
    f.add(ellipsoid([s * 0.104, 0.432, -0.034], [0.049, 0.082, 0.048], { k: 0.05 }));     // calf
    // Narrower and longer. At 12 cm across and 22.6 cm long the foot was a clog, and
    // the shoe built on top of it read as a wooden block from every low angle.
    f.add(roundBox([s * 0.105, 0.048, 0.034], [0.026, 0.022, 0.098], 0.024, { k: 0.04 })); // foot
  }

  // ---- tail ------------------------------------------------------------------
  // Thicker than it looks like it should be on paper: at the previous radii the tail
  // read as a flat strap hanging off the back rather than a heavy muscular counterweight.
  // Spine points come from the rig so the capsules and the bones that skin them can
  // never disagree; only the radii live here.
  const TAIL_R = [0.074, 0.058, 0.044, 0.032, 0.021, 0.010];
  const tail = TAIL_SPINE.map((p, i) => [p, TAIL_R[i]]);
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
  // TALLER THAN IT IS LONG-ISH. Traced over the profile reference the skull is a
  // compact rounded mass, length:height about 1.09. Ours ran to 1.4+: a long low
  // lozenge with the muzzle taking 39% of the length where the reference's takes 24%.
  f.add(ellipsoid([0, 1.7015, -0.006], [0.0724, 0.0925, 0.0930], { k: 0.055 }));
  f.add(ellipsoid([0, 1.6840, -0.046], [0.047, 0.062, 0.042], { k: 0.05 }));  // domed occiput
  // The rear of the skull DROPS STEEPLY from the crown in the annotated profile — the
  // back of the head and the back of the neck sit on roughly one vertical line. A
  // plain dome trails backwards instead and reads as a long low skull.
  f.add(capsule([0, 1.7480, -0.058], [0, 1.6280, -0.052], 0.0280, 0.0400,
    { k: 0.045, scale: [1.4, 1, 1] }));
  f.add(ellipsoid([0, 1.7790, -0.010], [0.048, 0.026, 0.062], { k: 0.030 })); // raised crown plate

  // ---- brow / eye ridges -------------------------------------------------------
  for (const s of [1, -1]) {
    // The brow's UNDERSIDE must clear the eye APERTURE, not merely sit above the eye's
    // centre. At y 1.7268 with a half-height of 0.0175 its underside was 1.7093, below
    // the aperture's top at 1.7117 — so the shelf ate the eye and the face read as a
    // visored helmet with two orange slits in it.
    f.add(ellipsoid([s * 0.0512, 1.7345, 0.070], [0.034, 0.0175, 0.048], { k: 0.026 }));  // brow shelf, outer
    f.add(ellipsoid([s * 0.0280, 1.7255, 0.086], [0.026, 0.0158, 0.040], { k: 0.024 })); // ...dipping inboard
    f.add(ellipsoid([s * 0.0630, 1.6905, 0.022], [0.018, 0.054, 0.055], { k: 0.035 }));  // temple
  }

  f.add(capsule([-0.030, 1.7285, 0.084], [0.030, 1.7285, 0.084], 0.0136, 0.0136,
    { k: 0.020, scale: [1, 0.72, 1] }));   // brow bar, bridging the two shelves

  // ---- snout ------------------------------------------------------------------
  // ONE CONTINUOUS TAPERING FORM flowing out of the braincase, not a stack of blocks.
  // The reference profile (corpus/character/face-left-profile.jpg) is a single
  // unbroken curve from crown, over the brow, down to the nose tip. Built as squared
  // blocks the snout reads as a DOG MUZZLE bolted onto a skull, which was the most
  // persistent likeness error in this project.
  //
  // Each station's TOP descends smoothly and its BOTTOM sits on the LIP line, so the
  // upper lip is continuous with the mouth cut and the section stays SHALLOW — the
  // reference snout is thin in vertical section, not a deep box.
  const snout = [
    // [z,     centre y, half-height, half-width]
    [0.044, 1.6740, 0.0342, 0.0400],
    [0.092, 1.6588, 0.0278, 0.0324],
    [0.128, 1.6462, 0.0222, 0.0252],
    [0.158, 1.6360, 0.0180, 0.0192],   // blunt, not pointed: the reference nose is round
  ];
  // The z-radius has to TAPER too. Held at 0.046 for every station after the first, the
  // last one reached z 0.19 as a fat bulb and the snout ended in a blunt vertical face;
  // the reference tapers to a rounded point with the nostril right at the tip.
  const snoutZR = [0.050, 0.044, 0.038, 0.028];
  for (let i = 0; i < snout.length; i++) {
    const [z, cy, hy, hx] = snout[i];
    f.add(ellipsoid([0, cy, z], [hx, hy, snoutZR[i]],
      { k: i === 0 ? 0.055 : 0.038 }));
  }
  // a low dorsal ridge riding the same curve — a crest, not a separate bridge
  // Starts UP ON THE BROW BAR, not behind it. The gap between the overhanging brow and
  // the first snout station left a concave notch at the bridge, and the user's pink
  // trace of the reference profile is one CONVEX sweep from lip to crown with no notch
  // in it at all.
  f.add(capsule([0, 1.7270, 0.074], [0, 1.6455, 0.140], 0.0168, 0.0080,
    { k: 0.026, scale: [1, 0.62, 1] }));
  f.add(ellipsoid([0, 1.6366, 0.1640], [0.0152, 0.0132, 0.0122], { k: 0.016 })); // nose pad

  // ---- lower jaw: deep and straight, turning up at a visible hinge --------------
  // Narrower than the upper muzzle at every station, so the jaw tucks under the lip
  // instead of squaring off flush with it.
  f.add(roundBox([0, 1.5995, 0.066], [0.0262, 0.0215, 0.029], 0.016, { k: 0.046 }));
  f.add(roundBox([0, 1.6015, 0.104], [0.0206, 0.019, 0.021], 0.0140, { k: 0.032 }));
  f.add(roundBox([0, 1.6036, 0.132], [0.0170, 0.0148, 0.016], 0.0118, { k: 0.024 }));
  f.add(ellipsoid([0, 1.6094, 0.134], [0.0208, 0.0166, 0.017], { k: 0.014 }));   // chin
  // The cheeks are the whole reason the head reads as a box or as a snouted skull.
  // Kept narrow and swept BACK: in the reference the face steps in hard below the
  // eyes, so the muzzle — not the jaw — is what you see from the front.
  for (const s of [1, -1]) {
    // cheekbone: a distinct ridge running back from under the eye to the hinge
    // Cheekbone: a pronounced ridge from under the eye back to the hinge. In the
    // references this catches light and is one of the head's clearest structures.
    f.add(ellipsoid([s * 0.0540, 1.6720, 0.036], [0.0165, 0.0135, 0.040], { k: 0.011 }));
    f.add(ellipsoid([s * 0.0580, 1.6660, -0.004], [0.0150, 0.0120, 0.030], { k: 0.011 }));
    f.add(ellipsoid([s * 0.0306, 1.6335, 0.014], [0.0148, 0.044, 0.046], { k: 0.048 })); // cheek / masseter
    f.add(ellipsoid([s * 0.0438, 1.6405, -0.022], [0.0158, 0.050, 0.038], { k: 0.032 })); // jaw hinge
  }

  // ---- throat / neck (overlaps the body bake) ------------------------------------
  // Kept narrower than the jaw. When the neck matched the skull for width the head
  // and neck fused into one vertical box and the jaw line vanished.
  // Small k, and set BACK and DOWN. Blended broadly into the jaw it erased the
  // jawline: the jaw, throat and neck fused into one continuous expanse of scale,
  // which is exactly what the references do NOT show — there the jaw is a distinct
  // mass with a hard lower edge and the neck sits shadowed underneath it.
  // Set further back and tucked under: the reference's neck disappears into a deep
  // shadow beneath the jawline rather than meeting it flush.
  f.add(ellipsoid([0, 1.5560, -0.004], [0.0375, 0.030, 0.040], { k: 0.014 }));
  // NARROWER THAN THE JAW. At 0.057 at the top the throat was wider than the jaw above
  // it, so from below the two fused into one broad column with no jawline at all — the
  // reference shows a jaw with a hard lower edge and a distinctly narrower neck under it.
  f.add(capsule([0, 1.448, -0.014], [0, 1.532, 0.008], 0.074, 0.0510, { k: 0.04 }));

  // ---- cuts ------------------------------------------------------------------
  for (const s of [1, -1]) {
        // A LENS-shaped cut, not a round crater: the skin left above and below forms
    // the upper and lower lids, so the eyeball is clipped the way a real eye is.
    // Bigger. Measured on the front reference the eye opening is about a fifth of the
    // head's width; ours was under an eighth and read as a bean rather than as the
    // large forward-facing almond that carries the whole expression.
    f.sub(ellipsoid([s * EYE.c[0], EYE.c[1] + 0.0015, EYE.c[2] + 0.008],
      [0.0264, 0.0152, 0.0286], { k: 0.006 }));
    // Lid rims above and below, so the opening reads as lidded rather than as a
    // crater. The upper lid is built from two lobes at different heights — outer
    // high, inner low — so the eye slants down toward the snout. The references'
    // whole expression comes from that angle; a level lid reads placid.
    f.add(ellipsoid([s * 0.0650, 1.7212, 0.0530], [0.0180, 0.0070, 0.0224], { k: 0.007 }));
    f.add(ellipsoid([s * 0.0426, 1.7118, 0.0680], [0.0194, 0.0068, 0.0228], { k: 0.007 }));
    f.add(ellipsoid([s * 0.0526, 1.6742, 0.0636], [0.0272, 0.0060, 0.0244], { k: 0.007 }));
  }
  // mouth crease — rises toward the jaw hinge like a real reptile jaw line
  // x-extent follows the muzzle's own half-width, narrowing toward the snout, so the
  // crease stays on the surface instead of running out past the corners of the mouth
  // halfT 0.0026 is ~1.7 head-bake cells — too shallow to survive polygonisation, so
  // the mouth reduced to a faint scale-row transition. Deepened to ~2.7 cells.
  f.sub(creaseSlot((z) => LIP.y0 + (LIP.z0 - z) * LIP.slope, 0.0042, [-0.005, 0.150],
    (z) => 0.046 - 0.155 * Math.max(0, z - 0.036),
    { k: 0.0045, yMin: 1.56, yMax: 1.68, xBound: 0.07 }));
  // nostrils — at the old size they were below the bake resolution and invisible
  for (const s of [1, -1]) {
    f.sub(ellipsoid([s * 0.0100, 1.6626, 0.1478], [0.0056, 0.0070, 0.0112], { k: 0.0035 }));
  }
  // ear depression
  for (const s of [1, -1]) {
    f.sub(ellipsoid([s * 0.0800, 1.6665, -0.036], [0.008, 0.014, 0.011], { k: 0.006 }));
  }
  // The round tympanic plate on the side of the skull — a clear disc in
  // face-left-profile.jpg, and one of the few landmarks that reads at profile
  // distance. A raised rim with a shallow dish inside it.
  for (const s of [1, -1]) {
    f.add(ellipsoid([s * 0.0685, 1.6790, -0.0330], [0.0075, 0.0215, 0.0215], { k: 0.008 }));
    f.sub(ellipsoid([s * 0.0735, 1.6790, -0.0330], [0.0075, 0.0148, 0.0148], { k: 0.005 }));
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
