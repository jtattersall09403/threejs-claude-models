// Procedurally generated, tileable detail maps. RGB = tangent-space normal,
// A = height (used for crevice darkening and roughness breakup).
import * as THREE from 'three';
import { rng } from '../core/noise.js';

function heightToTexture(height, size, strength) {
  const data = new Uint8Array(size * size * 4);
  const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      let nx = -dx, ny = -dy, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      const i = (y * size + x) * 4;
      data[i] = (nx * 0.5 + 0.5) * 255;
      data[i + 1] = (ny * 0.5 + 0.5) * 255;
      data[i + 2] = (nz * 0.5 + 0.5) * 255;
      data[i + 3] = Math.max(0, Math.min(1, at(x, y))) * 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function fbmField(size, freq, octaves, seed) {
  const out = new Float32Array(size * size);
  const rand = rng(seed);
  const layers = [];
  for (let o = 0; o < octaves; o++) {
    const n = freq << o;
    const g = new Float32Array(n * n);
    for (let i = 0; i < g.length; i++) g[i] = rand();
    layers.push({ n, g });
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0, amp = 0.5, norm = 0;
      for (const { n, g } of layers) {
        const fx = (x / size) * n, fy = (y / size) * n;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = fx - x0, ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const g00 = g[(y0 % n) * n + (x0 % n)];
        const g10 = g[(y0 % n) * n + ((x0 + 1) % n)];
        const g01 = g[((y0 + 1) % n) * n + (x0 % n)];
        const g11 = g[((y0 + 1) % n) * n + ((x0 + 1) % n)];
        sum += amp * ((g00 * (1 - sx) + g10 * sx) * (1 - sy) + (g01 * (1 - sx) + g11 * sx) * sy);
        norm += amp;
        amp *= 0.5;
      }
      out[y * size + x] = sum / norm;
    }
  }
  return out;
}

/** Pebbled reptile scales: jittered cellular domes separated by deep grooves. */
export function makeScaleTexture(size = 512, cells = 11, seed = 7) {
  const rand = rng(seed);
  const pts = new Float32Array(cells * cells * 2);
  for (let i = 0; i < cells * cells; i++) {
    pts[i * 2] = rand();
    pts[i * 2 + 1] = rand();
  }
  const height = new Float32Array(size * size);
  const detail = fbmField(size, 8, 4, seed + 31);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const cx = Math.floor(u * cells), cy = Math.floor(v * cells);
      let f1 = 9, f2 = 9;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const gx = (cx + ox + cells) % cells;
          const gy = (cy + oy + cells) % cells;
          // brick-offset rows read more like scales than a square lattice
          const rowShift = (gy % 2) * 0.5;
          const px = (gx + pts[(gy * cells + gx) * 2] * 0.62 + 0.19 + rowShift) / cells;
          const py = (gy + pts[(gy * cells + gx) * 2 + 1] * 0.5 + 0.25) / cells;
          let dx = px - u + (cx + ox < 0 ? -1 : cx + ox >= cells ? 1 : 0);
          let dy = py - v + (cy + oy < 0 ? -1 : cy + oy >= cells ? 1 : 0);
          // scales are wider than tall
          const d = Math.hypot(dx * 1.0, dy * 1.25);
          if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
        }
      }
      // Wider, flatter plates with a crisper divide. The reference head is large flat
      // plates separated by a BRIGHT reticulated net, not small puffy domes in dark
      // grooves — the albedo polarity is handled in SKIN_FRAG's `mortar` term.
      // The HEIGHT CHANNEL HAS TO USE ITS RANGE. At (f2-f1)*cells*3 the edge term
      // saturates about 3% of the way into a cell, and pow(edge, 0.22) then pinned the
      // dome to 1 over essentially the whole plate; adding 1.02 and clamping left h = 1
      // across the entire hide with a groove one or two texels wide.
      //
      // Everything that gives the head its value structure keys off h: the reticulated
      // net, the crevice darkening, the plate-size blend, the roughness breakup. With h
      // saturated they were all inert, and the face rendered as a smooth flat mass with
      // relief but no pattern — which is the defect that survived a dozen attempts to
      // fix it by tuning the terms that read h.
      const edge = Math.min(1, (f2 - f1) * cells * 1.15);
