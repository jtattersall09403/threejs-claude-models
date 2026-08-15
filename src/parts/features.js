// Hard, silhouette-defining parts that the voxel bake can't resolve:
// horns, crown/jaw spikes, teeth, claws, fingers and eyeballs.
import * as THREE from 'three';
import { sweep, curveRings, spike } from '../core/geom.js';
import { EYE } from './anatomy.js';
import { raySurface } from '../core/sdf.js';

export function fromGeometry(geo) {
  const pos = geo.attributes.position.array;
  const uv = geo.attributes.uv ? geo.attributes.uv.array : null;
  const nrm = geo.attributes.normal ? geo.attributes.normal.array : null;
  const idx = geo.index ? Array.from(geo.index.array) : [...Array(pos.length / 3).keys()];
  return { positions: pos, indices: idx, uvs: uv, normals: nrm };
}

// The horn pair. The reference horn is a LONG, SLENDER, sharply-tapered spar that
// sweeps up and back well clear of the skull — not a stubby tusk. Curve and radius
// live at module scope because the metal cuff is swept along the same pair.
const HORN_STEPS = 46;
const HORN_DIR = (s) => [s * 0.55, 0.72, 0.2];

function hornPts(s) {
  return [
    // Re-measured against face-left-profile.jpg rather than trusting the old note: in
    // the reference the horn runs ~0.86 of head length and rises ~36 deg above
    // horizontal. The points here had drifted to a FULL head length at 26 deg, which
    // is why the profile read as a pair of long backswept bull horns rather than the
    // reference's shorter, steeper sweep.
    [s * 0.0500, 1.7255, 0.004],
    [s * 0.0632, 1.7645, -0.030],
    [s * 0.0722, 1.8035, -0.076],
    [s * 0.0770, 1.8390, -0.128],
    [s * 0.0768, 1.8620, -0.170],
    [s * 0.0740, 1.8730, -0.200],
  ];
}

// Fine ring ridging concentrated near the base and gone by mid-length, as in the
// reference. Trap #10: keep the per-ring phase step under a radian — 38 rad over
// 46 rings is 0.84, so it reads as ridging rather than aliasing into a rope.
// 0.0158, not 0.0212. Measured off the profile reference the horn is about a
// twentieth of the head's length across at the base; at 0.0212 it read as a heavy
// bull horn and dominated the whole silhouette.
const hornRadius = (t) => (0.0158 * Math.pow(1 - t, 0.62) + 0.0008)
  * (1 + 0.055 * Math.sin(t * 38) * Math.max(0, 1 - t * 1.6));

function hornRings(side, field) {
  const pts = hornPts(side);
  pts[0] = seat(field, pts[0], HORN_DIR(side), 0.024);
  return curveRings(pts, hornRadius, HORN_STEPS, { tension: 0.5 });
}

/** The big rear-sweeping horn pair. uv.y carries the 0..1 run for shader banding. */
export function buildHorn(side, field) {
  const pts = hornPts(side);
  pts[0] = seat(field, pts[0], HORN_DIR(side), 0.024);
  const rings = curveRings(pts, hornRadius, HORN_STEPS, {
    tension: 0.5,
    profile: (a) => 1 + 0.10 * Math.cos(2 * a) - 0.04 * Math.cos(a),
  });
  return sweep(rings, { sides: 18, capEnd: false });
}

/**
 * The metal cuff clamped around each horn. Its own part so the horn shader can pick
 * it out by region and shade it as tarnished metal rather than keratin.
 */
export function buildHornCuff(side, field) {
  const full = hornRings(side, field);
  const a = Math.round(HORN_STEPS * 0.31), b = Math.round(HORN_STEPS * 0.45);
  const rings = full.slice(a, b + 1).map((ring, i, arr) => {
    const u = i / (arr.length - 1);
    // barrelled slightly, so it reads as a band clamped on rather than a swelling
    return { p: ring.p, r: ring.r * (1.20 + 0.06 * Math.sin(u * Math.PI)) };
  });
  return sweep(rings, { sides: 18 });
}

/**
 * Seat a feature on the skin: march out along `dir` to the real surface, then sink
 * the base back in by `inset`. Without this, blend-inflated surfaces swallow the
 * spikes and the horns look like stubs.
 */
function seat(field, p, dir, inset = 0.008) {
  if (!field) return p;
  const hit = raySurface(field, p, dir, { start: -0.09, max: 0.14 });
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  return [hit[0] - (dir[0] / l) * inset, hit[1] - (dir[1] / l) * inset, hit[2] - (dir[2] / l) * inset];
}

