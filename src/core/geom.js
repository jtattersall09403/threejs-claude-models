// Parametric geometry helpers: swept tubes with parallel-transport frames, plus a
// small accumulator that merges everything into one skinned BufferGeometry.
import * as THREE from 'three';

function norm(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

/**
 * Sweep a ring profile along a poly-line.
 * rings: [{ p:[x,y,z], r:number|[rx,ry], twist?:number, profile?:(angle)=>number }]
 * opts: { sides=16, capStart=true, capEnd=true, tipEnd=false }
 */
export function sweep(rings, opts = {}) {
  const sides = opts.sides || 16;
  const positions = [];
  const indices = [];
  const uvs = [];

  // tangents
  const n = rings.length;
  const tangents = rings.map((_, i) => {
    const a = rings[Math.max(0, i - 1)].p;
    const b = rings[Math.min(n - 1, i + 1)].p;
    return norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
  });

  // parallel transport frame
  let ref = Math.abs(tangents[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let nrm = norm(cross(ref, tangents[0]));
  const frames = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const t0 = tangents[i - 1], t1 = tangents[i];
      const ax = cross(t0, t1);
      const len = Math.hypot(ax[0], ax[1], ax[2]);
      if (len > 1e-6) {
        const axis = [ax[0] / len, ax[1] / len, ax[2] / len];
        const ang = Math.acos(Math.max(-1, Math.min(1, dot(t0, t1))));
        const c = Math.cos(ang), s = Math.sin(ang);
        const d = dot(axis, nrm);
        nrm = norm([
          nrm[0] * c + (axis[1] * nrm[2] - axis[2] * nrm[1]) * s + axis[0] * d * (1 - c),
          nrm[1] * c + (axis[2] * nrm[0] - axis[0] * nrm[2]) * s + axis[1] * d * (1 - c),
          nrm[2] * c + (axis[0] * nrm[1] - axis[1] * nrm[0]) * s + axis[2] * d * (1 - c),
        ]);
      }
    }
    const bin = norm(cross(tangents[i], nrm));
    frames.push([nrm, bin]);
  }

  for (let i = 0; i < n; i++) {
    const ring = rings[i];
    const [u, v] = frames[i];
    const r = Array.isArray(ring.r) ? ring.r : [ring.r, ring.r];
    const twist = ring.twist || 0;
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2 + twist;
      const pm = ring.profile ? ring.profile(a) : 1;
      const ca = Math.cos(a) * r[0] * pm, sa = Math.sin(a) * r[1] * pm;
      positions.push(
        ring.p[0] + u[0] * ca + v[0] * sa,
        ring.p[1] + u[1] * ca + v[1] * sa,
        ring.p[2] + u[2] * ca + v[2] * sa,
      );
      uvs.push(s / sides, i / (n - 1));
    }
  }

  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s < sides; s++) {
      const s2 = (s + 1) % sides;
      const a = i * sides + s, b = i * sides + s2;
      const c = (i + 1) * sides + s, d = (i + 1) * sides + s2;
      indices.push(a, c, b, b, c, d);
    }
  }

  const capRing = (idx, flip) => {
    const ring = rings[idx];
    const ci = positions.length / 3;
    positions.push(ring.p[0], ring.p[1], ring.p[2]);
    uvs.push(0.5, flip ? 0 : 1);
    for (let s = 0; s < sides; s++) {
      const s2 = (s + 1) % sides;
      const a = idx * sides + s, b = idx * sides + s2;
      if (flip) indices.push(ci, a, b); else indices.push(ci, b, a);
    }
  };
  if (opts.capStart !== false) capRing(0, true);
  if (opts.capEnd !== false) capRing(n - 1, false);

  return { positions: new Float32Array(positions), indices, uvs: new Float32Array(uvs) };
}

/** Build a smooth curve of rings from control points using Catmull-Rom. */
export function curveRings(points, radii, steps, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  curve.curveType = opts.curveType || 'catmullrom';
  curve.tension = opts.tension !== undefined ? opts.tension : 0.5;
  const rings = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const p = curve.getPoint(t);
    rings.push({ p: [p.x, p.y, p.z], r: radii(t), profile: opts.profile ? (a) => opts.profile(a, t) : undefined });
  }
  return rings;
}

