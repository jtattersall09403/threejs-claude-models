// Signed-distance modelling kit: smooth-blended primitives baked to a voxel grid.
// Convention: distance is negative inside the surface. Primitives are "splatted"
// only over their own AABB, so bake cost scales with occupied volume, not grid size.

const EPS = 1e-6;

export function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
  return b * (1 - h) + a * h - k * h * (1 - h);
}

export function smax(a, b, k) {
  if (k <= 0) return Math.max(a, b);
  const h = Math.max(0, Math.min(1, 0.5 - (0.5 * (b - a)) / k));
  return b * (1 - h) + a * h + k * h * (1 - h);
}

/** Distance from p to segment ab, plus the parametric position along it. */
function segDist(px, py, pz, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const wx = px - ax, wy = py - ay, wz = pz - az;
  const dd = dx * dx + dy * dy + dz * dz;
  let t = dd > EPS ? (wx * dx + wy * dy + wz * dz) / dd : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = wx - dx * t, cy = wy - dy * t, cz = wz - dz * t;
  return [Math.sqrt(cx * cx + cy * cy + cz * cz), t];
}

/**
 * Tapered, optionally squashed capsule between world points a and b.
 * opts: { scale:[sx,sy,sz], k:blendRadius }
 */
export function capsule(a, b, ra, rb = ra, opts = {}) {
  const s = opts.scale || [1, 1, 1];
  const inv = [1 / s[0], 1 / s[1], 1 / s[2]];
  const ms = Math.min(s[0], s[1], s[2]);
  const ax = a[0] * inv[0], ay = a[1] * inv[1], az = a[2] * inv[2];
  const bx = b[0] * inv[0], by = b[1] * inv[1], bz = b[2] * inv[2];
  const rmax = Math.max(ra, rb);
  return {
    k: opts.k !== undefined ? opts.k : 0.03,
    aabb: [
      Math.min(a[0], b[0]) - rmax * s[0], Math.min(a[1], b[1]) - rmax * s[1], Math.min(a[2], b[2]) - rmax * s[2],
      Math.max(a[0], b[0]) + rmax * s[0], Math.max(a[1], b[1]) + rmax * s[1], Math.max(a[2], b[2]) + rmax * s[2],
    ],
    d(px, py, pz) {
      const [dist, t] = segDist(px * inv[0], py * inv[1], pz * inv[2], ax, ay, az, bx, by, bz);
      return (dist - (ra + (rb - ra) * t)) * ms;
    },
  };
}

/** Ellipsoid with per-axis radii. */
export function ellipsoid(c, r, opts = {}) {
  return {
    k: opts.k !== undefined ? opts.k : 0.03,
    aabb: [c[0] - r[0], c[1] - r[1], c[2] - r[2], c[0] + r[0], c[1] + r[1], c[2] + r[2]],
    d(px, py, pz) {
      const x = (px - c[0]) / r[0], y = (py - c[1]) / r[1], z = (pz - c[2]) / r[2];
      const k0 = Math.sqrt(x * x + y * y + z * z);
      if (k0 < EPS) return -Math.min(r[0], r[1], r[2]);
      const xa = x / r[0], ya = y / r[1], za = z / r[2];
      const k1 = Math.sqrt(xa * xa + ya * ya + za * za);
      return (k0 * (k0 - 1)) / k1;
    },
  };
}

/** Axis-aligned rounded box. `h` are half-extents of the inner box. */
export function roundBox(c, h, round = 0.02, opts = {}) {
  return {
    k: opts.k !== undefined ? opts.k : 0.03,
    aabb: [c[0] - h[0] - round, c[1] - h[1] - round, c[2] - h[2] - round,
           c[0] + h[0] + round, c[1] + h[1] + round, c[2] + h[2] + round],
    d(px, py, pz) {
      const qx = Math.abs(px - c[0]) - h[0];
      const qy = Math.abs(py - c[1]) - h[1];
      const qz = Math.abs(pz - c[2]) - h[2];
      const mx = Math.max(qx, 0), my = Math.max(qy, 0), mz = Math.max(qz, 0);
      const outside = Math.sqrt(mx * mx + my * my + mz * mz);
      const inside = Math.min(Math.max(qx, Math.max(qy, qz)), 0);
      return outside + inside - round;
    },
  };
}

/**
 * Plane-ish slab used to shave a flat facet onto a form (e.g. a flat skull top).
 * Positive normal side is "outside". Used with sub().
 */