/** Cream crown spikes fanned across the top-rear of the skull. */
export function buildCrownSpikes(field) {
  const out = [];
  // The crest. Confirmed across face-left-profile, close-crop-face-front and
  // face-front-and-bust-proportions: a fan of FLAT dark-oxblood BLADES sweeping back
  // over the crown in two ranks — not a row of pale bone cones. Built as cones they
  // read as a tiara; built pale they compete with the horns for the eye.
  const defs = [
    // [x, y, z, length, radius]  — tallest at the centre, shrinking outboard
    [-0.0405, 1.7455, -0.010, 0.0300, 0.0092],
    [-0.0250, 1.7590, -0.016, 0.0430, 0.0110],
    [-0.0085, 1.7645, -0.022, 0.0500, 0.0118],
    [0.0085, 1.7645, -0.022, 0.0500, 0.0118],
    [0.0250, 1.7590, -0.016, 0.0430, 0.0110],
    [0.0405, 1.7455, -0.010, 0.0300, 0.0092],
    // a shorter second rank over the occiput, so the crest has depth from the side
    [-0.0230, 1.7330, -0.062, 0.0330, 0.0086],
    [-0.0075, 1.7395, -0.070, 0.0390, 0.0096],
    [0.0075, 1.7395, -0.070, 0.0390, 0.0096],
    [0.0230, 1.7330, -0.062, 0.0330, 0.0086],
  ];
  for (const [x, y, z, len, r] of defs) {
    const dir = [x * 3.2, 0.56, -0.83];   // lying BACK over the crown, not standing up
    out.push(spike(seat(field, [x, y, z], dir, 0.004), dir, len, r, {
      taper: 0.62, bend: [0, 0.003, -0.016], sides: 10, steps: 8, flat: 0.40,
    }));
  }
  return out;
}

/** Small spikes along the jaw line, cheek, brow and the back of the neck. */
export function buildJawSpikes(field) {
  const out = [];
  for (const s of [1, -1]) {
    // A continuous row running the length of the jaw. The references show four
    // clearly separated spikes a side, angled out and down so they break the
    // silhouette from the front as well as in profile.
    // THREE large flat blades, not a row of small cones. The profile reference shows
    // few, big, swept-back plates along the jaw — this is the reading the user flagged.
    // On the CHEEK PLANE at roughly mouth height, not down on the lower jaw edge —
    // seated low they sit behind the collar and never read at all.
    // They HANG DOWNWARD from the jaw hinge like short tusks — see
    // face-neck-jawline-closeup.jpg. Swept back along the cheek they read as a
    // fin; the reference's point down and slightly forward, clustered at the rear
    // of the jaw rather than running its whole length.
    const jaw = [
      [s * 0.0505, 1.6320, 0.000, 0.0560, 0.0165],
      [s * 0.0468, 1.6265, 0.040, 0.0505, 0.0150],
      [s * 0.0410, 1.6225, 0.076, 0.0420, 0.0128],
    ];
    for (const [x, y, z, len, r] of jaw) {
      const dir = [s * 0.40, -0.86, 0.12];
      out.push(spike(seat(field, [x, y, z], dir, 0.005), dir, len, r, {
        taper: 0.62, flat: 0.40, sides: 10, steps: 7, bend: [0, -0.004, 0.008],
      }));
    }
    // Cheek spikes. THREE, LARGE, swept back — measured off face-left-profile, where
    // they are roughly a sixth of the head's height each. There used to be nine spikes
    // a side here (three jaw tusks, two hinge nubs and a four-spike "frill"), and at
    // that count and size they read from any distance as a picket fence stapled round
    // the skull rather than as a few heavy keratin blades.
    for (const [p, dir, len, r] of [
      [[s * 0.0575, 1.6810, 0.020], [s * 0.80, 0.06, -0.60], 0.0420, 0.0112],
      [[s * 0.0605, 1.6640, 0.000], [s * 0.82, -0.06, -0.57], 0.0400, 0.0105],
      [[s * 0.0580, 1.6455, -0.012], [s * 0.78, -0.24, -0.58], 0.0340, 0.0092],
    ]) {
      out.push(spike(seat(field, p, dir, 0.004), dir, len, r, {
        taper: 0.72, flat: 0.52, sides: 10, steps: 7, bend: [0, -0.003, -0.008],
      }));
    }
    // brow scutes: three flat claw-like plates lying back along the brow ridge,
    // one of the most recognisable markings on the reference face
    // Longer and sharper than mere scutes: in the references these are proper
    // spines lying back along the brow ridge, and they carry a lot of the face's
    // character. Angled back rather than out, so they read against the skull.
    // They have to PROJECT, not lie down. Angled back along the brow at 0.006 radius
    // they were flush with the skull and invisible at profile distance; in every
    // reference crop this is a rank of pale claws standing clear of the brow and
    // pointing FORWARD over the eye, and it carries much of the face's character.
    for (const [p, dir, len, r] of [
      [[s * 0.0272, 1.7375, 0.0480], [s * 0.16, 0.30, 0.94], 0.0430, 0.0088],
      [[s * 0.0418, 1.7350, 0.0410], [s * 0.36, 0.28, 0.89], 0.0400, 0.0082],
      [[s * 0.0548, 1.7275, 0.0300], [s * 0.58, 0.26, 0.77], 0.0345, 0.0074],
    ]) {
      out.push(spike(seat(field, p, dir, 0.003), dir, len, r, {
        taper: 0.82, flat: 0.46, sides: 10, steps: 7, bend: [0, -0.005, 0.008],
      }));
    }
  }
  return out;
}

