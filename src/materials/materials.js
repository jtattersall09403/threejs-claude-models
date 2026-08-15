// Materials. Everything is a MeshStandardMaterial with injected shader code that
// drives colour/roughness from the *rest-pose* position, so patterns stay locked to
// the body when it animates. Detail normals are triplanar-sampled in rest space and
// rotated into view space by aligning the rest normal with the shaded normal — for
// isotropic scale/weave bumps the residual twist is imperceptible, and it means we
// need no tangents.
import * as THREE from 'three';
import { makeScaleTexture, makeClothTexture, makeLeatherTexture } from './textures.js';
import { EYE, HEAD_XF, LIP } from '../parts/anatomy.js';

const COMMON = /* glsl */`
varying vec3 vRest;
varying vec3 vRestN;
varying float vRegion;
varying vec2 vRun;

// GLSL smoothstep is undefined when edge0 >= edge1; several of our masks read most
// naturally in descending form, so route them through this.
float ss(float a, float b, float x) {
  return a < b ? smoothstep(a, b, x) : 1.0 - smoothstep(b, a, x);
}

vec3 alignRot(vec3 from, vec3 to, vec3 v) {
  vec3 axis = cross(from, to);
  float s = length(axis);
  float c = clamp(dot(from, to), -1.0, 1.0);
  if (s < 1e-5) return c > 0.0 ? v : -v;
  axis /= s;
  float ang = atan(s, c);
  float ca = cos(ang), sa = sin(ang);
  return v * ca + cross(axis, v) * sa + axis * dot(axis, v) * (1.0 - ca);
}

// Triplanar detail sample. Returns tangent-ish perturbed normal in rest space (xyz)
// and the height in w.
vec4 triDetail(vec3 p, vec3 n, float freq, float strength) {
  vec3 w = pow(abs(n), vec3(4.0));
  w /= (w.x + w.y + w.z + 1e-5);
  vec4 tx = texture2D(uDetail, p.zy * freq);
  vec4 ty = texture2D(uDetail, p.xz * freq);
  vec4 tz = texture2D(uDetail, p.xy * freq);
  vec3 nx = tx.xyz * 2.0 - 1.0;
  vec3 ny = ty.xyz * 2.0 - 1.0;
  vec3 nz = tz.xyz * 2.0 - 1.0;
  nx.xy *= strength; ny.xy *= strength; nz.xy *= strength;
  // whiteout blend
  nx = vec3(nx.xy + n.zy, abs(nx.z) * n.x);
  ny = vec3(ny.xy + n.xz, abs(ny.z) * n.y);
  nz = vec3(nz.xy + n.xy, abs(nz.z) * n.z);
  vec3 blended = normalize(nx.zyx * w.x + ny.xzy * w.y + nz.xyz * w.z);
  float h = tx.w * w.x + ty.w * w.y + tz.w * w.z;
  return vec4(blended, h);
}

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x),
                 mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x),
                 mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  return 0.5333 * vnoise(p) + 0.2667 * vnoise(p * 2.03) + 0.1333 * vnoise(p * 4.01)
       + 0.0667 * vnoise(p * 8.03);
}
`;

const VERTEX_HEAD = /* glsl */`
attribute vec3 aRest;
attribute float aRegion;
varying vec3 vRest;
varying vec3 vRestN;
varying float vRegion;
varying vec2 vRun;
`;

/** GLSL declarations for the custom uniforms — onBeforeCompile only supplies values. */
function declare(uniforms) {
  return Object.entries(uniforms).map(([name, u]) => {
    const v = u.value;
    if (v && v.isTexture) return `uniform sampler2D ${name};`;
    if (v && v.isColor) return `uniform vec3 ${name};`;
    if (v && v.isVector3) return `uniform vec3 ${name};`;
    if (v && v.isVector2) return `uniform vec2 ${name};`;
    return `uniform float ${name};`;
  }).join('\n');
}

