// Automatic skin weighting: every vertex is bound to the nearest bone segments
// in rest space with an inverse-cube falloff, giving near-rigid limbs that blend
// smoothly across joints.

const MAX_INFL = 4;

function segDist(px, py, pz, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const wx = px - a[0], wy = py - a[1], wz = pz - a[2];
  const dd = dx * dx + dy * dy + dz * dz;
  let t = dd > 1e-9 ? (wx * dx + wy * dy + wz * dz) / dd : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = wx - dx * t, cy = wy - dy * t, cz = wz - dz * t;
  return Math.sqrt(cx * cx + cy * cy + cz * cz);
}

/**
 * @param {Float32Array} positions rest-space vertex positions
 * @param {Array} segments [{ boneIndex, a:[x,y,z], b:[x,y,z], bias=1, reach=Infinity }]
 * @returns {{ skinIndex: Uint16Array, skinWeight: Float32Array }}
 */
export function computeSkinning(positions, segments) {
  const count = positions.length / 3;
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  const bi = new Array(MAX_INFL);
  const bw = new Array(MAX_INFL);

  for (let v = 0; v < count; v++) {
    const px = positions[v * 3], py = positions[v * 3 + 1], pz = positions[v * 3 + 2];
    for (let i = 0; i < MAX_INFL; i++) { bi[i] = 0; bw[i] = 0; }

    for (let s = 0; s < segments.length; s++) {
      const seg = segments[s];
      const d = segDist(px, py, pz, seg.a, seg.b);
      if (seg.reach !== undefined && d > seg.reach) continue;
      const dd = Math.max(d, 0.004);
      const w = (seg.bias === undefined ? 1 : seg.bias) / (dd * dd * dd);
      // insertion sort into the top-4 list
      for (let i = 0; i < MAX_INFL; i++) {
        if (w > bw[i]) {
          for (let j = MAX_INFL - 1; j > i; j--) { bw[j] = bw[j - 1]; bi[j] = bi[j - 1]; }
          bw[i] = w; bi[i] = seg.boneIndex;
          break;
        }
      }
    }

    let sum = bw[0] + bw[1] + bw[2] + bw[3];
    if (sum <= 0) { bw[0] = 1; sum = 1; }
    for (let i = 0; i < MAX_INFL; i++) {
      skinIndex[v * 4 + i] = bi[i];
      skinWeight[v * 4 + i] = bw[i] / sum;
    }
  }
  return { skinIndex, skinWeight };
}

/** Bind every vertex of a geometry rigidly to one bone (horns, teeth, claws...). */
export function rigidSkinning(count, boneIndex) {
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  for (let v = 0; v < count; v++) {
    skinIndex[v * 4] = boneIndex;
    skinWeight[v * 4] = 1;
  }
  return { skinIndex, skinWeight };
}
