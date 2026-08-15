// The rest pose is a measuring pose: perfectly symmetric, arms dead vertical, feet
// parallel and touching. It is the right space to AUTHOR in — every SDF primitive and
// every skin weight is expressed in it — but it is the wrong thing to SHOW. Rendered
// straight, it reads as a shop mannequin no matter how good the anatomy is.
//
// So the display stance is a separate thing: a relaxed asymmetric idle applied as bone
// rotations on top of the rest pose. It has to be applied AFTER `new THREE.Skeleton()`
// has snapshotted the bind inverses (see rig/skeleton.js) — pose first and every vertex
// gets the stance baked in twice.
//
// The stance is contrapposto: weight on the character's RIGHT leg (-x), pelvis dropped
// and turned toward the free side, spine counter-rotating so the shoulder line tilts
// the OPPOSITE way to the hip line, head levelling itself back to horizontal. Every
// pair of limbs is deliberately unequal — matched left/right angles read as a pose,
// unmatched ones read as a person standing.
const D = Math.PI / 180;

/**
 * name -> { x, y, z } in DEGREES, intrinsic XYZ, applied to the bone's local rotation.
 *
 * Axis conventions (character faces +Z, +x is the character's LEFT):
 *   +z  swings a downward-pointing limb toward +x
 *   +x  swings it toward -z (backwards)
 *   +y  yaws it toward +x at the front
 * so mirrored bones take the same `x` and negated `y`/`z`.
 */
export const IDLE_STANCE = {
  // ---- spine: hips tilt one way, shoulders the other ------------------------
  hips: { z: -1.9, y: 2.6, x: 0.6 },
  spine: { z: 1.1, y: -1.5, x: -0.4 },
  chest: { z: 1.3, y: -1.1, x: -0.9 },
  upperChest: { z: 0.7, y: -0.7, x: -0.5 },
  // the neck undoes the accumulated shoulder tilt so the head sits level; a head that
  // tilts with the chest reads as a slump, not as a stance
  neckBase: { z: -1.3, y: 0.6, x: 1.1 },
  neck: { z: -1.1, y: 0.9, x: -0.9 },
  head: { z: -0.6, y: 1.6, x: -1.0 },

  // ---- arms: hanging, not glued. Unequal on purpose ------------------------
  // Abduction is what separates the silhouette of the arm from the silhouette of the
  // torso. Without it the coat, the arm and the flank merge into one slab.
  'clavicle.L': { z: -1.6, y: -1.8 },
  'shoulder.L': { z: 7.6, y: 3.0, x: -3.5 },
  'elbow.L': { x: -13.0, y: 5.0, z: 1.5 },
  'wrist.L': { x: -5.0, z: -4.0, y: 3.0 },
  'clavicle.R': { z: 2.2, y: 1.4 },
  'shoulder.R': { z: -6.2, y: -2.0, x: -7.0 },
  'elbow.R': { x: -19.5, y: -6.0, z: -2.0 },
  'wrist.R': { x: -3.0, z: 5.0, y: -2.0 },

  // ---- legs: the -x leg carries the weight, the +x leg is soft ---------------
  'hip.R': { z: 0.9, x: 1.4, y: -1.5 },
  'knee.R': { x: 1.6 },
  'ankle.R': { x: -3.0, y: -8.0 },
  'hip.L': { z: 3.6, x: -5.0, y: 2.5 },
  'knee.L': { x: 8.0 },
  'ankle.L': { x: -3.0, y: 11.0 },

  // ---- tail: a lazy lateral S, and a little more droop than the rest curve ---
  // A tail with no lateral component is the single most plank-like thing on the model
  // from the side, because its whole length lies in one plane with the spine.
  tail1: { y: -2.0, x: -1.5 },
  tail2: { y: 2.4, x: -2.5, z: 1.5 },
  tail3: { y: 2.2, x: -2.5, z: -1.0 },
  tail4: { y: -1.8, x: -2.0 },
  tail5: { y: -2.2, x: -1.5 },

  // ---- fingers: a slack hand, curling in slightly toward the palm ------------
  // Small. The finger SWEEPS already carry most of the curl (parts/features.js); this
  // only breaks the fingers out of a single fan so they stop reading as a comb.
  'index1.L': { z: -3.0 }, 'index2.L': { z: -4.0 }, 'index3.L': { z: -4.5 },
  'middle1.L': { z: -3.5 }, 'middle2.L': { z: -5.0 }, 'middle3.L': { z: -5.5 },
  'ring1.L': { z: -4.0 }, 'ring2.L': { z: -5.5 }, 'ring3.L': { z: -6.0 },
  'pinky1.L': { z: -5.0 }, 'pinky2.L': { z: -6.5 }, 'pinky3.L': { z: -7.0 },
  'thumb1.L': { z: -2.0, y: 4.0 }, 'thumb2.L': { z: -3.0 },
  // the right hand hangs a little more open than the left
  'index1.R': { z: 2.0 }, 'index2.R': { z: 3.0 }, 'index3.R': { z: 3.5 },
  'middle1.R': { z: 2.5 }, 'middle2.R': { z: 3.5 }, 'middle3.R': { z: 4.0 },
  'ring1.R': { z: 3.0 }, 'ring2.R': { z: 4.0 }, 'ring3.R': { z: 4.5 },
  'pinky1.R': { z: 3.5 }, 'pinky2.R': { z: 5.0 }, 'pinky3.R': { z: 5.5 },
  'thumb1.R': { z: 1.5, y: -4.0 }, 'thumb2.R': { z: 2.5 },
};

/** Weight shift of the pelvis over the supporting foot, in metres. */
const HIP_SHIFT = [-0.014, 0, 0.004];

/**
 * Apply a stance to a rig, then re-plant the feet.
 *
 * Rotating the pelvis lifts one ankle and drops the other, so without the re-plant the
 * character either floats or sinks into the floor — and against a shadow-catching
 * ground plane that is immediately obvious. The lower ankle is put back at its rest
 * height, which puts the sole back on y = 0.
 */
export function applyStance(rig, stance = IDLE_STANCE) {
  const hips = rig.byName.get('hips');
  const hipRest = rig.restPos.get('hips');

  for (const [name, rot] of Object.entries(stance)) {
    const bone = rig.byName.get(name);
    if (!bone) throw new Error(`stance references unknown bone "${name}"`);
    bone.rotation.set((rot.x || 0) * D, (rot.y || 0) * D, (rot.z || 0) * D);
  }
  hips.position.set(
    hips.position.x + HIP_SHIFT[0],
    hips.position.y + HIP_SHIFT[1],
    hips.position.z + HIP_SHIFT[2],
  );

  rig.root.updateMatrixWorld(true);
  let drop = Infinity;
  for (const side of ['.L', '.R']) {
    const ankle = rig.byName.get('ankle' + side);
    const rest = rig.restPos.get('ankle' + side);
    drop = Math.min(drop, ankle.matrixWorld.elements[13] - rest[1]);
  }
  rig.root.position.y -= drop;
  rig.root.updateMatrixWorld(true);

  return { hipRest, drop };
}
