# PROGRESS — read this first

**Live artifact (always republish to this same URL):**
https://claude.ai/code/artifact/14637ddd-070e-40ea-926e-df6f773c0d92

**Branch:** `claude/argonian-threejs-character-j1wpzp` · **Rule 0: commit + push after
every step.** · **Rule 1: the only exit is a critic PASS.**

An hourly watchdog Routine ("Argonian loop watchdog",
`trig_01LKYqwcGrZeTRZsj1g55xdg`) fires into the session to resume this loop if it is
cut off. Ignore it if mid-iteration. Delete it once the critic signs off.

---

## Where the loop is

**Critic round 3 returned FAIL.** Iterations 8 and 9 worked its list. **We are in the
INNER loop now** — iterate `npm run build && npm run capture && npm run compare` and
LOOK, until *nothing* looks wrong to you. Only then hand off for critic round 4.

**Read `CLAUDE.md` "The loop" first.** You hand off only when your own defect list is
EMPTY, not when you have run out of patience.

## State of the build

~634k tris, ~10 s build, ~3 min capture. `npm run capture` green (winding + framing
asserts). `npm run compare` is the most valuable diagnostic in the project — use it
every single iteration.

## My open list (must be empty before hand-off)

1. **Tunic has no seams or structure.** The reference shows a clear sleeve seam at the
   shoulder, a front opening, and cuffs. Ours is one smooth mass. A shoulder-yoke roll
   and cuff bands exist in `clothing.js` but barely read — strengthen them.
2. **Pale blotches on the tunic** — the macro dirt/wear term is producing irregular
   light patches that read as stains rather than wear. Reduce or tighten it.
3. **Throat cowl** was just added; verify it reads at normal distance and does not
   collide with the jaw.
4. Reference has a small **chest medallion/brooch** on the sash — not modelled.
5. Head: re-check horn length in profile after the last shortening.
6. Hands: fingers still fairly uniform; claws could seat 1-2 mm deeper.

## Reference numbers to converge (from critic round 3)

Normalised to muzzle-top so exposure cancels. **In the reference every head point
except the crown spike is DARKER than the muzzle top (0.14–0.86).** Render median was
+0.85 stop hot and 1.6× oversaturated; reference belt saturation is 0.07 (near-grey);
reference head hues run 41–71°. Iterations 8–9 addressed these — **re-measure, do not
assume.**

## Iteration log (newest first — keep this short, prose only, no image dumps)

### Iteration 9 — the floating sash, and cloth value
- **The sash was two stacked bugs.** It was authored in world space, so it drifted in
  and out of the coat and from the side detached and hung in mid-air. Projecting it
  onto the *body* was not enough either — the tunic's fold displacement puts the coat
  surface 28–60 mm out from the skin — so it now marches out to the **tunic field**
  itself and lifts by half its thickness.
- Separately, `sweep({frameFn})`'s radial basis was **not orthogonalised against the
  tangent**, which sheared the ring and rendered the ribbon as a fin standing edge-on
  to the chest. Fixed on both sash and belt. Worth remembering: a swept ribbon that
  looks like a blade is usually a frame bug, not a width problem.
- Cloth darkened and cooled substantially toward the reference's grey-brown; belt
  widened into a cloth wrap; throat cowl added.
- Added an hourly watchdog Routine so the loop resumes itself if the session is cut off.

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
