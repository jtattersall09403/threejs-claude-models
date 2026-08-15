// Materials. Everything is a MeshStandardMaterial with injected shader code that
// drives colour/roughness from the *rest-pose* position, so patterns stay locked to
// the body when it animates. Detail normals are triplanar-sampled in rest space and
// rotated into view space by aligning the rest normal with the shaded normal — for
// isotropic scale/weave bumps the residual twist is imperceptible, and it means we
// need no tangents.
import * as THREE from 'three';
import { makeScaleTexture, makeClothTexture, makeLeatherTexture } from './textures.js';
import { EYE } from '../parts/anatomy.js';

const COMMON = /* glsl */`
varying vec3 vRest;
varying vec3 vRestN;
varying float vRegion;
varying vec2 vRun;

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

  float headMask = smoothstep(1.50, 1.58, P.y);
  float freq = mix(26.0, 52.0, headMask);
  vec4 det = triDetail(P, Nr, freq, mix(1.15, 0.95, headMask));
  gNormal = det.xyz;
  float h = det.w;

  // --- masks -------------------------------------------------------------
  // surfaces facing down / forward-down read as belly, throat, inner limbs
  float ventral = smoothstep(0.10, -0.55, dot(Nr, normalize(vec3(0.0, -0.80, 0.60))));
  ventral = max(ventral, smoothstep(0.15, -0.5, Nr.y) * smoothstep(1.66, 1.55, P.y));

  // armoured skull cap
  float cap = smoothstep(1.648, 1.672, P.y) * smoothstep(-0.05, 0.42, Nr.y);
  cap *= smoothstep(0.20, 0.10, P.z);
  cap = max(cap, smoothstep(1.60, 1.64, P.y) * smoothstep(-0.15, -0.55, P.z) * smoothstep(-0.2, 0.3, Nr.y));

  // dark band around the eye socket + temple
  vec3 e = vec3(abs(P.x), P.y, P.z) - vec3(EYE_X, EYE_Y, EYE_Z);
  float eyeD = length(e * vec3(1.0, 1.35, 1.0));
  float socket = smoothstep(0.062, 0.030, eyeD) * step(1.55, P.y);

  // maroon plate over the brow ridges and between the eyes
  float browD = length((vec3(abs(P.x), P.y, P.z) - vec3(0.042, 1.6805, 0.052)) * vec3(0.85, 2.4, 1.0));
  float brow = smoothstep(0.072, 0.020, browD) * smoothstep(-0.1, 0.35, Nr.y) * step(1.60, P.y);

  // banded scutes on throat and belly
  float bandPhase = P.y * 96.0 + P.z * 12.0;
  float bands = smoothstep(0.35, 0.9, abs(sin(bandPhase)));
  float bandZone = ventral * smoothstep(1.50, 1.58, P.y) * smoothstep(1.70, 1.62, P.y);
  bandZone = max(bandZone, ventral * smoothstep(1.35, 1.25, P.y) * smoothstep(0.80, 0.95, P.y));

  // --- colour ------------------------------------------------------------
  float mottle = fbm(P * 21.0);
  float blotch = fbm(P * 6.3 + 11.0);

  vec3 dorsal   = vec3(0.113, 0.126, 0.062);
  vec3 dorsal2  = vec3(0.062, 0.070, 0.036);
  vec3 belly    = vec3(0.232, 0.219, 0.126);
  vec3 plate    = vec3(0.030, 0.030, 0.028);
  vec3 maroon   = vec3(0.112, 0.036, 0.030);

  vec3 col = mix(dorsal2, dorsal, smoothstep(0.30, 0.72, mottle * 0.6 + blotch * 0.7));
  col = mix(col, col * vec3(1.25, 1.16, 0.86), smoothstep(0.45, 0.85, blotch));
  col = mix(col, belly, ventral * 0.86);
  col = mix(col, belly * vec3(1.06, 1.02, 0.92), bandZone * bands * 0.5);
  col = mix(col, plate, cap * 0.94);
  col = mix(col, plate * 1.25, socket * 0.9);
  col = mix(col, maroon, brow * 0.85);

  // crevices between scales go dark
  col *= mix(0.42, 1.06, smoothstep(0.05, 0.62, h));

  diffuseColor.rgb = col;
  vec3 gRough = vec3(mix(0.86, 0.58, smoothstep(0.2, 0.8, h)));
  gRough *= mix(1.0, 0.82, ventral);
  gRough *= mix(1.0, 0.74, cap);
  gRoughOut = clamp(gRough.x + (mottle - 0.5) * 0.12, 0.28, 0.98);
`;