function patch(material, { fragColor, fragNormal = true, uniforms = {} }) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n  vRest = aRest;\n  vRestN = normalize(normal);\n  vRegion = aRegion;\n  vRun = uv;`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${declare(uniforms)}\n${COMMON}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${fragColor}`);

    if (fragNormal) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>\n  normal = normalize(alignRot(normalize(vRestN), normalize(normal), gNormal));`,
      );
    }
    material.userData.shader = shader;
  };
  material.customProgramCacheKey = () => material.name;
  return material;
}

// ---------------------------------------------------------------------------
// Scaled hide
// ---------------------------------------------------------------------------
const SKIN_FRAG = /* glsl */`
  vec3 Nr = normalize(vRestN);
  vec3 P = vRest;
  // head masks are authored pre-scale, so undo the head transform for them
  vec3 HP = vec3(HEAD_PX, HEAD_PY, HEAD_PZ);
  vec3 H = (P - vec3(HEAD_OX, HEAD_OY, HEAD_OZ) - HP) / HEAD_S + HP;
  vec3 A = vec3(abs(H.x), H.y, H.z);

  // H.y, not P.y. Driven from world Y this only reached 1 above the eyes, so the
  // whole lower jaw was shaded as body — coarse scales, none of the head's macro
  // variation — and read as a pale smooth panel bolted under a detailed muzzle.
  float headMask = ss(1.535, 1.585, H.y);
  // Two FIXED scale frequencies blended by a noise mask. Scaling the triplanar UVs
  // by a spatially varying factor warps the domain and produces contour-line swirls.
  float freq = mix(16.0, 25.0, headMask);
  vec4 fine = triDetail(P, Nr, freq, mix(1.55, 1.45, headMask));
  vec4 plateD = triDetail(P, Nr, freq * 0.19, 1.5);
  float sizeMix = ss(0.38, 0.66, fbm(P * 3.1 + 4.0)) * 0.4;
  // zoned scale size: big armour plates over the cranium, fine pebbling on the
  // muzzle and cheek. One uniform frequency reads as fishnet, not hide.
  float crownZone = ss(1.652, 1.690, H.y) * ss(0.170, 0.105, H.z);
  // big scutes under the chin and along the lower jaw — in the references these are
  // the largest scales on the animal and markedly darker than the muzzle
  // the Z gate has to reach past the front of the chin (H.z ~0.168) or it closes on
  // exactly the part of the jaw that reads too pale
  float chinZone = ss(1.620, 1.570, H.y) * ss(0.196, 0.172, H.z) * headMask;
  float plateMix = clamp(sizeMix + crownZone * 0.8 + chinZone * 0.7, 0.0, 1.0);
  gNormal = normalize(mix(fine.xyz, plateD.xyz, plateMix));
  float h = mix(fine.w, plateD.w, plateMix);

  // jitter the mask coordinates so painted edges follow the scales instead of
  // cutting across them in hard geometric arcs
  vec3 J = A + (vec3(fbm(P * 44.0), fbm(P * 44.0 + 9.0), fbm(P * 44.0 + 21.0)) - 0.5) * 0.016;

  // --- masks -------------------------------------------------------------
  float ventral = ss(0.05, 0.62, dot(Nr, normalize(vec3(0.0, -0.80, 0.60))));
  ventral = max(ventral, ss(0.15, -0.5, Nr.y) * ss(1.70, 1.58, H.y));
  // The reference face is one uniform dark olive from brow to chin — it has NO pale
  // belly tone. Kill ventral outright above the jaw line rather than merely damping
  // it, or the lower muzzle washes out to a light yellow-green.
  ventral *= 1.0 - 0.94 * ss(1.515, 1.568, H.y);

  // armoured skull cap: top of the braincase, wrapping down over the temples
  // covers the whole cranium from the brow back, wrapping down behind the eyes —
  // driven by position, not by normal, so it does not fade out on the flanks
  float cap = ss(1.648, 1.672, J.y) * ss(0.198, 0.122, J.z);
  cap = max(cap, ss(1.612, 1.658, J.y) * ss(-0.005, -0.075, J.z));  // occiput
  cap *= ss(0.132, 0.104, abs(J.x));                                 // not the very flanks
  cap = max(cap, ss(1.682, 1.702, J.y) * ss(0.140, 0.106, J.z));     // crown, full width

  // dark scaled band around the eye socket and temple
  float eyeD = length((J - vec3(EYE_X, EYE_Y + 0.004, EYE_Z + 0.018)) * vec3(0.60, 1.05, 0.46));
  float socket = ss(0.132, 0.048, eyeD) * ss(1.628, 1.650, H.y);
  // ...continuing back from the eye to the jaw hinge as a dark mask stripe. This is
  // the strongest value break on the reference face and without it the cheek reads
  // as one flat panel between brow and jaw.
  float maskD = length((J - vec3(0.052, 1.6725, -0.006)) * vec3(0.42, 2.05, 0.86));
  socket = max(socket, ss(0.098, 0.030, maskD) * 0.82);

  // maroon plate over the brow ridges and between the eyes. This is a NARROW band
  // just above the eyes in the reference; at its old extent it flooded the whole
  // cranium and the skull read red-brown instead of near-black olive.
  float browD = length((J - vec3(0.040, 1.7175, 0.046)) * vec3(0.62, 3.6, 1.35));
  float brow = ss(0.070, 0.014, browD) * ss(-0.55, 0.10, Nr.y) * step(1.646, H.y);

  // dorsal scute ridge down the tail — a plain taper reads as a rubber tube
  float tailZone = ss(-0.10, -0.16, P.z) * ss(1.02, 0.94, P.y);
  float tailTop = tailZone * ss(0.15, 0.62, Nr.y) * ss(0.030, 0.012, abs(P.x));
  float tailScute = ss(0.30, 0.85, abs(sin(P.z * 62.0 + P.y * 26.0)));

  // banded scutes on throat and belly
  float bands = ss(0.18, 0.92, abs(sin(P.y * 62.0 + P.z * 8.0)));
  float bandZone = ventral * ss(1.36, 1.44, H.y) * ss(1.645, 1.575, H.y);
  bandZone = max(bandZone, ventral * ss(1.35, 1.25, P.y) * ss(0.80, 0.95, P.y));

  // --- colour ------------------------------------------------------------
  float mottle = fbm(P * 19.0);
  float blotch = fbm(P * 5.6 + 11.0);
  float macro  = fbm(P * 1.45 + 31.0);   // large irregular blotching

  vec3 dorsal   = vec3(0.0275, 0.0355, 0.0185);
  vec3 dorsal2  = vec3(0.0068, 0.0098, 0.0056);
  vec3 warmOl   = vec3(0.0316, 0.0348, 0.0198);
  vec3 belly    = vec3(0.0292, 0.0318, 0.0206);
  vec3 plate    = vec3(0.0062, 0.0068, 0.0048);   // dark OLIVE-black, not blue-black
  vec3 maroon   = vec3(0.0322, 0.0092, 0.0076);
  vec3 boneCol  = vec3(0.088, 0.078, 0.055);

  vec3 col = mix(dorsal2, dorsal, ss(0.30, 0.72, mottle * 0.6 + blotch * 0.7));
  col = mix(col, warmOl, ss(0.45, 0.88, blotch));
  col = mix(col, col * 0.46, ss(0.42, 0.72, macro) * 0.55);
  // Head-only macro blotching. Killing the pale ventral wash left the face one even
  // panel of green; the reference muzzle is mottled dark-on-dark, with the top of
  // the snout markedly darker than the flanks.
  float snoutTop = ss(1.630, 1.676, H.y) * ss(0.020, 0.090, H.z) * ss(0.20, 0.78, Nr.y);
  col = mix(col, col * 0.70, headMask * snoutTop * 0.62);
  col = mix(col, col * mix(0.70, 1.16, ss(0.34, 0.70, fbm(P * 8.5 + 61.0))), headMask * 0.55);
  col = mix(col, belly, ventral * 0.66);
  col = mix(col, belly * vec3(1.06, 1.00, 0.80), bandZone * bands * 0.55);
  col = mix(col, mix(dorsal2, plate, 0.5), tailTop * (0.35 + 0.5 * tailScute));
  col = mix(col, plate, cap * 0.97);
  col = mix(col, plate * vec3(1.15, 1.20, 1.55), socket * 0.98);
  col = mix(col, maroon, brow * 0.98);
  // three cream claw-mark streaks across the maroon brow band
  float streak = ss(0.72, 0.97, abs(sin((J.x - 0.010) * 150.0)));
  col = mix(col, boneCol * 0.72, brow * streak * ss(0.014, 0.048, abs(J.x)) * 0.85);

  // dark closed lip line along the mouth crease
  float lipY = LIP_Y0 + (LIP_Z0 - H.z) * LIP_SLOPE;
  // thin. At 2x this width it stopped reading as a closed mouth and became a
  // letterbox slot painted across the face.
  float lip = ss(0.0072, 0.0020, abs(H.y - lipY))
            * ss(0.186, 0.174, H.z) * ss(0.006, 0.028, H.z);
  col = mix(col, vec3(0.0032, 0.0028, 0.0026), lip * 0.99);

  // crevices between scales go dark. Range kept narrow: at 0.42..1.06 the detail
  // height alone swung local brightness 2.5x, so wherever the scale texture happened
  // to sit high the hide jumped to a pale wash that read as a lighting error.
  col *= mix(0.52, 1.04, ss(0.02, 0.55, h));
  // darker AND warmer: the jaw was not merely bright, it was the greenest thing on
  // the head, where the reference jaw is its most neutral, most shadowed area
  col = mix(col, col * vec3(0.60, 0.53, 0.52), chinZone * 0.88);
  // cream mortar lines between the cranial plates — in the reference the gaps are
  // LIGHTER than the plates, the opposite of a generic crevice darkening
  col = mix(col, boneCol * 0.30, crownZone * (1.0 - ss(0.06, 0.30, h)) * 0.38);

  diffuseColor.rgb = col;
  float rough = mix(0.88, 0.60, ss(0.2, 0.8, h));
  rough *= mix(1.0, 0.86, ventral);
  rough = mix(rough, 0.94, cap * 0.85);
  rough = mix(rough, 0.56, socket * 0.75);   // the orbital mass is glossier, not wet
  gRoughOut = clamp(rough + (mottle - 0.5) * 0.12, 0.28, 0.98);

  // uDebug: 1 = cap/brow/socket as R/G/B, 2 = ventral/bandZone/bands, 3 = rest-space
  // normal, 4 = ventral ALONE in greyscale, 5 = head-space H.y banded every 10 mm
  // with a red stripe at 1.60. Set via window.argonian.debugMasks(n).
  //
  // Mode 5 is the one to reach for first: nearly every mis-placed mask in this
  // shader has turned out to be a threshold sitting somewhere other than where it
  // was assumed to, and reading the coordinate straight off the surface settles it
  // in one look instead of a rebuild per hypothesis.
  if (uDebug > 0.5) {
    vec3 dbg = vec3(0.0);
    if (uDebug < 1.5) dbg = vec3(cap, brow, socket);
    else if (uDebug < 2.5) dbg = vec3(ventral, bandZone, bands);
    else if (uDebug < 3.5) dbg = Nr * 0.5 + 0.5;
    else if (uDebug < 4.5) dbg = vec3(ventral);
    else {
      float band = fract((H.y - 1.50) * 100.0);
      dbg = vec3(step(0.5, band) * 0.7 + 0.15);
      dbg.r += ss(0.004, 0.0, abs(H.y - 1.60));
      dbg.g += ss(0.004, 0.0, abs(H.y - 1.70)) ;
    }
    diffuseColor.rgb = dbg;
    gRoughOut = 1.0;
  }
