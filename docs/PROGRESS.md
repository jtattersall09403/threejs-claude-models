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

**Critic round 3 returned FAIL.** **We are in the INNER loop** — iterate
`npm run build && npm run capture && npm run compare` and LOOK, until *nothing* looks
wrong to you. Only then hand off for critic round 4.

**Read `CLAUDE.md` "The loop" first.** You hand off only when your own defect list is
EMPTY, not when you have run out of patience.

## State of the build

~646k tris, ~13 s build, ~3 min capture. `npm run capture` green (winding + framing
asserts). `npm run compare` is the most valuable diagnostic in the project — use it
every single iteration.

## My open list (must be empty before hand-off)

Iterations 12–13 closed a great deal (see log). **Head value, hue and proportion are
now genuinely close to the reference** — that was the main win. Still open:

1. **The character goes nearly black at rear orbit angles.** The rim lights do little
   from behind and orbit frames 5–8 are barely readable. The viewer is orbitable, so
   every angle has to hold up.
2. **The collar is a smooth funnel** — the reference has a rolled edge with the head
   sitting down into it, and our neck still reads slightly long.
3. **The mouth line is a straight dark dash**; the reference curves up toward the jaw
   hinge and is broken by lip scutes.
4. **No dark spiky cheek frill** beside the eye — a distinctive reference marking.
5. **Crown spikes are a small tight mohawk**; the reference crest is larger and more
   scattered, with darker bases.
6. Legs and feet are still simple and the feet are plain blocks (plausibility only —
   the references never show below the waist, but the artifact is orbitable).
7. Hands: fingers still fairly uniform in length.
8. The tail is plausible but exits fairly horizontally and its tip kink reads oddly.

## Measuring rather than eyeballing

`npm run measure` samples matched points on a reference crop and the render,
normalises both to a `muzzle_top` anchor so exposure cancels, and prints ratios.
**It writes `captures/compare/_measure_points.png` — always look at that first.** Its
sample coordinates are currently mis-registered (they were authored against the wrong
reference screenshot), so its numbers are not trustworthy until they are re-placed
against the crops `tools/compare.mjs` uses.

## Iteration log (newest first — keep this short, prose only, no image dumps)

### Iteration 13 — the body, and two coordinate-space bugs
- **`EYE_FRAG` compared world-space `vRest` against authoring-space eye constants.**
  The head offset alone is 34 mm against an 18 mm eyeball, so the iris centre sat
  about two radii off the ball. `EYE_WORLD` had been exported for exactly this and
  never used. Every previous "the eye looks wrong, make it smaller/darker" tweak was
  compensating for that rather than fixing it. Fixed by undoing the head transform in
  the shader, as `SKIN_FRAG` already did.
- **The tail spine was duplicated** in `rig/skeleton.js` and `parts/anatomy.js` and
  had silently drifted apart — the bones said one thing, the geometry another, which
  would deform the tail wrongly the moment it is animated. Now exported from the rig
  and imported by the anatomy.
- **Head scaled to 1.16.** Measured against the full-body reference, head height over
  shoulder width was 0.38 where the reference is ~0.6.
- **The hide was too saturated**, at a green/red ratio of 1.29. Against the oxblood
  brow band that read as bright leaf green, and was the real cause of the
  "upper face brown, lower face green" split that several earlier iterations chased
  through the wrong masks. Desaturated and darkened the base palette.
- **Pale reticulation extended over the whole head.** The reference's signature is
  that the gaps between scales are LIGHTER than the scales; that treatment had only
  been applied to the cranial plates, leaving the muzzle as plain pebbled rubber.
- **The belt was buried inside the tunic** — the tunic's own surface reaches ~0.175 at
  the waist once offset and folds are added, and the belt sat at 0.186, so only a
  sliver of its top edge showed and read as a knife blade stuck through the coat.
- **Claws were placed off the UNCURLED fingertip** after the finger curl was
  increased, so they floated a couple of centimetres clear of the hand. Curled joint
  positions are now computed once and shared.
- Cloth thread thickness jittered in `makeClothTexture` — a strict over/under grid of
  identical threads was reading as machine-printed tweed, the most artificial thing in
  the render at garment scale.
- Also: rolled cowl at the nape (a full hood read as a backpack), flatter tapered
  sash, sloped shoulders, rust-red hands, steeper tail droop and horn sweep.

### Iteration 12 — the head silhouette, and the body I had been neglecting
- **The head was a rectangular box and I had not registered it**, having spent several
  iterations on paint. Measured off the reference: skull width is **0.69 of skull
  height**, and width at the mouth is **0.58 of width at the eyes**. Ours were 0.88
  and ~0.95. Narrowed the braincase/temples, deepened the jaw, tapered and swept back
  the cheek masses. This mattered far more than any amount of colour work.
- **`headMask` was computed from world `P.y`, not head-space `H.y`**, so it read ~0
  over the entire lower jaw: the jaw was being shaded as *body*, which is why it kept
  coming out as a pale smooth panel bolted under a detailed muzzle. Several previous
  attempts to fix "the pale jaw" by tuning the ventral mask were chasing the wrong
  cause. Added **debug mode 5** (head-space Y banded every 10 mm, red stripe at 1.60)
  — reading the coordinate straight off the surface settles this class of question in
  one look instead of one rebuild per hypothesis.
- **Horns rebuilt**: slender, longer, sharply tapered, sweeping clear of the skull,
  with a real **metal cuff** (own region, own metalness output). Crown spikes cut to a
  low crest; a proper **row of jaw spikes** angled laterally so they break the
  silhouette; **brow scutes** added.
- **The neck was nearly as wide as the skull and completely bare**, so head and neck
  fused into one column. Narrowed it and brought the undershirt cowl up to the jaw.
- **The sash and belt were rendering as torn slivers.** Cause was not the frame: the
  strap was projected from only **7 control points** and then interpolated, so it cut
  through the cloth folds in between and surfaced only in patches. Now every ring
  centre is projected, then lightly smoothed, with the lift clearing the fold depth.
- **Three separate garment-fold failures, in order:** ridged (zero-mean) fold noise
  drove the offset *negative* and the body erupted through the tunic in patches;
  making it non-negative kept the kink in the gradient, which the voxel bake turned
  into hard faceted plateaus reading as peeling paint; the fix was to keep the *bake*
  folds smooth and low, and shade the fine creases in `CLOTH_FRAG` instead, where no
  bake resolution is involved.
- **The sleeve coverage capsule was anchored out over the deltoid**, so its spherical
  end cap was the outermost coverage surface at the shoulder and printed straight
  through the smooth intersection as a leg-of-mutton puff sleeve. Coverage volumes
  must start *inboard*, inside the torso volume.
- Garment values separated deliberately (they had collapsed into one flat brown mass),
  tunic warmed to the reference's brown, **rust-red hands** added — one of the few
  strong hue breaks on the character and its absence flattened the whole figure.
- Head capture shots re-framed: at 0.92 m the horn tips fell outside the frame, so the
  one thing those shots exist to judge was being cropped away.

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