// ---------------------------------------------------------------------------
const HORN_FRAG = /* glsl */`
  vec3 Nr = normalize(vRestN);
  vec4 det = triDetail(vRest, Nr, 90.0, 0.7);
  gNormal = det.xyz;
  float h = det.w;

  float t = vRun.y;
  vec3 bone  = vec3(0.324, 0.287, 0.196);
  vec3 tip   = vec3(0.212, 0.183, 0.126);
  vec3 dark  = vec3(0.043, 0.036, 0.030);

  vec3 col = mix(bone, tip, smoothstep(0.45, 1.0, t));
  // dark root where the horn leaves the hide
  col = mix(col, dark, smoothstep(0.22, 0.02, t));
  // banded ring on the big horns only
  float ring = step(0.5, vRegion) * smoothstep(0.055, 0.02, abs(t - 0.175));
  col = mix(col, dark * 1.6, ring * 0.85);

  float grime = fbm(vRest * 60.0);
  col *= 0.80 + 0.34 * grime;
  col *= mix(0.62, 1.05, smoothstep(0.1, 0.7, h));
  diffuseColor.rgb = col;
  gRoughOut = clamp(0.48 + (1.0 - h) * 0.28 + grime * 0.12, 0.3, 0.95);
`;

const EYE_FRAG = /* glsl */`
  vec3 c = vec3(sign(vRest.x) * EYE_X, EYE_Y, EYE_Z);
  vec3 d = normalize(vRest - c);
  vec3 G = normalize(vec3(sign(vRest.x) * GAZE_X, GAZE_Y, GAZE_Z));
  vec3 up = normalize(vec3(0.0, 1.0, 0.0) - G * G.y);
  vec3 rt = normalize(cross(up, G));
  float x = dot(d, rt), y = dot(d, up);
  float r = length(vec2(x, y));

  vec3 amber = vec3(0.560, 0.288, 0.026);
  vec3 amberHot = vec3(0.780, 0.470, 0.070);
  float fibers = fbm(vec3(atan(y, x) * 5.0, r * 26.0, 0.0));
  vec3 iris = mix(amber, amberHot, fibers * 0.85);
  iris *= 0.72 + 0.55 * smoothstep(0.05, 0.5, r);

  vec3 col = mix(iris, vec3(0.020, 0.014, 0.008), smoothstep(0.46, 0.60, r));
  // vertical slit pupil
  float slit = length(vec2(x / 0.115, y / 0.40));
  col = mix(vec3(0.006, 0.005, 0.004), col, smoothstep(0.86, 1.06, slit));
  // limbal ring
  col *= 1.0 - 0.6 * smoothstep(0.36, 0.47, r) * (1.0 - smoothstep(0.47, 0.56, r));

  diffuseColor.rgb = col;
  gRoughOut = 0.14;
`;

const CLOTH_FRAG = /* glsl */`
  vec3 Nr = normalize(vRestN);
  vec4 det = triDetail(vRest, Nr, uWeave, 1.0);
  gNormal = det.xyz;
  float h = det.w;
  float dirt = fbm(vRest * 7.5);
  float wear = fbm(vRest * 24.0);
  vec3 col = uBase * (0.72 + 0.55 * dirt);
  col = mix(col, uBase * 0.42, smoothstep(0.55, 0.9, fbm(vRest * 3.1 + 5.0)));
  col *= mix(0.58, 1.08, smoothstep(0.1, 0.75, h));
  col *= 0.9 + 0.2 * wear;
  // grime settles low on the garment
  col *= mix(0.72, 1.0, smoothstep(0.75, 1.15, vRest.y));
  diffuseColor.rgb = col;
  gRoughOut = clamp(uRough + (1.0 - h) * 0.16 - wear * 0.08, 0.35, 1.0);
`;

// ---------------------------------------------------------------------------

function defines() {
  return {
    EYE_X: EYE.c[0].toFixed(5), EYE_Y: EYE.c[1].toFixed(5), EYE_Z: EYE.c[2].toFixed(5),
    GAZE_X: EYE.gaze[0].toFixed(4), GAZE_Y: EYE.gaze[1].toFixed(4), GAZE_Z: EYE.gaze[2].toFixed(4),
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
  {
    ${frag}
  }
  `;
}

function finishRoughness(material) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>\n  if (gRoughOut >= 0.0) roughnessFactor = gRoughOut;`,
    );
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
    { uDetail: { value: scale } });

  const horn = mk('argonianHorn', { roughness: 0.55, metalness: 0.0 }, HORN_FRAG,
    { uDetail: { value: scale } });

  const eye = mk('argonianEye', {
    roughness: 0.12, metalness: 0.0,
    emissive: new THREE.Color(0x2a1403), emissiveIntensity: 0.55,
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
    tunic: clothMat('tunic', [0.128, 0.098, 0.070], 0.92, 30.0, cloth),
    undershirt: clothMat('undershirt', [0.150, 0.150, 0.121], 0.95, 44.0, cloth),
    trousers: clothMat('trousers', [0.088, 0.076, 0.062], 0.94, 26.0, cloth),
    wrap: clothMat('wrap', [0.196, 0.196, 0.160], 0.96, 52.0, cloth),
    leather: clothMat('leather', [0.075, 0.055, 0.040], 0.70, 22.0, leather),
    textures: { scale, cloth, leather },
  };
}
