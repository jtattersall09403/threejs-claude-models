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

**CRITIC ROUND 4 RETURNED FAIL.** Its ranked list has been worked once (iteration 16)
but is NOT closed — see below. Evidence images are in `critic/latest/`. The critic's
report could not be written to disk by the subagent, so the findings live in the
session transcript; the actionable residue is captured here.

### Critic round 4 list — status after iteration 16
| # | defect | status |
|---|---|---|
| 1 | hands read as a bundle of sticks; palm was 9.6 cm deep | Palm rebuilt as a flat wedge. **Applying the critic's "3-4x curl" literally made it far worse** — `FINGER_CURL` is already multiplied by `TIP_CURL` at the fingertip, so it compounded and swept the fingers forward into tentacles. Moderate curl + deeper knuckles + reduced splay reads correctly. |
| 2 | eye sits too high / muzzle too long, and the jaw NARROWS where the reference FLARES | jaw and muzzle blocks widened ~20 %, braincase raised — **not fully closed** |
| 3 | horns 55 % too long, 19 deg too steep, 30 % too slender | re-authored to ~27 deg, base 0.0212; over-shortened, then lengthened back toward 0.66x head length — **re-check** |
| 4 | oxblood brow field absent (hue contrast 3x under) | widened and strengthened, then **overshot to pink and dialled back** to R/G ~2.1 |
| 5 | scale grout polarity INVERTED — reference grout is bright, ours dark | cells enlarged and flattened, `mortar` strengthened to 0.62 and the head's crevice darkening damped to 0.92 so it stops fighting it — **still not as crisp as the reference net** |
| 6 | eye is a sphere loose in a hole; pupil does not read from the front | DONE. Gaze axis brought near-forward (0.16 -> 0.055 outward) so the slit reads in the front framing; iris extended to fill the aperture, no sclera. The fix that worked was **shrinking the APERTURE below the ball radius**, not shrinking the ball — the first attempt sank the ball and the eye vanished. |
| 7 | no bare reptilian throat — cowl runs to the chin | cowl dropped ~5 cm |
| 8 | garment values collapsed; sash and cuff DARKER than the coat, should be lightest | sash/wrap/undershirt/belt all lifted — **re-check polarity** |
| 9 | mouth line does not read | thickened and darkened — **re-check** |
| 10 | bare forearm too short | sleeve cuff raised to two-thirds up the forearm |
| 11 | tail hue cooler than the head | warmed toward the head |

**Do not regress what the critic explicitly signed off:** figure silhouette and scale,
sash direction and braid, belt and knot, lighting and mood (median head luminance 25.1
vs reference 24.1), zero winding/translucency/print-through artefacts across the orbit,
muzzle hue (G/R 0.85 vs 0.87), and all head features seated correctly.


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

Iterations 12–14 closed a great deal (see log). **The head is now genuinely close to
the reference** in proportion, value, hue and markings — that was the main win.
Closed since: rear-angle lighting, collar rim and height, lip scutes and the mouth
through-cut, cheek frill, crown crest size, snout length, jawline/neck separation,
brow spines, eye angle, orange eye rim, dark ocular mask. Still open:

1. **The shadowed neck recess under the jaw is still shallower than the reference's.**
   The collar now sits clear of the jaw and the shadow is painted, but the reference
   has a deeper, darker undercut between jawline and clavicle.
2. **The horns are smooth pale spars.** The reference horn has visible surface
   texture and grime along its length, not just at the root.
3. **The muzzle's reticulation is fainter than the reference's**, whose pale mesh
   between scales is crisp and continuous over the whole snout.
4. Legs still read as a fairly featureless column from the front — no knee or calf
   break (plausibility only; the references never show below the waist).
5. Hands: fingers still fairly uniform in length.
6. The tail is plausible but exits fairly horizontally and its tip kink reads oddly.
7. The tunic weave is much improved but still slightly regular at close range.

Boots were closed in iteration 15: darker leather, welt and toe-cap seams, and a sole
that is **wider than the upper** — at its old width it sat inside the shoe's own
offset surface and contributed nothing, which is the same burial failure as the belt
and is worth checking first whenever an added detail "does not appear".

## Direct feedback from the user (iteration 19) — WORK THESE, they are not yet done

The user added **five named reference images** to `corpus/character/` for exactly these
(see the corpus table in `CLAUDE.md`). All of this is OPEN:

1. **Jawline and its spikes** — number, size and positioning are all wrong. The profile
   reference shows a few LARGE, flat, blade-like spikes swept back, not a row of small
   cones.
