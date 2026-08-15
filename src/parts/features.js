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
    // Measured off the reference: the horn axis rises ~27 deg above horizontal and is
    // ~0.66 of head length. Authored at 46 deg and 1.02x it read as a tall vertical
    // antelope spire instead of a short swept-back stub — the largest silhouette error
    // in critic round 4.
    [s * 0.0500, 1.7255, 0.004],
    [s * 0.0645, 1.7590, -0.034],
    [s * 0.0748, 1.7920, -0.090],
    [s * 0.0802, 1.8200, -0.152],
    [s * 0.0798, 1.8400, -0.208],
    [s * 0.0768, 1.8510, -0.250],
  ];
}

// Fine ring ridging concentrated near the base and gone by mid-length, as in the
// reference. Trap #10: keep the per-ring phase step under a radian — 38 rad over
// 46 rings is 0.84, so it reads as ridging rather than aliasing into a rope.
const hornRadius = (t) => (0.0212 * Math.pow(1 - t, 0.62) + 0.0008)
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
  // A low crest, not a crown. In the reference these are modest nubs behind the
  // brow; at the previous size they competed with the horns and read as antlers.
  const defs = [
    [-0.0322, 1.7570, -0.026, 0.0330, 0.0092],
    [-0.0108, 1.7630, -0.032, 0.0410, 0.0104],
    [0.0108, 1.7630, -0.032, 0.0410, 0.0104],
    [0.0322, 1.7570, -0.026, 0.0330, 0.0092],
    [-0.0212, 1.7395, -0.072, 0.0270, 0.0080],
    [0.0212, 1.7395, -0.072, 0.0270, 0.0080],
  ];
  for (const [x, y, z, len, r] of defs) {
    const dir = [x * 5.5, 0.86, -0.5];
    out.push(spike(seat(field, [x, y, z], dir, 0.004), dir, len, r, {
      taper: 0.55, bend: [0, 0.004, -0.014], sides: 10, steps: 8,
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
    const jaw = [
      [s * 0.0385, 1.6105, 0.014, 0.0455, 0.0118],
      [s * 0.0360, 1.6060, 0.050, 0.0415, 0.0108],
      [s * 0.0315, 1.6025, 0.084, 0.0355, 0.0094],
      [s * 0.0255, 1.6005, 0.115, 0.0285, 0.0077],
    ];
    for (const [x, y, z, len, r] of jaw) {
      // Lateral AND swept back, as in the references. Angled down-and-back they
      // seated on the jaw underside and were invisible from every angle that matters;
      // purely lateral they read as whiskers rather than as a swept row.
      const dir = [s * 0.74, -0.34, -0.58];
      out.push(spike(seat(field, [x, y, z], dir, 0.004), dir, len, r, { taper: 0.7, sides: 8, steps: 6 }));
    }
    // cheek / jaw-hinge spikes
    for (const [p, dir, len, r] of [
      [[s * 0.0605, 1.6395, -0.016], [s * 0.62, -0.1, -0.78], 0.026, 0.0088],
      [[s * 0.0570, 1.6180, 0.008], [s * 0.6, -0.4, -0.7], 0.022, 0.0074],
    ]) {
      out.push(spike(seat(field, p, dir), dir, len, r, { taper: 0.7, sides: 8, steps: 6 }));
    }
    // Cheek frill: a cluster of small spikes running back from behind the eye to the
    // jaw hinge. In the references this is a distinct dark spiky patch and its
    // absence left the cheek as one blank panel.
    for (const [p, dir, len, r] of [
      [[s * 0.0560, 1.6790, 0.026], [s * 0.86, 0.10, -0.50], 0.0165, 0.0050],
      [[s * 0.0585, 1.6650, 0.006], [s * 0.88, -0.04, -0.47], 0.0185, 0.0056],
      [[s * 0.0590, 1.6505, -0.010], [s * 0.86, -0.16, -0.48], 0.0175, 0.0052],
      [[s * 0.0525, 1.6905, 0.004], [s * 0.80, 0.30, -0.52], 0.0140, 0.0044],
    ]) {
      out.push(spike(seat(field, p, dir, 0.003), dir, len, r, { taper: 0.8, sides: 8, steps: 5 }));
    }
    // brow scutes: three flat claw-like plates lying back along the brow ridge,
    // one of the most recognisable markings on the reference face
    // Longer and sharper than mere scutes: in the references these are proper
    // spines lying back along the brow ridge, and they carry a lot of the face's
    // character. Angled back rather than out, so they read against the skull.
    for (const [p, dir, len, r] of [
      [[s * 0.0292, 1.7325, 0.0470], [s * 0.20, 0.44, 0.88], 0.0405, 0.0062],
      [[s * 0.0432, 1.7305, 0.0400], [s * 0.42, 0.40, 0.81], 0.0375, 0.0058],
      [[s * 0.0552, 1.7240, 0.0290], [s * 0.64, 0.36, 0.68], 0.0330, 0.0053],
    ]) {
      out.push(spike(seat(field, p, dir, 0.003), dir, len, r, {
        taper: 0.9, sides: 8, steps: 7, bend: [0, 0.004, -0.010],
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