export function halfSpace(point, normal, opts = {}) {
  const n = normal;
  const len = Math.hypot(n[0], n[1], n[2]) || 1;
  const nx = n[0] / len, ny = n[1] / len, nz = n[2] / len;
  const dp = point[0] * nx + point[1] * ny + point[2] * nz;
  const big = 1e3;
  return {
    k: opts.k !== undefined ? opts.k : 0.02,
    aabb: opts.aabb || [-big, -big, -big, big, big, big],
    d(px, py, pz) {
      return px * nx + py * ny + pz * nz - dp;
    },
  };
}

/**
 * The surface of an existing field, pushed out by `offset`. This is how garments
 * are built: smooth-min blending inflates the body well past its own primitives, so
 * anything authored from primitive radii alone ends up buried inside the skin.
 * Offsetting the *baked surface* guarantees a garment always clears the body.
 */
export function offsetSurface(field, offset, aabb, k = 0.01, wrinkle = null) {
  return {
    k,
    aabb: [aabb[0], aabb[1], aabb[2], aabb[3], aabb[4], aabb[5]],
    d(px, py, pz) {
      const o = wrinkle ? offset + wrinkle(px, py, pz) : offset;
      return field.sample(px, py, pz) - o;
    },
  };
}

/** Smooth intersection of two primitives — used to trim a garment to its coverage. */
export function isect(a, b, k = 0.012) {
  const bb = [
    Math.max(a.aabb[0], b.aabb[0]), Math.max(a.aabb[1], b.aabb[1]), Math.max(a.aabb[2], b.aabb[2]),
    Math.min(a.aabb[3], b.aabb[3]), Math.min(a.aabb[4], b.aabb[4]), Math.min(a.aabb[5], b.aabb[5]),
  ];
  return {
    k: 0.0,
    aabb: bb,
    d(px, py, pz) { return smax(a.d(px, py, pz), b.d(px, py, pz), k); },
  };
}

/** Find where the field's surface lies along a ray, so features can sit ON the skin. */
export function raySurface(field, origin, dir, opts = {}) {
  const max = opts.max || 0.25;
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const d = [dir[0] / l, dir[1] / l, dir[2] / l];
  let t = opts.start !== undefined ? opts.start : -0.12;
  let prev = field.sample(origin[0] + d[0] * t, origin[1] + d[1] * t, origin[2] + d[2] * t);
  const step = 0.002;
  for (t += step; t < max; t += step) {
    const v = field.sample(origin[0] + d[0] * t, origin[1] + d[1] * t, origin[2] + d[2] * t);
    if (prev < 0 && v >= 0) {
      const f = prev / (prev - v);
      const hit = t - step + step * f;
      return [origin[0] + d[0] * hit, origin[1] + d[1] * hit, origin[2] + d[2] * hit];
    }
    prev = v;
  }
  return [...origin];
}

/**
 * A thin slot whose height follows a function of z — the mouth line. A flat slab
 * cuts a dead-straight crease, which reads as mechanical; real jaws rise toward
 * the hinge.
 */
export function creaseSlot(fy, halfT, zRange, xHalf, opts = {}) {
  return {
    k: opts.k !== undefined ? opts.k : 0.005,
    aabb: [-xHalf, opts.yMin || 1.5, zRange[0], xHalf, opts.yMax || 1.75, zRange[1]],
    d(px, py, pz) {
      const dy = Math.abs(py - fy(pz)) - halfT;
      const dz = Math.max(pz - zRange[1], zRange[0] - pz);
      const dx = Math.abs(px) - xHalf;
      return Math.max(dy, Math.max(dz, dx));
    },
  };
}

export class Field {
  constructor() {
    this.adds = [];
    this.subs = [];
  }
  add(prim) { this.adds.push(prim); return this; }
  sub(prim) { this.subs.push(prim); return this; }
  addAll(list) { list.forEach((p) => this.add(p)); return this; }

  /** Expose this whole field as a single primitive, for use in isect()/offsetSurface(). */
  asPrimitive(aabb, k = 0.01) {
    const self = this;
    return { k, aabb, d(px, py, pz) { return self.sample(px, py, pz); } };
  }