2. **Forehead-to-muzzle angle.** The reference is a *smooth reptilian read*: one
   unbroken curve from crown over brow down to the snout tip. Ours is a **dog muzzle**
   — a box bolted onto a braincase with a visible brow step. This is probably the
   single biggest remaining likeness error and it is structural, not paint.
3. **Head proportions, especially the VERTICAL THICKNESS of the snout/muzzle.** The
   reference snout is shallow in section; ours is a deep box.
4. **Cheekbone definition.**
5. **The neck.**
6. **Naturalness of stance overall** — may have to be inferred rather than read off the
   references.
7. **Shoulder proportions.**

## Direct feedback from the user on the head (iteration 13) — keep checking these

These came from the user looking at the live artifact, and they were all correct:

- **The big expanse of scales below the mouth is NOT all jaw and snout.** The
  reference has a strong jawline, spiked, with a *shadowed neck and clavicle area
  underneath it*. Ours ran the jaw straight into the throat as one continuous
  surface. Partly fixed (throat dropped clear, jaw shadow painted, spike row
  enlarged) but the shadowed recess is still weaker than the reference's.
- **Cheekbones** — added a ridge from under the eye back to the hinge; could go
  further.
- **Eyebrow spines** — these are spines, not small scutes. Lengthened.
- **The angle of the eyes and brow.** The reference eye slants down toward the snout
  and that angle carries the whole expression. Fixed by building the upper lid from
  two lobes, outer high and inner low.
- **An orange rim around the eyes** — a warm ring of scales right at the opening.
  Added; note it must be TIGHT (the aperture is only ~24 mm across) or it floods the
  cheek.
- **The mouth was solid at the front but sliced clean through at the sides.** Real
  bug: `creaseSlot` was a band in y inside a hard limit in x, i.e. a through-cut. Out
  at the corners of the mouth, where the surface turns to face sideways, it sawed a
  slit through the jaw instead of grazing a groove. Now tapers closed in x as well as
  z, and its x-extent follows the muzzle's own half-width.

## Measuring rather than eyeballing

`npm run measure` samples matched points on a reference crop and the render,
normalises both to a `muzzle_top` anchor so exposure cancels, and prints ratios.
**It writes `captures/compare/_measure_points.png` — always look at that first.** Its
sample coordinates are currently mis-registered (they were authored against the wrong
reference screenshot), so its numbers are not trustworthy until they are re-placed
against the crops `tools/compare.mjs` uses.

## Careful with critic numbers

Round 4's list was measured and mostly right, but two of its prescriptions had to be
applied with judgement rather than literally:

- **"raise `FINGER_CURL` 3-4x"** — that constant is already multiplied by `TIP_CURL`
  at the tip, so 3-4x compounded into a ~17 cm forward sweep on an 11 cm finger. The
  hands came out visibly worse than the defect being fixed.
- **"raise `maroon` red to ~0.055"** — as a pure red that flooded the crown pink. The
  critic's own measurement (reference brow R/G 1.74) was the better target; the fix
  was a partial mix over the olive, not a more saturated paint.

Read a prescription against the surrounding code before applying it, and re-capture
immediately — both of these were obvious in one frame.

## Iteration log (newest first — keep this short, prose only, no image dumps)

### Iteration 14 — the user's head notes, and a through-cut mouth
- **`creaseSlot` was a through-cut, not a groove.** A band in y inside a hard limit in
  x: out at the corners of the mouth, where the surface turns to face sideways, it
  sawed a slit clean through the jaw — solid at the front, sliced open at the sides.
  It now tapers closed in x as well as z, and its x-extent follows the muzzle's own
  half-width. Worth remembering for any future crease cut.
- **`jawShadow` was multiplied by `headMask`**, which fades out across exactly the
  band the shadow was meant to darken — it cancelled itself. Same class of mistake as
  the world-vs-head-space `headMask` bug in iteration 13: a mask gated by another
  mask that is zero where it matters.
- **The collar was swallowing the jaw.** After the head was scaled to 1.16 the jaw
  dropped ~2 cm while the collar stayed put, so the cowl rim sat *above* the jaw
  bottom and there was nowhere for a neck shadow to exist. Dropped ~5 cm.
- Head proportion rebalanced: eye-to-jaw over eye-to-crown was 2.7 against the
  reference's 2.1, so the lower face read as one long expanse. Jaw and braincase both
  raised. Snout shortened ~11 % and deepened — it was running long and low in profile.
- Also: crown crest enlarged, brow scutes lengthened into spines, upper lid built from
  two lobes (outer high, inner low) so the eye slants toward the snout, tight orange
  eye rim, dark ocular mask extended back toward the hinge.

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