// SMOOTHSTEP, not a power curve. pow(edge, 0.62) rises steeply out of the groove and
      // then flattens, which gives every scale a flat top with a hard rim — a field of
      // faceted pyramids across the back of the skull. Smoothstep is flat at the plate
      // centre AND at the groove floor with a smooth shoulder between, which is the
      // shape a keratin scale actually has.
      const dome = edge * edge * (3 - 2 * edge);
      const grain = (detail[y * size + x] - 0.5) * 0.16;
      height[y * size + x] = 0.04 + dome * 0.90 + grain * 0.55;
    }
  }
// Normal strength 2.1, not 4.6. That number was tuned when the height channel was
  // saturated and its gradients were confined to a one-texel groove; now that the dome
  // uses its full range the same strength turns every scale into a hard pyramid, and the
  // back of the skull renders as a field of faceted chunks.
  return heightToTexture(height, size, 2.1);
}

/** Coarse woven cloth. */
export function makeClothTexture(size = 512, threads = 46, seed = 19) {
  const height = new Float32Array(size * size);
  const fib = fbmField(size, 16, 4, seed);
  const slub = fbmField(size, 4, 3, seed + 5);
  // Per-thread jitter. A strict over/under grid of identical threads reads as
  // machine-printed tweed — at garment scale it was the most artificial-looking
  // thing in the render. Real cloth has uneven thread thickness, so vary the
  // cross-section exponent and the height per warp and per weft.
  const rand = rng(seed + 11);
  const jw = new Float32Array(threads + 1);
  const jh = new Float32Array(threads + 1);
  const aw = new Float32Array(threads + 1);
  const ah = new Float32Array(threads + 1);
  for (let i = 0; i <= threads; i++) {
    jw[i] = 0.50 + rand() * 1.15;   // warp thread "width" exponent
    jh[i] = 0.50 + rand() * 1.15;
    aw[i] = 0.74 + rand() * 0.46;   // warp thread height
    ah[i] = 0.74 + rand() * 0.46;
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * threads, v = (y / size) * threads;
      const iu = Math.floor(u), iv = Math.floor(v);
      const fu = u - iu, fv = v - iv;
      const over = (iu + iv) % 2 === 0;
      const warp = Math.pow(Math.sin(fu * Math.PI), jw[iu]) * aw[iu];
      const weft = Math.pow(Math.sin(fv * Math.PI), jh[iv]) * ah[iv];
      const h = over ? warp * 0.9 + weft * 0.25 : weft * 0.9 + warp * 0.25;
      height[y * size + x] = h * (0.62 + slub[y * size + x] * 0.5) + (fib[y * size + x] - 0.5) * 0.42;
    }
  }
  return heightToTexture(height, size, 1.5);
}

/** Cracked, worn leather. */
export function makeLeatherTexture(size = 512, cells = 22, seed = 41) {
  const rand = rng(seed);
  const pts = new Float32Array(cells * cells * 2);
  for (let i = 0; i < cells * cells; i++) pts[i] = rand();
  const grain = fbmField(size, 24, 4, seed + 3);
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const cx = Math.floor(u * cells), cy = Math.floor(v * cells);
      let f1 = 9, f2 = 9;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const gx = (cx + ox + cells) % cells, gy = (cy + oy + cells) % cells;
          const px = (gx + pts[(gy * cells + gx) * 2]) / cells;
          const py = (gy + pts[(gy * cells + gx) * 2 + 1]) / cells;
          let dx = px - u + (cx + ox < 0 ? -1 : cx + ox >= cells ? 1 : 0);
          let dy = py - v + (cy + oy < 0 ? -1 : cy + oy >= cells ? 1 : 0);
          const d = Math.hypot(dx, dy);
          if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
        }
      }
      const crack = Math.min(1, (f2 - f1) * cells * 2.4);
      height[y * size + x] = crack * 0.55 + grain[y * size + x] * 0.45;
    }
  }
  return heightToTexture(height, size, 1.8);
}