/** A cone/spike from base to tip. */
export function spike(base, dir, length, radius, opts = {}) {
  const d = norm(dir);
  const steps = opts.steps || 7;
  const bend = opts.bend || [0, 0, 0];
  const rings = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const curveAmt = t * t;
    rings.push({
      p: [
        base[0] + d[0] * length * t + bend[0] * curveAmt,
        base[1] + d[1] * length * t + bend[1] * curveAmt,
        base[2] + d[2] * length * t + bend[2] * curveAmt,
      ],
      r: radius * Math.pow(1 - t, opts.taper || 0.75) * (opts.swell ? 1 + 0.12 * Math.sin(t * Math.PI) : 1),
    });
  }
  return sweep(rings, { sides: opts.sides || 10, capEnd: false });
}

/** Uniformly scale a generated part about a pivot (normals are scale-invariant). */
export function scalePartAbout(part, s, pivot) {
  const q = part.positions;
  for (let i = 0; i < q.length; i += 3) {
    q[i] = pivot[0] + (q[i] - pivot[0]) * s;
    q[i + 1] = pivot[1] + (q[i + 1] - pivot[1]) * s;
    q[i + 2] = pivot[2] + (q[i + 2] - pivot[2]) * s;
  }
  return part;
}

/** Area-weighted smooth vertex normals for a part that didn't supply its own. */
export function computeNormalsFor(part) {
  const { positions, indices } = part;
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const e1x = positions[b] - positions[a], e1y = positions[b + 1] - positions[a + 1], e1z = positions[b + 2] - positions[a + 2];
    const e2x = positions[c] - positions[a], e2y = positions[c + 1] - positions[a + 1], e2z = positions[c + 2] - positions[a + 2];
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    for (const o of [a, b, c]) {
      normals[o] += nx; normals[o + 1] += ny; normals[o + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= l; normals[i + 1] /= l; normals[i + 2] /= l;
  }
  part.normals = normals;
  return part;
}

/** Accumulates parts into a single indexed skinned geometry. */
export class MeshBuilder {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.uvs = [];
    this.indices = [];
    this.skinIndex = [];
    this.skinWeight = [];
    this.rest = [];
    this.region = [];
  }

  /**
   * @param part {positions, indices, uvs?, normals?}
   * @param skin {skinIndex, skinWeight} arrays sized to the part
   * @param region numeric material region id
   */
  add(part, skin, region = 0) {
    const base = this.positions.length / 3;
    const n = part.positions.length / 3;
    for (let i = 0; i < part.positions.length; i++) this.positions.push(part.positions[i]);
    for (let i = 0; i < part.positions.length; i++) this.rest.push(part.positions[i]);
    if (!part.normals) computeNormalsFor(part);
    for (let i = 0; i < part.normals.length; i++) this.normals.push(part.normals[i]);
    if (part.uvs) {
      for (let i = 0; i < part.uvs.length; i++) this.uvs.push(part.uvs[i]);
    } else {
      for (let i = 0; i < n * 2; i++) this.uvs.push(0);
    }
    for (let i = 0; i < part.indices.length; i++) this.indices.push(part.indices[i] + base);
    for (let i = 0; i < n * 4; i++) {
      this.skinIndex.push(skin.skinIndex[i]);
      this.skinWeight.push(skin.skinWeight[i]);
    }
    for (let i = 0; i < n; i++) this.region.push(region);
    return { base, count: n };
  }

  build({ computeNormals = false } = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    g.setAttribute('aRest', new THREE.Float32BufferAttribute(this.rest, 3));
    g.setAttribute('aRegion', new THREE.Float32BufferAttribute(this.region, 1));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.skinIndex, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.skinWeight, 4));
    g.setIndex(this.indices);
    if (computeNormals) g.computeVertexNormals();
    g.computeTangents?.();
    return g;
  }
}
