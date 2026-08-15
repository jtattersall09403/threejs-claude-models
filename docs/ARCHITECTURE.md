# Architecture

Everything is procedural — no external assets, no downloaded models. `tools/build.mjs`
bundles `src/` plus three.js into one self-contained HTML file (Artifact pages run under
a strict CSP, so nothing may be fetched at runtime).

## Pipeline

```
rig/skeleton.js      rest-pose bones (metres, Y up, faces +Z, feet on y=0)
        │             proportions live HERE and nowhere else
        ▼
parts/anatomy.js     body + head as smooth-blended SDF primitives
parts/clothing.js    garments as OFFSETS of the body surface, trimmed to coverage
        │
        ▼
core/sdf.js          Field.bake() → voxel grid (primitives splat only over their AABB)
core/mc.js           marching cubes → indexed mesh, CCW-from-outside
        │
        ├── vertex normals from the SDF gradient (not face averaging — much cleaner)
        ├── light Taubin smoothing to kill marching-cubes ripple
        ▼
core/skin.js         auto skin weights: nearest bone segments, inverse-cube falloff
core/geom.js         MeshBuilder merges parts → one SkinnedMesh per material
        ▼
materials/           MeshStandardMaterial + injected GLSL; colour is driven by the
                     REST-POSE position so patterns stay locked to the body when
                     it animates
scene/viewer.js      renderer, lighting, OrbitControls, capture hooks
```

## Why SDF + marching cubes

Organic forms with no seams and no UV unwrapping. Blending is free (`smin`), and the
field can be queried afterwards — which is how garments are offset from the body and
how horns/spikes are seated on the real skull surface (`raySurface`).

The cost: **the blended surface sits several centimetres outside the primitives that
made it.** Anything positioned from primitive radii alone ends up buried. Always query
the field.

## Hard parts that are NOT SDF

Horns, crown/jaw spikes, teeth, claws, fingers, straps, belt, wrist wraps are swept
tubes (`core/geom.js: sweep/curveRings/spike`). They intersect the body deeply, and
since everything is opaque the intersection is invisible.

## Materials

One `SkinnedMesh` per material, all sharing one `Skeleton`.

| mesh | material | notes |
|---|---|---|
| `skin` | `argonianSkin` | body + head + fingers; hide colour from rest position |
| `horn` | `argonianHorn` | `aRegion=1` on the big horns → banded ring; 0 elsewhere |
| `eye` | `argonianEye` | iris + vertical slit drawn from the direction to the eye centre |
| `cloth3/4/5/6/7` | tunic / undershirt / leather / trousers / wrap | keyed by `REGION` |

Shared shader plumbing (`materials/materials.js`):
- `aRest` / `vRest` — rest-pose position, drives every pattern.
- `ss(a,b,x)` — descending-safe smoothstep. **Never use raw `smoothstep` with
  `edge0 > edge1`; it is undefined and returns garbage.**
- `triDetail()` — triplanar detail-normal sample in rest space, rotated into view
  space by aligning the rest normal with the shaded normal (`alignRot`). For isotropic
  scale/weave bumps the residual twist about the normal is invisible, so no tangents
  are needed.
- `declare()` — emits `uniform` declarations; `onBeforeCompile` only supplies values.
- Head masks are evaluated in **head-authoring space** (`H`), undoing `HEAD_XF`, so the
  head can be resized from one number without re-tuning every constant.

## Debugging affordances

| hook | use |
|---|---|
| `window.argonian.debugMasks(1\|2\|3)` | 1 = cap/brow/socket as RGB, 2 = ventral/bands, 3 = rest normal. **Use this before concluding a mask "doesn't work".** |
| `window.__meshAudit()` | signed volume + outward-face fraction per mesh; the winding guard |
| `window.__frameStats()` | subject's screen-space extent, for checking a framing |
| `window.__setCamera(az, el, dist, targetY, fov)` | deterministic framing |
| `window.argonian.bone('head')` | any bone by name |

## Animation readiness

`window.argonian` exposes `rig` (bones by name), `skeleton`, and a bound
`THREE.AnimationMixer` with no clips yet. Bones: `root, hips, spine, chest,
upperChest, neckBase, neck, head, headTop, jaw, jawTip, tail1..6`, and `.L`/`.R` pairs
of `clavicle, shoulder, elbow, wrist, hand, thumb1-3, index1-3, middle1-3, ring1-3,
pinky1-3, hip, knee, ankle, toe`.

Skin weights come from `buildSegments()`. Bones whose auto-generated span sits in the
wrong flesh get hand-authored spans in `EXTRA_SEGMENTS` — without those the upper
muzzle binds to the jaw and opens with it.
