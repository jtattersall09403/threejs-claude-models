# PROGRESS — read this first

**Live artifact (always republish to this same URL):**
https://claude.ai/code/artifact/14637ddd-070e-40ea-926e-df6f773c0d92

**Branch:** `claude/argonian-threejs-character-j1wpzp` · **Rule 0: commit + push after
every step, the container restarts without warning.**

---

## Where the loop is

**Inner loop, iteration 3. No critic round has run yet** — the model is not good
enough to hand over. Run `.claude/agents/argonian-critic.md` only once the inner loop
produces something you would defend.

## State of the build

Working: geometry pipeline, rig, auto-skinning, garments, materials, capture harness,
winding audit. `npm run build && npm run capture` is green. ~545k tris, ~4.7 s build.

## Next actions (ranked — start at the top)

1. **Clothing silhouette.** The tunic is a featureless slab with no waist; sleeves run
   almost to the wrist. Reference: fitted at the waist, sleeves end mid-forearm leaving
   a good length of bare green forearm above the pale wrist wrap. Narrow the tunic
   coverage at the waist (`parts/clothing.js`, tunic `coverage()`), raise the sleeve
   coverage capsule end to ~y 1.20 so the cuff lands near y 1.10.
2. **Collar.** The undershirt currently reads as a floating rounded rectangle on the
   chest — the collar cut is a `roundBox`. Replace with a V/teardrop so it reads as a
   neckline.
3. **Strap and belt are too tubular.** Flatten both hard (the strap should lie on the
   chest, the belt should be a wide flat band, not a sausage).
4. **Skull plating still not dark enough** relative to the reference's near-black cap,
   and the maroon brow patch is too faint. Masks are correct — verify with
   `window.argonian.debugMasks(1)` before touching them; the issue is albedo/specular
   balance, not the mask.
5. **Tail** is too thick, too long and too bright; it dominates rear views.
6. **Full-body lighting** is too dim at the extremities — the key spot cone does not
   cover the legs well. Widen the cone or add a soft fill from below-front.
7. Head: snout still slightly bulbous; eyes could sit deeper under the brow.

## Iteration log (newest first — keep this short, prose only, no image dumps)

### Iteration 3
- Fixed **inverted ventral mask** (up-facing surfaces were painted with belly colour,
  giving pale patches on the muzzle top and lip).
- Reworked horns (slimmer, sharper, more back-sweep), broader crown spikes, extended
  and position-driven skull-plate mask, darker hide palette, matte plating.
- Dropped the visible tooth row (reference mouth is closed); kept two tusks.
- Added `debugMasks()` — masks read 0 far more often than they look like they do.

### Iteration 2 — the big one
- **Inverted triangle winding** in both marching cubes and swept tubes. Front faces
  were culled, so the renderer showed the inside of the far surface: everything looked
  translucent and clothes appeared to vanish into the shoulders. Fixed, and the capture
  tool now audits signed volume + outward-face fraction so it cannot regress.
- **Garments rebuilt as offsets of the baked body surface.** Authored from primitive
  radii they were buried inside the blend-inflated skin.
- `THREE.Skeleton` was constructed before `updateMatrixWorld`, double-applying the rest
  transform (character rendered ~2× scale, distorted).
- Descending `smoothstep` (undefined in GLSL) had flattened the whole palette to one tan.
- Swept parts had all-zero normals and rendered black.
- Re-proportioned: shoulders raised and widened, neck shortened, skull made taller and
  shorter (reference head is length:height:width ≈ 1.6:1:0.9, not a flat plank).

### Iteration 1
- Built the whole pipeline: SDF kit, marching cubes, rig, auto-skinning, procedural
  materials, viewer, build and capture tooling.