  /**
   * Uniformly scale everything already added, about a pivot. Lets a whole region
   * (the head) be resized from one number without re-authoring every primitive.
   */
  scaleAbout(s, pivot, offset = [0, 0, 0]) {
    const xf = (prim) => {
      const inner = prim.d;
      const bb = prim.aabb;
      const map = (i, v) => pivot[i] + (v - pivot[i]) * s + offset[i];
      return {
        k: prim.k * s,
        aabb: [
          map(0, bb[0]), map(1, bb[1]), map(2, bb[2]),
          map(0, bb[3]), map(1, bb[4]), map(2, bb[5]),
        ],
        d(px, py, pz) {
          return inner(
            pivot[0] + (px - offset[0] - pivot[0]) / s,
            pivot[1] + (py - offset[1] - pivot[1]) / s,
            pivot[2] + (pz - offset[2] - pivot[2]) / s,
          ) * s;
        },
      };
    };
    this.adds = this.adds.map(xf);
    this.subs = this.subs.map(xf);
    return this;
  }

  /** Distance at an arbitrary point (used for vertex normals / weight refinement). */
  sample(px, py, pz) {
    let d = 1e3;
    for (let i = 0; i < this.adds.length; i++) {
      const p = this.adds[i];
      const bb = p.aabb;
      if (px < bb[0] - p.k || px > bb[3] + p.k || py < bb[1] - p.k ||
          py > bb[4] + p.k || pz < bb[2] - p.k || pz > bb[5] + p.k) continue;
      d = smin(d, p.d(px, py, pz), p.k);
    }
    for (let i = 0; i < this.subs.length; i++) {
      const p = this.subs[i];
      const bb = p.aabb;
      if (px < bb[0] - p.k || px > bb[3] + p.k || py < bb[1] - p.k ||
          py > bb[4] + p.k || pz < bb[2] - p.k || pz > bb[5] + p.k) continue;
      d = smax(d, -p.d(px, py, pz), p.k);
    }
    return d;
  }

  /** Central-difference gradient — used for high quality vertex normals. */
  normalAt(px, py, pz, h = 0.0015, out = [0, 0, 0]) {
    const nx = this.sample(px + h, py, pz) - this.sample(px - h, py, pz);
    const ny = this.sample(px, py + h, pz) - this.sample(px, py - h, pz);
    const nz = this.sample(px, py, pz + h) - this.sample(px, py, pz - h);
    const l = Math.hypot(nx, ny, nz) || 1;
    out[0] = nx / l; out[1] = ny / l; out[2] = nz / l;
    return out;
  }

  /**
   * Bake to a grid. `bounds` = [minx,miny,minz,maxx,maxy,maxz], `cell` in metres.
   * Returns { field (density, high=inside), grid }.
   */
  bake(bounds, cell) {
    const min = [bounds[0], bounds[1], bounds[2]];
    const nx = Math.ceil((bounds[3] - bounds[0]) / cell) + 1;
    const ny = Math.ceil((bounds[4] - bounds[1]) / cell) + 1;
    const nz = Math.ceil((bounds[5] - bounds[2]) / cell) + 1;
    const dist = new Float32Array(nx * ny * nz).fill(1e3);
    const sy = nx, sz = nx * ny;

    const splat = (p, op) => {
      const bb = p.aabb;
      const pad = p.k + cell;
      const x0 = Math.max(0, Math.floor((bb[0] - pad - min[0]) / cell));
      const y0 = Math.max(0, Math.floor((bb[1] - pad - min[1]) / cell));
      const z0 = Math.max(0, Math.floor((bb[2] - pad - min[2]) / cell));
      const x1 = Math.min(nx - 1, Math.ceil((bb[3] + pad - min[0]) / cell));
      const y1 = Math.min(ny - 1, Math.ceil((bb[4] + pad - min[1]) / cell));
      const z1 = Math.min(nz - 1, Math.ceil((bb[5] + pad - min[2]) / cell));
      for (let z = z0; z <= z1; z++) {
        const pz = min[2] + z * cell;
        for (let y = y0; y <= y1; y++) {
          const py = min[1] + y * cell;
          const row = y * sy + z * sz;
          for (let x = x0; x <= x1; x++) {
            const px = min[0] + x * cell;
            const i = x + row;
            dist[i] = op(dist[i], p.d(px, py, pz), p.k);
          }
        }
      }
    };

    for (const p of this.adds) splat(p, smin);
    for (const p of this.subs) splat(p, (a, b, k) => smax(a, -b, k));

    // density: high inside
    for (let i = 0; i < dist.length; i++) dist[i] = -dist[i];
    return { field: dist, grid: { nx, ny, nz, min, cell } };
  }
}
