// Marching cubes over an explicit scalar grid.
// Reuses three's published edge/tri tables; corner + edge conventions are matched
// to three/examples/jsm/objects/MarchingCubes.js (see docs/ARCHITECTURE.md).
import { edgeTable, triTable } from 'three/examples/jsm/objects/MarchingCubes.js';

// corner index -> unit offsets, matching the bit order used by edgeTable
const CORNER = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
];
// edge index -> [cornerA, cornerB]
const EDGE = [
  [0, 1], [1, 2], [3, 2], [0, 3],
  [4, 5], [5, 6], [7, 6], [4, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
];
// edge index -> the axis it runs along (0=x,1=y,2=z), used for vertex welding keys
const EDGE_AXIS = [0, 1, 0, 1, 0, 1, 0, 1, 2, 2, 2, 2];

/**
 * @param {Float32Array} field  density values, high = inside, size nx*ny*nz
 * @param {object} grid  {nx,ny,nz, min:[x,y,z], cell}
 * @param {number} iso
 * @returns {{positions: Float32Array, indices: Uint32Array}}
 */
export function polygonise(field, grid, iso = 0) {
  const { nx, ny, nz, min, cell } = grid;
  const sx = 1, sy = nx, sz = nx * ny;

  const positions = [];
  const indices = [];
  // vertex cache: key = ((z*ny + y)*nx + x)*3 + axis
  const cache = new Map();

  const corner = new Array(8);
  const eIdx = new Array(12);

  for (let z = 0; z < nz - 1; z++) {
    for (let y = 0; y < ny - 1; y++) {
      for (let x = 0; x < nx - 1; x++) {
        const base = x * sx + y * sy + z * sz;
        let cubeindex = 0;
        for (let c = 0; c < 8; c++) {
          const o = CORNER[c];
          const v = field[base + o[0] * sx + o[1] * sy + o[2] * sz];
          corner[c] = v;
          if (v < iso) cubeindex |= 1 << c;
        }
        const bits = edgeTable[cubeindex];
        if (bits === 0 || bits === 255) continue;

        for (let e = 0; e < 12; e++) {
          if (!(bits & (1 << e))) continue;
          const [ca, cb] = EDGE[e];
          const oa = CORNER[ca], ob = CORNER[cb];
          const ax = x + oa[0], ay = y + oa[1], az = z + oa[2];
          const axis = EDGE_AXIS[e];
          const key = ((az * ny + ay) * nx + ax) * 3 + axis;
          let vi = cache.get(key);
          if (vi === undefined) {
            const va = corner[ca], vb = corner[cb];
            let t = (iso - va) / (vb - va);
            if (!isFinite(t)) t = 0.5;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const px = (ax + (ob[0] - oa[0]) * t) * cell + min[0];
            const py = (ay + (ob[1] - oa[1]) * t) * cell + min[1];
            const pz = (az + (ob[2] - oa[2]) * t) * cell + min[2];
            vi = positions.length / 3;
            positions.push(px, py, pz);
            cache.set(key, vi);
          }
          eIdx[e] = vi;
        }

        const o = cubeindex << 4;
        for (let i = 0; triTable[o + i] !== -1; i += 3) {
          const a = eIdx[triTable[o + i]];
          const b = eIdx[triTable[o + i + 1]];
          const c = eIdx[triTable[o + i + 2]];
          if (a === b || b === c || a === c) continue;
          indices.push(a, c, b);
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}
