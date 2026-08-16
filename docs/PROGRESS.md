# PROGRESS — read this first

**Live artifact (always republish to this same URL):**
https://claude.ai/code/artifact/14637ddd-070e-40ea-926e-df6f773c0d92

**Branch:** `claude/argonian-threejs-character-j1wpzp` · **Rule 0: commit + push after
every step.** · **Rule 1: the only exit is a critic PASS.**

Four session-bound watchdog Routines ("Argonian loop watchdog :05/:20/:35/:50") fire
into this session on a 15-minute cadence to resume the loop if it is cut off. Ignore
them if mid-iteration. Delete all four once the critic signs off. The fresh-session
failsafe Routine was deleted at the user's request — do not recreate it.

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

## Direct feedback from the user (iteration 19) — status after iteration 21

1. **Jawline and its spikes** — PARTLY DONE. `spike()` gained an `opts.flat` option so
   they are BLADES not cones (a circular section reads as a whisker), reduced from a
   row of 4 small cones to 3 large plates, and moved UP onto the cheek plane at mouth
   height — seated on the lower jaw edge they sat behind the collar and never read.
   **Still off: they are too long and lie too flat along the cheek; the reference's
   flare out and back more, and sit slightly further forward.**
2. **Forehead-to-muzzle angle** — DONE. The snout is now one continuous tapering form
   flowing out of the braincase (see iteration 20 below), and the brow shelf was
   lowered so it rides the curve instead of stepping above it.
3. **Snout vertical thickness** — DONE. Sections are shallow and the tops descend on a
   smooth curve; nose blunted rather than pointed.
4. **Cheekbone definition** — a ridge exists from under the eye to the hinge; NOT yet
   strong enough.
5. **The neck** — PARTLY DONE. `face-neck-jawline-closeup.jpg` shows it is one of the
   largest features on the character: a long column of LOOSE SKIN in vertical folds,
   distinctly LIGHTER than the head, widening into the shoulders. Ours was a short
   dark tube. Collar dropped further, and `SKIN_FRAG` now lightens the neck zone and
   paints ridged vertical folds. **Still off: the jaw-to-neck junction is a hard
   horizontal line rather than a shadowed undercut, and the folds read as a smooth
   pale tube rather than loose skin.**
6. **Naturalness of stance** — OPEN, not started.
7. **Shoulder proportions** — OPEN, not started.

### (original wording of the request, for reference)

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

## Iteration 20 — the snout is no longer a dog muzzle

`buildHeadField` now builds the snout as **one continuous tapering form flowing out of
the braincase** (a chain of ellipsoids whose tops descend on a smooth curve and whose
bottoms sit on the `LIP` line), replacing the stack of `roundBox` blocks. The blocks
were originally chosen to avoid a "drooping bulb", but they are precisely what produced
the dog-muzzle read the user flagged. The section is also much SHALLOWER now, per the
profile reference. Brow shelf lowered so it rides the curve instead of stepping above it.

**Still to do on the user's iteration-19 list:** jawline spike count/size/placement
(reference has a few LARGE flat blade-like spikes, ours is a row of small cones),
cheekbone definition, the neck, stance naturalness, shoulder proportions.