`;

// ---------------------------------------------------------------------------
const HORN_FRAG = /* glsl */`
  vec3 Nr = normalize(vRestN);
  vec4 det = triDetail(vRest, Nr, 90.0, 0.7);
  gNormal = det.xyz;
  float h = det.w;

  float t = vRun.y;
  vec3 bone  = vec3(0.086, 0.077, 0.056);
  vec3 tip   = vec3(0.055, 0.047, 0.033);
  vec3 dark  = vec3(0.022, 0.018, 0.015);

  vec3 col = mix(bone, tip, ss(0.45, 1.0, t));
  // dark root where the horn leaves the hide
  col = mix(col, dark, ss(0.19, 0.02, t));

  float grime = fbm(vRest * 60.0);
  col *= 0.80 + 0.34 * grime;
  col *= mix(0.62, 1.05, ss(0.1, 0.7, h));
  gRoughOut = clamp(0.48 + (1.0 - h) * 0.28 + grime * 0.12, 0.3, 0.95);

  // region 2 is the metal cuff: tarnished dark bronze, and actually metallic, so it
  // catches the rim lights differently from the keratin it is clamped to
  if (vRegion > 1.5) {
    // dull, tarnished and DARKER than the keratin it clamps — a bright band reads as
    // jewellery and pulls the eye off the face
    vec3 metal = vec3(0.062, 0.052, 0.038);
    col = metal * (0.58 + 0.55 * grime) * mix(0.66, 1.08, ss(0.15, 0.8, h));
    gRoughOut = clamp(0.52 + grime * 0.30, 0.34, 0.88);
    gMetalOut = 0.88;
  }
  diffuseColor.rgb = col;