/** No teeth protrude in the references — the jaw is closed and shows only a crease. */
export function buildTeeth() {
  return [];
}

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];
const FINGER_R = { thumb: 0.0132, index: 0.0112, middle: 0.0118, ring: 0.0106, pinky: 0.0092 };
// Relaxed curl: each joint bends forward, so the hand is not a garden fork. Whatever
// this is, the claw MUST be placed off the curled tip — see buildFingers.
// NOTE: the tip is offset by c * TIP_CURL below, so the effective displacement is
// ~2x these numbers. Raising c 3-4x on top of that multiplier swept the fingers
// forward into long curved tentacles.
const FINGER_CURL = { thumb: 0.013, index: 0.026, middle: 0.030, ring: 0.026, pinky: 0.020 };
const TIP_CURL = 1.9;

/** Fingers swept along their bones, each finished with a claw. */
export function buildFingers(rig) {
  const parts = [];
  for (const sfx of ['.L', '.R']) {
    for (const name of FINGERS) {
      const p1 = rig.restPos.get(name + '1' + sfx);
      const p2 = rig.restPos.get(name + '2' + sfx);
      const p3 = rig.restPos.get(name + '3' + sfx);
      const r = FINGER_R[name];
      // start inside the palm so the join is hidden
      const root = [p1[0] + (p1[0] - p2[0]) * 0.95, p1[1] + (p1[1] - p2[1]) * 0.95, p1[2] + (p1[2] - p2[2]) * 0.95];
      const c = FINGER_CURL[name];
      const curl = (q, amt) => [q[0], q[1], q[2] + amt];
      // Curled joint positions are computed ONCE and shared with the claw below.
      // Deriving the claw from the uncurled p2/p3 leaves it hanging in mid-air a
      // couple of centimetres off the fingertip.
      const p2c = curl(p2, c);
      const p3c = curl(p3, c * TIP_CURL);
      const rings = curveRings([root, p1, p2c, p3c], (t) => {
        const taper = 1 - 0.42 * t;
        const knuckle = 1 + 0.20 * Math.exp(-Math.pow((t - 0.34) * 7, 2))
                          + 0.16 * Math.exp(-Math.pow((t - 0.66) * 8, 2));
        return r * taper * knuckle;
      }, 16, { tension: 0.4 });
      parts.push({ geom: sweep(rings, { sides: 12, capEnd: false }), region: 'skin' });

      // claw, seated on the CURLED tip
      const dir = [p3c[0] - p2c[0], p3c[1] - p2c[1], p3c[2] - p2c[2]];
      const l = Math.hypot(...dir) || 1;
      const d = [dir[0] / l, dir[1] / l, dir[2] / l];
      const clawBase = [p3c[0] - d[0] * 0.008, p3c[1] - d[1] * 0.008, p3c[2] - d[2] * 0.008];
      parts.push({
        geom: spike(clawBase, d, 0.0095, r * 0.66, {
          taper: 0.62, sides: 8, steps: 7,
          bend: [d[2] * 0.004, -0.007, -d[0] * 0.004],
        }),
        region: 'horn',
      });
    }
  }
  return parts;
}

/** Eyeballs: slightly flattened spheres; iris + slit pupil are drawn in the shader. */
export function buildEyes() {
  const out = [];
  for (const s of [1, -1]) {
    const g = new THREE.SphereGeometry(EYE.r, 26, 20);
    g.scale(1, 1, 0.92);
    g.translate(s * EYE.c[0], EYE.c[1], EYE.c[2]);
    out.push(fromGeometry(g));
  }
  return out;
}