**Tooling FIXED:** `tools/compare.mjs` now uses **all five named references,
uncropped** — they are already cropped to their subject, so `crop` is omitted and they
render whole. The bug was that the zoom factor was hard-coded to `2172` (the original
screenshots' width), which scaled an 827px named reference to 263% and framed the wall
behind the character. It now reads the real JPEG width, so nothing is hard-coded to one
source again. Sheets: `head_front`, `head_q34`, `head_side` (PROFILE), `head_jawline`,
`bust`, plus `body` from the original screenshot for full-length garment context.

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

### Iteration 28 — working critic round 5's ranked list

Report and evidence in `critic/latest/`. Status:

| # | defect | status |
|---|---|---|
| 1 | waist/hip shatters into pale shards over ~120 deg of orbit | **DONE** — it was the TROUSERS printing through the coat skirt. The widened stance put the thigh's outer surface at x ~0.175 against a skirt only 0.155 wide there. Found in ONE shot with the new `window.argonian.regionDebug(true)`, which flat-colours every garment by region; the same artefact had previously been misattributed to fold noise, sash/belt projection, shadow bias and winding in turn. Verified clean at az 300 and az 60. |
| 2 | eye 3.5x too big, marble in a slot | **DONE** — aperture cut to an almond (was nearly round), ball 0.0180 -> 0.0152, pupil slit 0.150 -> 0.055 of iris width. |
| 3 | bottom-heavy and armless front silhouette | **DONE, both halves.** Arms hang at the sides (which also cleared the hand/wrap pile-up feeding defect 1); then hip bone, pelvis and glutes narrowed so the shoulders are the widest point again. The critic warned these were coupled and that widening the skirt for defect 1 pushed the wrong way — it did, and the fix had to come from the legs. |
| 4 | muzzle 45% too long, skull 17% too flat | **DONE** — muzzle shortened, cranial dome raised, all crown-seated features and the horn re-seated on it, collar raised 18 mm to follow the lower jaw (trap 17). Then the lower face was WIDENED again: narrowing the jaw for the from-below view had left the front a narrow tower under a broad skull. |
| 7 | horn is a spear | **DONE** — re-authored to ~0.75 skull length at ~29 deg, base 50% thicker. |
| 10 | mouth rises 6 deg, should be 22 | **DONE** — LIP.slope 0.176 -> 0.330, sitting lower on the muzzle. |
| 5 | oxblood brow absent, red on the snout dorsum | open |
| 6 | crest pale; five identical plates | open |
| 8 | jaw/cheek spikes are cones not blades | open |
| 9 | hands read as a rake | open |
| 11 | tail reads as a third limb | open |
| 12 | muzzle scale texture too fine and uniform | open |

**Do not regress what the critic signed off:** winding/translucency, lighting and mood,
lit skin hue (43-52 deg, measured as matching), skull-cap scale net, nostrils, horn metal
band, jaw-spike placement, throat scute banding, sash direction/braid/belt/knot, bare
forearms with wrist wraps, eye slit legibility, boots and feet.


### Iteration 27 — an inside-out winding bug that had been there all along

`emit()` in core/geom.js orders its triangles assuming **u x v points ALONG the
tangent**. Both frame helpers in clothing.js supplied the opposite handedness —
`bandFrame` computes `u = tan x v`, which gives `u x v = -tan`, and the belt's explicit
frame did the same. So the sash and the belt were **inside-out meshes**. The capture
audit had been printing their NEGATIVE signed volume every single run and it was read as
"open tube, volume is meaningless" rather than as the bug it was.

Single-sided, their culled back faces left hard-edged holes across the hip and around
the hands — the "torn geometry" that cost several iterations chasing the fold noise, the
projection code, the shadow bias and the bake resolution in turn. `emit()` now enforces
canonical handedness itself, so no sweep can get this wrong again.

Two related fixes fell out of it:
- `alignRot` inverts its result when the two normals are near-opposite. On the (now
  double-sided) garments three.js flips `normal` for back faces, so every back-facing
  fragment hit that degenerate branch and had its detail normal inverted. The rest
  normal is now flipped to match `gl_FrontFacing`.
- Cloth detail normal strength halved. At grazing incidence a strong tangent-space
  perturbation flips adjacent facets between lit and unlit and combs the silhouette into
  hard strips. Some of this remains at extreme close range on the silhouette only;
  normal viewing angles are clean.

Garment values were also re-judged from the REAR of the orbit, where the two rim lights
hit squarely — the belt, wrist wraps and sash were blowing out to white back there while
looking correct from the front.

**HANDING OFF TO THE CRITIC** — the builder's own list is empty.


### Iteration 26 — garments, after the head

With the head signed off by eye from every angle, the same treatment on the garments:
- Coat, trousers and undershirt darkened toward the reference's near-charcoal; ours was
  reading as pale canvas.
- Cloth macro blotching made gentler and finer — at 40% on a low-frequency fbm the
  garments carried soft blobs that read as stains, and on the trousers they swamped the
  leg's form entirely.
- The sash is a braided CORD again, not a belt-width flat band.
- Sleeve coverage narrowed so the shoulder stops reading as padded.
- **Two capture framings were lying.** The `body` compare sheet put a waist-up reference
  next to a full-figure render — the two sides were at completely different scales and
  the sheet answered nothing. The `tail` shot was aimed at y 0.78 from 1.75 m and had no
  tail in it at all. Both fixed; judge the framing before judging the model.

### Iteration 25 — head pass, all angles

Continued from the height-channel fix. Every change below was made by looking at the
render beside the reference, per the user's instruction, and checked on the OTHER angles
before being kept — several were corrected in the opposite direction after a second view
showed the first had gone too far (the jaw widened from the front, narrowed again from
below; the throat narrowed from below, thickened again at three-quarter).

- Scale profile is a SMOOTHSTEP dome, not a power curve. The power curve gave each scale
  a flat top with a hard rim — a field of faceted pyramids across the back of the skull.
  The texture's normal strength was also retuned (4.6 → 2.1), since the old value was set
  when the height channel was saturated and its gradients lived in a one-texel groove.
- Crest raised into a proper fan of dark oxblood blades. It had been rendering salmon
  pink from above and reading as plastic fins.
- Brow field confined so it stops turning the top of the muzzle mauve.
- Eye socket darkened into a real mask — what makes the eye look set INTO the head.
- Muzzle lengthened ~10%, mouth/nostrils/jaw following, so the snout-to-skull proportion
  matches the profile. Snout z-radius tapers to a rounded point.
- Horn cuff narrowed to a band; two brow spines a side instead of three.

The head now reads as the same creature as the reference from front, three-quarter,
profile, jawline, rear three-quarter and top.

### Iteration 24 — THE HIDE'S HEIGHT CHANNEL WAS DEAD, and the head after fixing it

The single most important finding in the project so far. `debugMasks(8)` (added this
iteration, paints the scale-texture height `h`) showed **h saturated at 1.0 across the
entire head**. `makeScaleTexture` computed `edge = min(1, (f2-f1)*cells*3)` then
`pow(edge, 0.22)` — the edge term saturates about 3% into a cell and the power curve
pinned it there, so after `*1.02` and the clamp the height was 1 everywhere with a
groove one or two texels wide.

Everything that gives the hide its value structure keys off h: the bright reticulated
net, the crevice darkening, the plate-size blend, the roughness breakup. All of them
were inert. That is why the face rendered as a smooth flat mass with relief but no
pattern, and why a dozen attempts to fix it by tuning the terms that READ h had no
visible effect. Fixed by making the dome use its range (`*cells*1.15`, `pow(...,0.62)`,
`0.04 + dome*0.90`).

Then, with the hide finally responding, the head from every angle:
- Head scales sized to actually read (freq 25 → 15 on the head); at 4 mm plates the
  grooves were sub-pixel on the muzzle so the net showed only on the cranium.
- Face WIDENED — skull, temples, cheekbones, jaw hinges and eye spacing. The reference
  face is a broad shield; ours was a narrow tower. Then the jaw hinge and masseter were
  narrowed again, because from BELOW the widening made the jaw as broad as the skull.
- Throat narrowed below the jaw so a jawline exists from underneath, then thickened and
  the collar raised, because at three-quarter the head ended up perched on a stalk.
- Snout z-radius tapers; the tip is a rounded point, not a blunt bulb.
- Horn cuff is a band, not a sleeve. Crest blades widened to serrate the silhouette.
- **The mouth finally reads.** `debugMasks(6)` showed the mask correct and full-length
  all along — it was dark-on-dark with nothing to contrast against. Adding a LIT UPPER
  LIP just above the dark line is what made it legible.

Also fixed, before the head work: the torn-geometry artefact across the hip and hands
was BACK-FACE CULLING of thin sheets in the garment bakes — not fold noise, not the
sash/belt projection, not shadow bias, all of which were investigated first. Located by
ablation plus a double-sided test. Garments are double-sided now; the audit still
requires skin/horn/eye to be single-sided so trap 1 stays visible.

**Standing user instructions recorded in CLAUDE.md:** judge visually rather than from
tool measurements, and finish the head before anything else.

**Still open on the head:** the muzzle is shorter and the skull taller than the
reference's; the cheek spikes are cones where the reference's are flat plates; the neck
is still slightly long.


### Iteration 23b — where the head stands, and what is NOT working

Architecture from the blueprint is now largely in: compact skull, short muzzle, convex
profile with no notch, brow overhanging but CLEARING the eye aperture, steep rear skull,
two horns a side, four backward jawline blades, taller crest.

**What is still clearly short of the reference, in priority order:**
1. **The head reads as one flat dark olive mass.** The reference has strong internal
   value structure: near-black crown plates, dark-red brow shields, a bright pale
   reticulated net over the whole face, and a paler jaw. Ours has the pieces but they
   are all too weak to read at head-shot distance.
2. **The maroon brow shields do not appear at all.** `debugMasks(1)` (green = brow) is
   the tool — it showed the mask had drifted onto the crown, and that `cap` was
   evaluating to 1 over the ENTIRE cranium and painting near-black over everything
   applied after it. `cap` has been narrowed and the brow mask lowered; the brow still
   does not read, so something else is suppressing it. Check what `brow` is multiplied
   by before re-tuning its colour (trap 16).
3. **The pale reticulation is present but sub-pixel at head-shot distance** — verified
   in `dist/` that the constants are live (trap 19 check), and the net is visible in a
   close ad-hoc shot. It needs to be COARSER, not stronger.
4. The front horn barely reads in profile; the crest is too dark to see from the side.
5. The muzzle front/chin is still a smooth pale-green area with weak scale relief.

**Two shader changes in a row produced no visible change.** When that happens: grep
`dist/argonian.html` for the new constant first (trap 19), then check what the mask is
multiplied by (trap 16), then use `debugMasks` rather than tuning further.

### Iteration 23 — the user annotated the profile, and I had the head architecture wrong

**Read `corpus/character/face-left-profile~2.jpg` and the blueprint section in
CLAUDE.md before touching the head.** The user drew the head's architecture straight
onto the profile: red skull, blue mouth, pink horns and spikes, yellow neck, white
shoulders. It corrected three things I had been getting steadily wrong.

**First, I broke the head and had to revert.** Over iterations 20-22 the head got a
longer snout, a shorter braincase, a deeper jaw, a wider muzzle, bigger crest blades,
bigger cheek spikes and re-aimed horns — each argued from a real measurement against a
real reference, and the aggregate was a bulbous smooth manatee snout inside a fringe of
needles. The user had to point at it. Recovery was `git show 9d39008:src/parts/*.js`,
splice the head field back, and re-apply only the independently verified wins (eye
size, the lateral mask gate, the olive hide, the collar drop, the ear plate). Traps 25
and 26 record this.

**Then, from the blueprint:**
- The skull is a compact wedge, roughly as tall as it is long (~1.15). Ours was ~1.4:
  a long low lozenge. Braincase raised and shortened, snout cut 20%.
- The profile's top line is ONE CONVEX ARC. Ours had a notch at the bridge between the
  brow and the nose — the dorsal ridge now starts up on the brow bar and fills it.
- The brow OVERHANGS the eye. It used to sit tucked behind the muzzle.
- The rear of the skull drops steeply; back of head and back of neck on one vertical.
- The pale spikes are FEW, LARGE and point BACKWARD along the jawline — two big rear
  blades about as long as the second horn, one mid, one small at the chin. Every
  previous arrangement (swept off the cheek, hanging as tusks, standing out sideways)
  put them where the reference does not have them.
- There are TWO horns a side: the long banded one sweeping back at ~30 deg, and a
  shorter one ahead of it standing nearly vertical. `buildFrontHorns` is new.

**Still open on the head:** the front horn barely reads at profile distance; the crest
is too dark to see from the side; the eye should be a brighter amber slash in a dark
socket; the reference's pale reticulated net is still stronger than ours; the throat is
paler and smoother than the reference's scute ladder.


### Iteration 22 — THE STANCE, and the body I had still been neglecting

The character had never been *posed*. It was rendered in its raw rest pose: perfectly
symmetric, arms dead vertical, feet parallel and touching. No amount of anatomy fixes
that — it reads as a shop mannequin. `src/rig/pose.js` now applies a relaxed
asymmetric contrapposto idle as bone rotations, AFTER `mesh.bind()` (so the bind
inverses are already snapshotted and the stance is a pure deformation, not something
baked in twice). It re-plants the feet afterwards by measuring the lower ankle's world
y — rotating the pelvis otherwise floats or sinks the figure against the shadow plane.

Everything else this iteration came out of actually looking at the full-body and
profile captures, which had been getting far less attention than the head:

- **Legs were one column.** Thighs at ±0.078 overlapped through the centreline and the
  trouser offset bridged what gap was left. Stance widened to ±0.090 hip / ±0.104
  ankle, thigh narrowed in x and deepened in z (`scale: [0.88, 1, 1.04]`).
- **No shoulder.** The top line sloped continuously from neck to elbow. Arm chain moved
  11 mm outboard and the deltoid flattened (`[0.072, 0.052, 0.070]`) — a near-spherical
  deltoid puts a hemisphere on top of the sleeve and the coat renders a puff.
- **Slab torso in profile.** Ribcage z-radius 0.111 → 0.122 plus a pectoral shelf.
- **The tail was a rudder**, reaching 0.50 m back while only dropping to y 0.305.
  Re-authored to turn down hard in the first two segments and finish near the ankles.
- **The skirt hem was a flat disc**: the skirt capsule bulged to y 0.639 but the bake
  box was floored at 0.72, so marching cubes sealed it with a plate. Box lowered, and
  the hem is now a deliberate flat cut with the ring of hem ellipsoids rolling over it.
  The skirt also reaches mid-thigh now, so the figure has a waist instead of a pear.
- **Clog feet.** 12 cm across, 22.6 cm long → 10 cm × 24.4 cm, narrower sole.
- **The sash and belt were projected onto the wrong surface** — the cut-free *offset
  shell*, which is the coat only over the ribcage. At the waist the coat is the SKIRT,
  a centimetre proud of the shell, so both surfaced only where a fold poked through and
  read as torn slivers and a blade through the cloth. `shell` now carries every
  additive part of the coat (see trap 21).
- **No neck.** After the head grew to scale 1.16 the cowl top (y 1.532) sat ABOVE the
  jaw (1.523). Collar and coat neckline dropped ~4.6 cm; a throat column now shows.
- **The crown crest is dark oxblood, not bone** — confirmed across the profile, the
  close crop AND the bust before acting on it this time. New horn region 4.
- Nine spikes a side round the skull became five: three big swept-back cheek blades
  plus the brow spines. At the old count and size it read as a picket fence.
- Round tympanic ear plate added (a clear landmark in the profile reference).

`npm run silhouette` is new: it separates the render from its background and prints
figure width in metres at a ladder of heights. Head width measured 0.180 m against a
0.531 m shoulder span — the head-is-too-small worry was wrong, the missing neck was
the real cause of that read.

**Still open on the head after this iteration** (profile comparison): the horn is too
thick and sweeps too far back; the reference's forward-angled pale brow spikes barely
read on ours; the crown crest is now too dark to see; the muzzle top line still dips at
the brow where the reference is a straight ramp; the lower jaw is too shallow; the hide
still reads grey-brown where the reference is olive-green.


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