`;

const EYE_FRAG = /* glsl */`
  vec3 c = vec3(sign(vRest.x) * EYE_X, EYE_Y, EYE_Z);
  vec3 d = normalize(vRest - c);
  vec3 G = normalize(vec3(sign(vRest.x) * GAZE_X, GAZE_Y, GAZE_Z));
  vec3 up = normalize(vec3(0.0, 1.0, 0.0) - G * G.y);
  vec3 rt = normalize(cross(up, G));
  float x = dot(d, rt), y = dot(d, up);
  float r = length(vec2(x, y));

  // Deep amber-orange, not the near-white yellow it was: in the references the eye
  // is a dark jewel set in a black socket, and it must not out-glow the horns.
  vec3 amber = vec3(0.480, 0.330, 0.062);
  vec3 amberHot = vec3(0.860, 0.700, 0.220);
  float fibers = fbm(vec3(atan(y, x) * 5.0, r * 26.0, 0.0));
  vec3 iris = mix(amber, amberHot, fibers * 0.85);
  iris *= 0.86 + 0.42 * ss(0.05, 0.55, r);

  vec3 col = mix(iris, vec3(0.009, 0.007, 0.005), ss(0.70, 0.84, r));
  // vertical slit pupil
  float slit = length(vec2(x / 0.150, y / 0.92));
  col = mix(vec3(0.004, 0.0035, 0.003), col, ss(0.92, 1.02, slit));
  // limbal ring
  col *= 1.0 - 0.55 * ss(0.62, 0.76, r) * (1.0 - ss(0.76, 0.9, r));

  diffuseColor.rgb = col;
  gRoughOut = mix(0.26, 0.62, ss(0.55, 0.80, r));
  // confine the glow to the iris ring, and kill it inside the pupil
  gEmissive = col * (1.0 - ss(0.60, 0.86, r)) * ss(0.92, 1.02, slit);
