# PROGRESS — read this first

**Live artifact (always republish to this same URL):**
https://claude.ai/code/artifact/14637ddd-070e-40ea-926e-df6f773c0d92

**Branch:** `claude/argonian-threejs-character-j1wpzp` · **Rule 0: commit + push after
every step.** · **Rule 1: the only exit is a critic PASS.**

---

## Where the loop is

**Critic round 3 returned FAIL** (report text is in the git log / the round-3 agent
result; evidence PNGs are in `critic/latest/`). Iteration 8 worked most of its list.
Next: keep running the INNER loop (`npm run build && npm run capture && npm run compare`,
then LOOK) until you believe the bar is met, then hand off for critic round 4.

**Read `CLAUDE.md` "The loop" first — there are TWO loops and the critic is the audit,
not the feedback loop.** Several inner-loop iterations per critic round is correct.

## State of the build

~635k tris, ~11 s build, ~3 min capture. `npm run capture` is green (winding audit,
framing assert). `npm run compare` builds reference/render side-by-side sheets — this
is by far the most useful diagnostic in the project; use it every iteration.

## What round 3 measured (the numbers to converge)

Normalised to muzzle-top so exposure cancels. **Reference: every head point except the
crown spike is DARKER than the muzzle top (0.14–0.86).** Before iteration 8 ours were
mostly brighter (0.60–1.90) — the value hierarchy was inverted. Also: render median was
+0.85 stop hot and 1.6× oversaturated; reference belt saturation is 0.07 (near-grey),
ours was 0.71; reference head hues run 41–71°, ours never left 19–37°.

Iteration 8 addressed all of that. **Re-measure before assuming it converged.**

## Next actions

1. **Horns are still too long in profile** — the reference tip sits about over the
   occiput; ours projects well past it. Shorten again in `parts/features.js buildHorn()`.
2. **Clothing is still the weakest area** and round 3 barely moved it: no collar
   structure, no shoulder yoke seam, no front opening slot, no cuffs. See round 3
   defect 4 for the concrete plan.
3. **The sash floats off the body** — round 3 defect 5. It must be projected onto the
   built tunic surface with `raySurface`, not authored in world space.
4. Hands: fingers still too uniform; claws need seating 1–2 mm inside the fingertip.
5. Tail/feet/legs — plausibility only, lowest priority.

## Iteration log (newest first — keep this short, prose only, no image dumps)

### Iteration 8 — critic round 3 + a proper inner loop
- Added **`npm run compare`** (reference/render side-by-side sheets). Looking at these
  immediately exposed things single renders had hidden for several iterations: the head
  was a wide box where the reference is a narrow wedge, the muzzle was ~75% of head
  width instead of ~50%, and the hide was sandy gold instead of dark grey-olive.
- **Fixed the inverted value hierarchy.** Exposure down ~0.85 stop, rim cooled and
  halved (it was the source of the orange cast), cloth desaturated toward neutral,
  green kept in the hide, maroon brow cut from 3.5–5.5× too bright.
- **Cranial plate gaps made LIGHTER, not darker** — the reference has cream mortar
  lines between plates; a generic crevice darkening is exactly backwards there.
- Enlarged the glossy blue-black orbital/temple mass; domed the occiput (it was a flat
  vertical wall); tapered the snout in height as well as width; tapered the mouth
  crease to nothing at both ends instead of leaving hard rectangular corners.
- Crown and jaw spikes roughly doubled with the seating inset cut to 4 mm — blend
  inflation was swallowing half of them. Added the reference's forward-swept brow pair.
- **Overcorrected twice and caught it in the inner loop** (too dark, orbital mass too
  large and wet-looking, brow band vanished) — that is the loop working.

### Iteration 5 — critic round 1 fixes
- **Eye** rebuilt: the socket is now a LENS-shaped cut (narrow in y) so the skin above
  and below forms lids, with a smaller ball set deeper and the iris filling the
  aperture. The glassy emissive glow is gone.
- **Neck** shortened ~5 cm. `HEAD_XF` gained an `offset` translation so the head can
  move as a unit without invalidating every head-space constant in the shader.
- **Horn ring band now visible.** It was being drawn at `t=0.16`, but the horn root is
  seated ~0.024 m *below* the skull surface, so the first ~20% of the run is inside the
  head. Moved to `t=0.34`.
- **Muzzle and jaw rebuilt from `roundBox` blocks.** Capsules produced a drooping bulb;
  the reference snout is a box with a level top line and a deep straight jaw.
- Removed the dorsal neck spike row and the protruding tusks — neither appears in any
  reference crop.
- **Feature seating bug:** `raySurface` must run against the authoring-space head field
  *before* the head transform. Seating against the transformed field buried every crown
  spike inside the skull.
- Corrected `docs/REFERENCE.md`: the sash runs the character's right shoulder to left
  hip. The doc had it mirrored; the render was right.

### Iteration 4
- Clothing: garments given real geometric **folds** (noise displacement of the offset
  distance) — smooth shrink-wrap was the main reason cloth read as CG-clean plastic.
- Neckline reworked: a single tilted opening plus a rolled collar band. Two earlier
  attempts (a roundBox V, then an ellipsoid V) both read as a patch stuck on the chest.
- Straps and belts now use an **anchored frame** (`sweep({frameFn})`) so flat ribbons
  stay flat; parallel transport was twisting them into ropes.
- Head: horns closer together and sweeping back, muzzle tapered toward the nose, mouth
  crease now rises toward the jaw hinge (`creaseSlot`), tusks shrunk, skull plate mask
  driven by position rather than normal so it no longer fades on the flanks.
- **Triplanar swirl artefact** traced to scaling the triplanar UVs by a spatially
  varying frequency — that warps the domain and produces contour-line swirls. Fixed by
  blending two *fixed* frequencies with a noise mask instead.
- Capture framings re-tuned for the enlarged head, and `npm run capture` now fails if
  the full-body shots clip or under-fill the subject.

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
