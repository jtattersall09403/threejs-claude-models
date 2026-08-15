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

/**
 * Drape creases for cloth: ridged noise, stretched vertically so the folds hang.
 * This lives in the shader because the garment bake (4 mm cells) cannot resolve
 * creases this fine — pushing the SDF hard enough to try produces faceted plateaus,
 * and pushing it further drives the garment inside the body.
 */
float clothCrease(vec3 p) {
  // Two smooth octaves, NOT fbm: fbm's high octaves are isotropic and turn the
  // creases into marbled camouflage blotches instead of hanging drape lines.
  // Elongated, but only ~3:1. At 5:1 the creases stretch into full-length vertical
  // streaks that read as stains running down the garment rather than as folds.
  float d = vnoise(vec3(p.x * 28.0, p.y * 9.5, p.z * 28.0)) * 0.66
          + vnoise(vec3(p.x * 57.0, p.y * 21.0, p.z * 57.0)) * 0.34;
  float c = 1.0 - abs(d * 2.0 - 1.0);
  return pow(clamp(c, 0.0, 1.0), 2.4);
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
  float chinZone = ss(1.627, 1.577, H.y) * ss(0.178, 0.156, H.z) * headMask;
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
  // NARROW. debugMasks(1) showed this term evaluating to 1 across the ENTIRE cranium
  // once the skull was made taller — so near-black plate was painted over the whole
  // head and nothing else applied on top of it could read, least of all the brow's
  // maroon. It is meant to be the dark crown cap, not the head.
  cap = max(cap, ss(1.706, 1.732, J.y) * ss(0.096, 0.056, J.z));     // crown, full width

  // dark scaled band around the eye socket and temple
  // BOTH of these are CHEEK marks and neither may cross the muzzle. Their per-axis
  // weights are small in x (0.60 and 0.40), so measured from a centre 47-56 mm out on
  // the cheek their ellipsoidal falloff still evaluated to ~0.9 on the CENTRELINE of
  // the snout — and since they paint near-black plate at 98%, the whole front of the
  // muzzle rendered as a black mask. Nothing about the masks looked wrong in isolation;
  // it was the reach across x that did it. An explicit lateral gate is the fix.
  float lateral = ss(0.024, 0.046, abs(J.x));
  float eyeD = length((J - vec3(EYE_X, EYE_Y + 0.004, EYE_Z + 0.018)) * vec3(0.60, 1.05, 0.46));
  float socket = ss(0.140, 0.050, eyeD) * ss(1.618, 1.646, H.y) * lateral;
  // ...continuing back from the eye to the jaw hinge as a dark mask stripe. This is
  // the strongest value break on the reference face and without it the cheek reads
  // as one flat panel between brow and jaw.
  float maskD = length((J - vec3(0.054, 1.6775, -0.004)) * vec3(0.40, 1.75, 0.80));
  socket = max(socket, ss(0.110, 0.032, maskD) * 0.92 * lateral * ss(0.095, 0.042, J.z));

  // maroon plate over the brow ridges and between the eyes. This is a NARROW band
  // just above the eyes in the reference; at its old extent it flooded the whole
  // cranium and the skull read red-brown instead of near-black olive.
  // A FIELD, not a stripe. At a y-weight of 4.6 this covered a 2.6 cm band; the
  // references carry dark red over the whole brow shelf and back to the horn roots,
  // roughly a fifth of the frontal head area.
  // A BAND over the brow ridge, not a field over the cranium. At an x weight of 0.50
  // the ellipsoid reached 0.176 in x — wider than the whole head — so 70% maroon went
  // over the entire skull and the head read mauve-grey above a green muzzle: a hard
  // two-tone split the references do not have. In them the red is dark plates on the
  // brow shelf and the crest, with olive showing between them and over the occiput.
  float browD = length((J - vec3(0.0432, 1.7205, 0.054)) * vec3(0.62, 1.72, 1.10));
  float brow = ss(0.074, 0.016, browD) * ss(-0.62, 0.10, Nr.y) * ss(1.646, 1.672, H.y)
             * ss(-0.020, 0.014, J.z);
  // broken into plates rather than one even wash of colour
  brow *= 0.62 + 0.55 * ss(0.30, 0.74, fbm(J * 52.0 + 5.0));

  // dorsal scute ridge down the tail — a plain taper reads as a rubber tube
  float tailZone = ss(-0.10, -0.16, P.z) * ss(1.02, 0.94, P.y);
  float tailTop = tailZone * ss(0.15, 0.62, Nr.y) * ss(0.030, 0.012, abs(P.x));
  float tailScute = ss(0.30, 0.85, abs(sin(P.z * 62.0 + P.y * 26.0)));

  // banded scutes on throat and belly
  // 62 rad/m is a 10 cm period — less than one full band across a 6 cm throat, so the
  // throat and the underside of the jaw rendered as one smooth pale expanse. Every
  // reference crop shows a clear ladder of horizontal scutes there, and it is the main
  // thing that stops the throat reading as an inflated balloon.
  float bands = ss(0.18, 0.92, abs(sin(P.y * 176.0 + P.z * 20.0)));
  float bandZone = ventral * ss(1.36, 1.44, H.y) * ss(1.645, 1.575, H.y);
  bandZone = max(bandZone, ventral * ss(1.35, 1.25, P.y) * ss(0.80, 0.95, P.y));

  // --- colour ------------------------------------------------------------
  float mottle = fbm(P * 19.0);
  float blotch = fbm(P * 5.6 + 11.0);
  float macro  = fbm(P * 1.45 + 31.0);   // large irregular blotching

  // Green/red here has to be read against the KEY LIGHT, not on its own. The key is
  // 0xffe6cc — warm, and it multiplies the albedo by roughly (1.00, 0.90, 0.80). At an
  // albedo G/R of 1.22 the hide rendered at 1.10, which is a warm grey-brown, and the
  // side-by-side against every reference crop read brown where the reference reads
  // olive. Authored at 1.46 it lands near 1.31 on screen.
  vec3 dorsal   = vec3(0.0194, 0.0288, 0.0130);
  vec3 dorsal2  = vec3(0.0055, 0.0086, 0.0046);
  vec3 warmOl   = vec3(0.0226, 0.0312, 0.0144);
  vec3 belly    = vec3(0.0232, 0.0302, 0.0156);
  vec3 plate    = vec3(0.0050, 0.0074, 0.0042);   // dark OLIVE-black, not blue-black
  // R/G ~2.1, not ~4.8. The critic measured the reference brow at R/G 1.74 against a
  // 1.17 muzzle; pushed to a pure red this floods the crown salmon-pink instead of
  // reading as dark oxblood over olive.
  // DARKER than the hide as well as redder. At R/G 2.1 and a luminance close to the
  // olive's, mixing it in at 40% produced a warm neutral that vanished under the warm
  // key — the reference's brow plates read because they are dark shields, not because
  // they are red. (The old note about pure red flooding the crown pink applied when
  // this field covered the whole cranium; it is a confined band now.)
  vec3 maroon   = vec3(0.0286, 0.0094, 0.0078);
  vec3 boneCol  = vec3(0.082, 0.080, 0.052);

  vec3 col = mix(dorsal2, dorsal, ss(0.30, 0.72, mottle * 0.6 + blotch * 0.7));
  col = mix(col, warmOl, ss(0.45, 0.88, blotch));
  col = mix(col, col * 0.46, ss(0.42, 0.72, macro) * 0.55);
  // Head-only macro blotching. Killing the pale ventral wash left the face one even
  // panel of green; the reference muzzle is mottled dark-on-dark, with the top of
  // the snout markedly darker than the flanks.
  float snoutTop = ss(1.630, 1.676, H.y) * ss(0.020, 0.090, H.z) * ss(0.20, 0.78, Nr.y);
  col = mix(col, col * 0.87, headMask * snoutTop * 0.35);
  col = mix(col, col * mix(0.84, 1.18, ss(0.34, 0.70, fbm(P * 8.5 + 61.0))), headMask * 0.55);
  col = mix(col, belly, ventral * 0.52);
  col = mix(col, belly * vec3(1.06, 1.00, 0.80), bandZone * bands * 0.55);
  // Transverse scutes across the UNDERSIDE OF THE JAW. The band term above is driven
  // from world P at 62 rad/m — a 10 cm period, which is half a cycle across a jaw that is
  // 5 cm deep, so the whole underside rendered as one smooth pale blob. In the
  // jawline reference this is a clear ladder of horizontal plates and it is most of
  // what stops the throat reading as a balloon from below.
  float jawScute = ss(0.22, 0.90, abs(sin(H.z * 232.0 + H.x * 34.0)));
  float jawUnder = headMask * ventral * ss(1.642, 1.586, H.y);
  col = mix(col, col * mix(0.66, 1.18, jawScute), jawUnder * 0.62);
  // The tail is the only large expanse of bare hide left on a clothed figure, it is
  // smooth and convex, and it sits where both rim lights catch it — so at the body's
  // own value it rendered as the brightest, most saturated object in every rear
  // three-quarter frame, reading as a separate prop rather than as part of the animal.
  col *= mix(1.0, 0.72, tailZone);
  col = mix(col, mix(dorsal2, plate, 0.5), tailTop * (0.35 + 0.5 * tailScute));
  col = mix(col, plate * 0.72, cap * 0.98);
  col = mix(col, plate * vec3(1.15, 1.20, 1.55), socket * 0.98);
  // partial mix, so the olive hide shows through and the band lands near the
  // reference's 1.74 rather than at the paint's own ratio
  col = mix(col, maroon, brow * 0.95);
  // three cream claw-mark streaks across the maroon brow band
  float streak = ss(0.72, 0.97, abs(sin((J.x - 0.010) * 150.0)));
  col = mix(col, boneCol * 0.78, brow * streak * ss(0.012, 0.052, abs(J.x)) * 0.95);

  // The face as a whole, minus the already-near-black skull cap. The muzzle flanks
  // stayed a light green after the chin was fixed; in the reference the entire head
  // is a dark, fairly desaturated olive with the crown darker still.
  float faceZone = headMask * (1.0 - cap) * ss(1.556, 1.598, H.y);
  col = mix(col, col * vec3(0.80, 0.84, 0.74), faceZone * 0.55);

  // Warm orange rim of scales right around the eye opening. Clearly present in every
  // reference crop and the strongest local hue accent on the head; without it the eye
  // sits in a flat dark patch.
  // Tight: the eye aperture is only ~24 mm across, so the ring has to live between
  // ~21 and ~31 mm. Scaled generously it stops being a rim and floods the whole
  // cheek and temple with orange.
  float rimD = length((J - vec3(EYE_X, EYE_Y - 0.001, EYE_Z + 0.003)) * vec3(0.90, 1.10, 0.78));
  float eyeRim = ss(0.0158, 0.0208, rimD) * ss(0.0300, 0.0238, rimD);
  col = mix(col, vec3(0.0620, 0.0272, 0.0086), eyeRim * 0.88);

  // A shadowed band under the jawline, so the jaw reads as a mass sitting above the
  // neck rather than continuing into it. NOT gated by headMask — headMask fades out
  // across 1.535..1.585, which is precisely the band this is trying to darken, so
  // multiplying by it cancels the effect exactly where it is wanted.
  // A soft UNDERCUT, not a hard horizontal line: widen the falloff and weight it by
  // downward-facing normals so it behaves like occlusion under the jaw rather than
  // a painted band across it.
  float jawShadow = ss(1.626, 1.548, H.y) * ss(1.454, 1.506, H.y) * ss(-0.06, 0.02, H.z);
  jawShadow *= 0.45 + 0.55 * ss(0.30, -0.55, Nr.y);
  col *= mix(1.0, 0.26, jawShadow);
  // ...and a lit edge right along the jawline itself, so the boundary reads as an
  // edge the light catches rather than only as a gradient
  float jawEdge = ss(0.0085, 0.0018, abs(H.y - 1.6145)) * ss(-0.03, 0.02, H.z)
                * ss(0.158, 0.134, H.z);
  col = mix(col, col * 1.55, jawEdge * 0.55);

  // NECK. In face-neck-jawline-closeup.jpg the neck is one of the largest features on
  // the character: a long column of LOOSE SKIN in vertical folds, distinctly LIGHTER
  // than the head, widening into the shoulders. Ours was a short dark tube.
  float neckZone = ss(1.386, 1.436, P.y) * ss(1.556, 1.512, P.y);
  float neckFold = 1.0 - abs(vnoise(vec3(P.x * 46.0, P.y * 5.0, P.z * 46.0)) * 2.0 - 1.0);
  neckFold = pow(clamp(neckFold, 0.0, 1.0), 2.2);
  col = mix(col, col * vec3(1.15, 1.13, 1.05), neckZone * 0.55);
  col *= mix(1.0, 0.60, neckZone * neckFold * 0.85);

  // The tail was rendering a distinctly cooler blue-green than the head. The
  // references never show it, so this is internal consistency only — but the two
  // visible skin areas have to agree in hue or the tail pulls the eye.
  col = mix(col, col * vec3(1.16, 0.98, 0.84), ss(-0.12, -0.20, P.z) * 0.80);

  // Rust-red hands. In the reference the hands are markedly warmer than the green
  // forearms — one of the few strong hue breaks anywhere on the character, and its
  // absence was part of why the whole figure read as a single monochrome mass.
  float handZone = ss(0.905, 0.860, P.y) * ss(0.180, 0.202, abs(P.x));
  col = mix(col, col * vec3(2.10, 1.06, 0.70), handZone * 0.76);

  // dark closed lip line along the mouth crease
  float lipY = LIP_Y0 + (LIP_Z0 - H.z) * LIP_SLOPE;
  // thin. At 2x this width it stopped reading as a closed mouth and became a
  // letterbox slot painted across the face.
  // Scalloped along its length: the reference mouth is broken by lip scutes, and a
  // single clean line of constant thickness reads as a painted-on dash.
  float scute = 0.72 + 0.28 * abs(sin(H.z * 118.0));
  // THIN. debugMasks(6) showed the mask was active and correctly placed but ~33 mm
  // wide — a uniformly dark band that broad over already-dark hide has nothing to
  // contrast against and reads as no mouth at all. The reference mouth is a crisp
  // line. Widening the paint was the wrong instinct three times running.
  // In ss(a, b, d) with a > b, the SECOND argument is the solid radius and the first
  // is where it fades out.
  // At b = 0.0008 the fully-dark core was 0.8 mm — sub-pixel at most framings, so the
  // line vanished even though debugMasks(6) showed the mask present and correct.
  float lip = ss(0.0062 * scute, 0.0022, abs(H.y - lipY))
            * ss(0.168, 0.157, H.z) * ss(0.006, 0.026, H.z);
  col = mix(col, vec3(0.0040, 0.0036, 0.0030), lip * 0.80);

  // Crevices between scales go dark on the BODY. Range kept narrow: at 0.42..1.06 the
  // detail height alone swung local brightness 2.5x, so wherever the scale texture
  // happened to sit high the hide jumped to a pale wash that read as a lighting error.
  // On the head the darkening is damped, because the head gets the opposite
  // treatment immediately below.
  col *= mix(mix(0.52, 1.04, ss(0.02, 0.55, h)),
             mix(0.92, 1.03, ss(0.02, 0.55, h)), headMask);
  // The reference hide's signature marking: over the whole head the gaps between
  // scales are LIGHTER than the scales, giving a pale reticulated mesh — the exact
  // opposite of a generic crevice darkening. Previously applied to the cranial
  // plates only, which left the muzzle looking like plain pebbled rubber.
  // The single most characteristic surface feature of the reference head: a BRIGHT
  // reticulated net dividing large flat plates. Generic crevice darkening is the
  // exact opposite, so on the head it is damped hard and this runs on top of it.
  // suppressed along the mouth: the bright net was filling the crease back in
  // NARROW. This paints pale olive at 92% and it is applied AFTER the brow plates and
  // the crown cap, so widening it to catch more of the scale height did not strengthen
  // the net — it flooded the whole head with one flat tone and ERASED the maroon brow.
  // Three "no visible change" iterations on the brow were this, not the brow.
  float mortar = (1.0 - ss(0.06, 0.32, h)) * headMask * (1.0 - cap * 0.55)
               * (1.0 - ss(0.012, 0.004, abs(H.y - (LIP_Y0 + (LIP_Z0 - H.z) * LIP_SLOPE))));
  // The reticulation is a PALE OLIVE net, not a cream one. Painted with boneCol it
  // covered most of the head in warm bone at 80% and was the main reason the head
  // still read brown next to a green tail after the base hide had been corrected.
  col = mix(col, vec3(0.0585, 0.0655, 0.0392), mortar * 0.92);
  // darker AND warmer: the jaw was not merely bright, it was the greenest thing on
  // the head, where the reference jaw is its most neutral, most shadowed area
  col = mix(col, col * vec3(0.74, 0.70, 0.66), chinZone * 0.60);
  // cream mortar lines between the cranial plates — in the reference the gaps are
  // LIGHTER than the plates, the opposite of a generic crevice darkening
  col = mix(col, boneCol * 0.24, crownZone * (1.0 - ss(0.08, 0.30, h)) * 0.30);

  diffuseColor.rgb = col;
  float rough = mix(0.88, 0.60, ss(0.2, 0.8, h));
  rough *= mix(1.0, 0.86, ventral);
  rough = mix(rough, 0.94, cap * 0.85);
  rough = mix(rough, 0.56, socket * 0.75);   // the orbital mass is glossier, not wet
  gRoughOut = clamp(rough + (mottle - 0.5) * 0.12, 0.28, 0.98);

  // uDebug: 1 = cap/brow/socket as R/G/B, 2 = ventral/bandZone/bands, 3 = rest-space
  // normal, 4 = ventral ALONE, 5 = head-space H.y banded every 10 mm, 6 = lip mask
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
    else if (uDebug < 6.5) {
      // 6 = the lip mask alone, with the lip CURVE drawn in green regardless of the
      // mask. If the green curve is on the surface but the white mask is not, the
      // failure is the mask's own gates, not the curve's placement.
      float lipY6 = LIP_Y0 + (LIP_Z0 - H.z) * LIP_SLOPE;
      dbg = vec3(lip);
      dbg.g += ss(0.0015, 0.0, abs(H.y - lipY6));
    }
    // 8 = the scale-texture HEIGHT h, and 9 = plateMix. If a patch of hide looks
    // smooth, these say whether the detail sample is missing (h flat) or merely being
    // taken at the wrong scale (plateMix high).
    else if (uDebug > 8.5) dbg = vec3(plateMix);
    else if (uDebug > 7.5) dbg = vec3(h);
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
  vec4 det = triDetail(vRest, Nr, 130.0, 1.15);
  gNormal = det.xyz;
  float h = det.w;

  float t = vRun.y;
  vec3 bone  = vec3(0.086, 0.077, 0.056);
  vec3 tip   = vec3(0.055, 0.047, 0.033);
  vec3 dark  = vec3(0.022, 0.018, 0.015);

  vec3 col = mix(bone, tip, ss(0.45, 1.0, t));
  // dark root where the horn leaves the hide
  col = mix(col, dark, ss(0.34, 0.02, t));

  float grime = fbm(vRest * 60.0);
  // longitudinal streaking along the run, plus dirt settling in the ridges: the
  // reference horn is a worn, stained thing, not turned ivory
  float streakH = fbm(vec3(vRun.x * 26.0, t * 7.0, 0.0));
  col *= 0.70 + 0.46 * grime;
  col *= mix(0.80, 1.10, streakH);
  col = mix(col, dark * 1.6, ss(0.42, 0.86, fbm(vec3(vRun.x * 9.0, t * 20.0, 3.0))) * 0.30);
  col *= mix(0.56, 1.06, ss(0.1, 0.7, h));
  gRoughOut = clamp(0.48 + (1.0 - h) * 0.28 + grime * 0.12, 0.3, 0.95);

  // region 4 is the crown crest. Dark oxblood in every reference that shows the crown
  // — the profile, the close crop and the bust all agree — where the horns, the jaw
  // spikes and the cheek spikes are pale bone. Rendered in bone it read as a tiara.
  if (vRegion > 3.5) {
    col = mix(vec3(0.0262, 0.0104, 0.0088), vec3(0.0104, 0.0046, 0.0042), ss(0.25, 1.0, t))
        * (0.78 + 0.38 * grime) * mix(0.86, 1.08, streakH);
    gRoughOut = clamp(0.62 + grime * 0.24, 0.42, 0.94);
  }
  // region 3 is the claws: dark horn, not the pale bone of the head spikes. Left the
  // same value they caught the light and the hand read as a fistful of ivory talons.
  else if (vRegion > 2.5) {
    col *= vec3(0.26, 0.245, 0.235);
    gRoughOut = clamp(gRoughOut - 0.12, 0.24, 0.9);
  }
  // region 2 is the metal cuff: tarnished dark bronze, and actually metallic, so it
  // catches the rim lights differently from the keratin it is clamped to
  else if (vRegion > 1.5) {
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
  // vRest is WORLD space; EYE_X/Y/Z are authoring space. Undo the head transform
  // first, exactly as SKIN_FRAG does. Compared directly, the iris centre lands about
  // two eyeball radii off the eyeball — the head offset alone is 34 mm against an
  // 18 mm ball — and every subsequent "the eye looks wrong" tweak is compensating
  // for that rather than fixing it.
  vec3 EHP = vec3(HEAD_PX, HEAD_PY, HEAD_PZ);
  vec3 EH = (vRest - vec3(HEAD_OX, HEAD_OY, HEAD_OZ) - EHP) / HEAD_S + EHP;
  vec3 c = vec3(sign(EH.x) * EYE_X, EYE_Y, EYE_Z);
  vec3 d = normalize(EH - c);
  vec3 G = normalize(vec3(sign(EH.x) * GAZE_X, GAZE_Y, GAZE_Z));
  vec3 up = normalize(vec3(0.0, 1.0, 0.0) - G * G.y);
  vec3 rt = normalize(cross(up, G));
  float x = dot(d, rt), y = dot(d, up);
  float r = length(vec2(x, y));

  // Deep amber-orange, not the near-white yellow it was: in the references the eye
  // is a dark jewel set in a black socket, and it must not out-glow the horns.
  vec3 amber = vec3(0.330, 0.176, 0.030);
  vec3 amberHot = vec3(0.520, 0.312, 0.070);
  float fibers = fbm(vec3(atan(y, x) * 5.0, r * 26.0, 0.0));
  vec3 iris = mix(amber, amberHot, fibers * 0.85);
  iris *= 0.86 + 0.42 * ss(0.05, 0.55, r);

  // The iris must fill the ENTIRE visible aperture. Fading it early leaves a grey
  // sclera ring, and a reptile eye has no visible sclera.
  vec3 col = mix(iris, vec3(0.006, 0.005, 0.004), ss(0.88, 0.99, r));
  // vertical slit pupil
  float slit = length(vec2(x / 0.150, y / 0.92));
  col = mix(vec3(0.004, 0.0035, 0.003), col, ss(0.92, 1.02, slit));
  // limbal ring
  col *= 1.0 - 0.42 * ss(0.74, 0.90, r);   // limbal darkening at the very rim

  diffuseColor.rgb = col;
  gRoughOut = mix(0.26, 0.62, ss(0.55, 0.80, r));
  // confine the glow to the iris ring, and kill it inside the pupil
  // A THIRD of the iris colour. At full strength the emissive doubled the iris's
  // brightness, which flattened the slit and the limbal ring out of existence and left
  // a pale yellow lozenge — the reference eye is a dark amber jewel with an obvious
  // black slit, and it must not out-glow the horns.
  gEmissive = col * 0.34 * (1.0 - ss(0.60, 0.86, r)) * ss(0.92, 1.02, slit);
`;

const CLOTH_FRAG = /* glsl */`
  vec3 Nr = normalize(vRestN);
  vec4 det = triDetail(vRest, Nr, uWeave, 1.1);
  gNormal = det.xyz;
  float h = det.w;
  float dirt = fbm(vRest * 7.5);
  float wear = fbm(vRest * 24.0);
  vec3 col = uBase * (0.82 + 0.34 * dirt);
  col = mix(col, uBase * 0.60, ss(0.58, 0.92, fbm(vRest * 3.1 + 5.0)));
  // wide range: the reference cloth is coarse and strongly self-shadowed, and at a
  // narrow range the garments render as one smooth latex bodysuit
  col *= mix(0.46, 1.14, ss(0.1, 0.75, h));

  // drape creases — shaded, not baked. Bend the normal into the crease as well as
  // darkening it, or the folds read as a painted-on pattern rather than as relief.
  float cr = clothCrease(vRest);
  const float E = 0.005;
  vec3 gr = vec3(clothCrease(vRest + vec3(E, 0.0, 0.0)),
                 clothCrease(vRest + vec3(0.0, E, 0.0)),
                 clothCrease(vRest + vec3(0.0, 0.0, E))) - cr;
  gr -= Nr * dot(gr, Nr);              // keep the perturbation tangential
  float gl = length(gr);
  if (gl > 1e-5) gNormal = normalize(gNormal - (gr / gl) * (0.30 * cr));
  // Subtle. Pushed hard this stops reading as folds and becomes blotchy damage —
  // the reference tunic is mostly smooth, with drape shown by broad soft shading.
  col *= mix(1.02, 0.90, cr);
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
  // Contact occlusion between the legs. With a narrow stance and no shadowing
  // between them the two limbs merge into a single dark column from the front.
  float innerLeg = ss(0.185, 0.045, abs(vRest.x))
                 * ss(1.00, 0.90, vRest.y) * ss(0.06, 0.20, vRest.y);
  col *= mix(1.0, 0.58, innerLeg);

  // Boot welt and toe-cap seams. Gated low so only the shoes get them — without any
  // seams the boots bake out as smooth featureless blocks.
  float welt   = ss(0.0060, 0.0014, abs(vRest.y - 0.0345)) * ss(0.20, 0.16, vRest.y);
  float toeCap = ss(0.0110, 0.0022, abs(vRest.z - 0.074)) * ss(0.15, 0.11, vRest.y);
  float bootSeam = max(welt, toeCap);
  col *= 1.0 - 0.52 * bootSeam;
  gRoughOut = clamp(uRough + (1.0 - h) * 0.16 - wear * 0.08 + seam * 0.10
                    + bootSeam * 0.12, 0.35, 1.0);
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
  const cloth = makeClothTexture(512, 22, 19);
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
    emissive: new THREE.Color(0x8a7a24), emissiveIntensity: 0.62,
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
    // warm dark brown with a maroon undertone, per the full-body reference — not the
    // neutral tan it was, which read as canvas rather than as a dyed woollen tunic
    tunic: clothMat('tunic', [0.0178, 0.0147, 0.0126], 0.95, 9.0, cloth),
    // Clearly above the coat, but a muted grey-GREEN, not cream. Polarity was the
    // defect the critic measured; overshooting into cream trades one error for another.
    undershirt: clothMat('undershirt', [0.0402, 0.0442, 0.0396], 0.95, 12.0, cloth),
    trousers: clothMat('trousers', [0.0196, 0.0183, 0.0168], 0.95, 9.0, cloth),
    wrap: clothMat('wrap', [0.0745, 0.0778, 0.0708], 0.96, 14.0, cloth),
    leather: clothMat('leather', [0.0162, 0.0114, 0.0082], 0.91, 22.0, leather),
    // sash and belt sit only a little above the tunic. Pushed further apart they
    // stopped reading as cloth and became bright metal blades laid across the chest.
    sash: clothMat('sash', [0.0812, 0.0768, 0.0678], 0.90, 18.0, leather),
    belt: clothMat('belt', [0.0648, 0.0632, 0.0580], 0.92, 9.0, cloth),
    textures: { scale, cloth, leather },
  };
}