`;

const CLOTH_FRAG = /* glsl */`
  vec3 Nr = normalize(vRestN);
  vec4 det = triDetail(vRest, Nr, uWeave, 3.2);
  gNormal = det.xyz;
  float h = det.w;
  float dirt = fbm(vRest * 7.5);
  float wear = fbm(vRest * 24.0);
  vec3 col = uBase * (0.82 + 0.34 * dirt);
  col = mix(col, uBase * 0.60, ss(0.58, 0.92, fbm(vRest * 3.1 + 5.0)));
  // wide range: the reference cloth is coarse and strongly self-shadowed, and at a
  // narrow range the garments render as one smooth latex bodysuit
  col *= mix(0.46, 1.14, ss(0.1, 0.75, h));
  col *= 0.94 + 0.11 * wear;
  // grime settles low on the garment
  col *= mix(0.72, 1.0, ss(0.75, 1.15, vRest.y));
  // stitched seams: shoulder line and side seam, so the tunic reads as made, not moulded
  float shoulderSeam = ss(0.016, 0.004, abs(vRest.y - (1.412 - (abs(vRest.x) - 0.076) * 0.375)))
                     * ss(0.070, 0.092, abs(vRest.x)) * ss(0.205, 0.180, abs(vRest.x));
  float sleeveSeam   = ss(0.011, 0.003, abs(vRest.y - 1.078)) * ss(0.14, 0.19, abs(vRest.x));
  float sideSeam     = ss(0.011, 0.003, abs(abs(vRest.x) - 0.176)) * ss(1.34, 1.12, vRest.y);
  float hemSeam      = ss(0.011, 0.003, abs(vRest.y - 0.812)) * ss(0.88, 0.80, vRest.y);
  float seam = max(max(shoulderSeam, sleeveSeam), max(sideSeam, hemSeam));
  col *= 1.0 - 0.62 * seam;
  gRoughOut = clamp(uRough + (1.0 - h) * 0.16 - wear * 0.08 + seam * 0.10, 0.35, 1.0);
  diffuseColor.rgb = col;
`;

// ---------------------------------------------------------------------------

function defines() {
  return {
    EYE_X: EYE.c[0].toFixed(5), EYE_Y: EYE.c[1].toFixed(5), EYE_Z: EYE.c[2].toFixed(5),
    GAZE_X: EYE.gaze[0].toFixed(4), GAZE_Y: EYE.gaze[1].toFixed(4), GAZE_Z: EYE.gaze[2].toFixed(4),
    HEAD_S: HEAD_XF.scale.toFixed(5),
    HEAD_PX: HEAD_XF.pivot[0].toFixed(5), HEAD_PY: HEAD_XF.pivot[1].toFixed(5), HEAD_PZ: HEAD_XF.pivot[2].toFixed(5),
    HEAD_OX: HEAD_XF.offset[0].toFixed(5), HEAD_OY: HEAD_XF.offset[1].toFixed(5), HEAD_OZ: HEAD_XF.offset[2].toFixed(5),
    LIP_Y0: LIP.y0.toFixed(5), LIP_Z0: LIP.z0.toFixed(5), LIP_SLOPE: LIP.slope.toFixed(5),
  };
}

/**
 * Wraps the body of injected code so it can write `gNormal` / `gRoughOut`, which we
 * then feed into three's own normal + roughness stages.
 */
function wrap(frag) {
  return `
  vec3 gNormal = vec3(0.0, 0.0, 1.0);
  float gRoughOut = -1.0;
  float gMetalOut = -1.0;
  vec3 gEmissive = vec3(-1.0);
  {
    ${frag}
  }
  `;
}

function finishRoughness(material) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>\n  if (gRoughOut >= 0.0) roughnessFactor = gRoughOut;`)
      .replace('#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>\n  if (gMetalOut >= 0.0) metalnessFactor = gMetalOut;`)
      .replace('#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\n  if (gEmissive.r >= 0.0) totalEmissiveRadiance *= gEmissive;`);
  };
}

export function createMaterials() {
  const scale = makeScaleTexture(512, 15, 7);
  const cloth = makeClothTexture(512, 46, 19);
  const leather = makeLeatherTexture(512, 22, 41);

  const mk = (name, opts, frag, uniforms, fragNormal = true) => {
    const m = new THREE.MeshStandardMaterial({ name, ...opts });
    m.defines = { ...defines(), ...(opts.defines || {}) };
    patch(m, { fragColor: wrap(frag), fragNormal, uniforms });
    finishRoughness(m);
    return m;
  };

  const skin = mk('argonianSkin', { roughness: 0.8, metalness: 0.0 }, SKIN_FRAG,
    { uDetail: { value: scale }, uDebug: { value: 0 } });

  const horn = mk('argonianHorn', { roughness: 0.55, metalness: 0.0 }, HORN_FRAG,
    { uDetail: { value: scale } });

  const eye = mk('argonianEye', {
    roughness: 0.30, metalness: 0.0,
    emissive: new THREE.Color(0x8a7a24), emissiveIntensity: 0.70,
  }, EYE_FRAG, { uDetail: { value: scale } }, false);

  const clothMat = (name, base, rough, weave, tex) => mk(name, { roughness: rough }, CLOTH_FRAG, {
    uDetail: { value: tex },
    uBase: { value: new THREE.Color(...base) },
    uRough: { value: rough },
    uWeave: { value: weave },
  });

  return {
    skin,
    horn,
    eye,
    // Values are separated deliberately. Authored close together they collapsed into
    // one flat brown mass in which tunic, trousers, belt and sash were indistinguishable
    // — the reference reads as separate garments before you resolve any detail.
    tunic: clothMat('tunic', [0.0285, 0.0262, 0.0232], 0.95, 22.0, cloth),
    undershirt: clothMat('undershirt', [0.0330, 0.0345, 0.0315], 0.95, 36.0, cloth),
    trousers: clothMat('trousers', [0.0208, 0.0198, 0.0186], 0.95, 20.0, cloth),
    wrap: clothMat('wrap', [0.0520, 0.0522, 0.0480], 0.96, 42.0, cloth),
    leather: clothMat('leather', [0.030, 0.020, 0.013], 0.68, 22.0, leather),
    sash: clothMat('sash', [0.0745, 0.0690, 0.0585], 0.82, 22.0, leather),
    belt: clothMat('belt', [0.0605, 0.0592, 0.0552], 0.90, 20.0, cloth),
    textures: { scale, cloth, leather },
  };
}
