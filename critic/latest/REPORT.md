# VERDICT: FAIL

Judged against `corpus/character/*.jpg` (ArgMalr, Skyrim male Argonian in farm clothes).
Rendered from a fresh `npm run build && npm run capture`, plus targeted `npm run shot`
framings. All framings below were verified on-screen before being reasoned from; the
stock `head_side` capture at distance 0.96 clips the snout off-frame, so it was re-shot
at distance 1.30 (`render_head_side.png`).

The silhouette says "lizard person in a brown tunic". It does not say **this** lizard
person. The head — which is 90% of the likeness, because every reference crop is a
head-and-shoulders shot — fails on the eye, the neck, the horn sweep and the muzzle
profile simultaneously, and the body reads as untextured grey-box shapes under a
uniform milk-chocolate wash.

---

## Ranked defects

### 1. The eye is a lidless, glossy, bulging glass ball — the single worst likeness failure
**Evidence:** `render_eye_closeup.png`, `render_head_q34.png`

The eyeball is a near-perfect sphere sitting *proud* of the skull in a smooth crater,
with a hard specular hot-spot and an emissive glow. There is **no eyelid geometry at
all** — no upper lid overhang, no lower lid, no lid rim. Worse, the amber iris occupies
only about half the visible ball diameter, so a wide ring of dark brown "sclera"
surrounds it. It reads as a taxidermy glass eye or a cartoon dragon.

The reference (`..._081025_...`, `..._080957_...`) has an **almond/lens-shaped aperture**:
a heavy scaled upper lid overhangs and clips the top third of the eyeball, a defined
lower lid clips the bottom, and only a horizontal band of eye shows. The amber iris
**fills essentially the whole aperture** — almost no sclera. The socket is ringed by a
dark blue-black scaled band.

**Fix:** `src/parts/anatomy.js` `buildHeadField()` — the socket is a single subtracted
ellipsoid leaving an open crater. Add **lid geometry**: a flattened upper-lid ellipsoid
overhanging from above-front (centre ~`[s*0.058, 1.7085, 0.070]`, extents
~`[0.030, 0.010, 0.030]`) and a smaller lower lid at ~`[s*0.057, 1.6875, 0.070]`, both
at low `k` so they form a lens-shaped opening. Shrink `EYE.r` from `0.0208` to ~`0.0175`
and push `EYE.c[2]` back ~0.004 so the ball sits *inside* the skull. In
`src/materials/materials.js` `EYE_FRAG`, widen the iris to fill the aperture — the
`ss(0.42, 0.54, r)` iris edge should move out to roughly `ss(0.72, 0.86, r)`. In
`createMaterials()`, drop the eye's `emissive`/`emissiveIntensity` (`0x2a1403`/`0.55`)
to near zero and raise `roughness` from `0.12` to ~`0.28`.

### 2. The neck is roughly twice as long as the reference — the figure reads as a giraffe
**Evidence:** `render_head_q34.png`, `render_head_side.png`, `render_full_side.png`

Exposed neck runs from the tunic collar (~y=1.40) to the underside of the jaw (~y=1.60):
**0.20 m of bare neck at ~0.16 m diameter**, on a head only 0.21 m tall. The neck is
therefore as tall as the head and wider than the muzzle, and it is a near-parallel
column. In `render_full_side.png` the head visibly perches on a stalk.

In every reference crop the neck is **short and swallowed** — the occiput almost touches
the trapezius and only about a third of a head-height of throat shows above the collar.
It also **widens continuously into the shoulders** rather than running as a cylinder.

**Fix:** `src/parts/anatomy.js`. `buildBodyField()`: the neck capsule
`capsule([0, 1.39, -0.018], [0, 1.575, 0.012], 0.092, 0.08)` — drop the top end to
~`1.53` and grow the bottom radius to ~`0.105` for a trapezius flare. `buildHeadField()`:
the throat capsule `capsule([0, 1.43, -0.012], [0, 1.578, 0.012], 0.086, 0.074)` should
start at ~`1.47`. Then in `src/rig/skeleton.js` lower `head`/`headTop`/`neck` bone
heights by ~0.045 m so the skull drops onto the shoulders, and raise
`upperChest`/`clavicle` by ~0.015 m. Head size itself stays the same.

### 3. The horns sweep flat backwards and have no dark banded ring — the signature feature is missing
**Evidence:** `render_horn_closeup.png`, `render_head_side.png`, `render_head_rear34.png`

- **Angle.** The horn leaves the skull travelling backward at roughly **0–10° above
  horizontal**, lying against and overlapping the cranial dome for most of its run. The
  reference horn sweeps back **and up at ~30–45°**, standing clear of the skull so there
  is visible background between horn and cranium along its whole length, with a definite
  upward curve in the last third.
- **No ring band.** The horn is uniform pale cream from base to tip. The reference has a
  sharply defined **near-black/dark-brown band** about a quarter to a third of the way
  along, roughly a sixth of the horn's length wide — the most identifying single mark on
  the character, absent at every zoom level I shot.
- The horn is also perfectly smooth (no transverse growth ridging) and emerges from the
  dome with no raised bony boss.

**Fix:** `src/parts/features.js` `buildHorn()`: control points run
`[.., 1.7285, 0.006] → [.., 1.7815, -0.201]` — only +0.053 m rise over 0.207 m run.
Raise the tail of the curve so the last two points climb to ~`1.815` and ~`1.845` at
z ≈ `-0.15`/`-0.20`, and push mid-points up in `+y` for a convex upward arc. Increase the
`ridge` term (`0.062 * Math.sin(t*40)`) to ~`0.11` and lower frequency to ~`26`. For the
band: `src/materials/materials.js` `HORN_FRAG` (~line 230) computes
`ring = step(0.5, vRegion) * ss(0.075, 0.025, abs(t - 0.16))` mixing to `dark * 1.3` —
verify `vRun`/`uv.y` actually carries the 0..1 run out of `sweep()` and that `aRegion=1`
reaches the horn verts, because the band renders nowhere. Once it draws, widen it
(`ss(0.10, 0.055, ...)`) and darken the target to `dark * 0.5`.

### 4. The muzzle droops and the lower jaw is too shallow — the profile is canine, not crocodilian
**Evidence:** `render_head_side.png`, `render_head_top.png`

In profile the top line of the muzzle **slopes downward** from brow to nose and the tip
rolls under into a soft rounded blob. From above the muzzle is a **teardrop narrowing to
a rounded point**. The lower jaw is a shallow curve sweeping straight back into the
throat, so there is almost no jaw depth below the mouth line and the hinge is invisible.
Nostrils exist in the field but do not read at any zoom.

The reference muzzle is a **box**: top line essentially level from brow to nose, squared
tip, near-parallel sides in plan, and a **deep straight lower jaw** whose bottom edge
runs roughly parallel to the mouth line for the full muzzle length before turning up at a
clearly visible hinge.

**Fix:** `src/parts/anatomy.js` `buildHeadField()` muzzle block. Raise the muzzle capsule
end: `capsule([0, 1.6705, 0.058], [0, 1.6555, 0.1795], ...)` should end at y ≈ `1.668`,
and the tip capsule `[0, 1.6505, 0.2135]` at y ≈ `1.665`. Widen
`roundBox([0, 1.6755, 0.128], [0.041, 0.011, 0.056], 0.013)` to half-extents
~`[0.046, 0.014, 0.075]` with corner radius ~`0.008` to square the muzzle in plan. For
the jaw, `capsule([0, 1.6115, 0.052], [0, 1.6075, 0.1885], 0.0585, 0.0268, {scale:[1,0.68,1]})`
is too tapered and too flat — raise end radius to ~`0.040`, y-scale to ~`0.85`, and drop
the whole jaw ~0.008 m so it hangs below the crease. Deepen the nostril subtraction from
`[0.0055, 0.004, 0.007]` to ~`[0.009, 0.007, 0.011]`.

### 5. The dark skull plate and maroon brow patch are soft airbrushed washes, not armour
**Evidence:** `render_horn_closeup.png`, `render_head_top.png`, `render_head_front.png`

The skull cap is the **same fine hex-pebble texture as the rest of the head**, merely
darker, with a soft gradient boundary. The maroon patch is a barely-visible low-contrast
reddish wash that only appears at extreme zoom, with no defined shape.

The reference has (a) a **near-black armoured plate** of visibly *larger*, raised,
individually light-catching hexagonal plates with a hard boundary against the olive
temple, and (b) a bold **maroon/dark-red brow band** carrying **three cream/tan claw-mark
streaks** above the eye — a strong graphic shape, not a tint.

**Fix:** `src/materials/materials.js` `SKIN_FRAG`. The `cap` and `brow` masks exist
(confirm via `window.argonian.debugMasks(1)`) but contribute too little. (i) Tighten both
mask edges for hard boundaries. (ii) Raise the maroon weight and warm the target from
`vec3(0.086, 0.019, 0.015)` to ~`vec3(0.115, 0.026, 0.020)`. (iii) Add three streaks:
modulate the brow mask with `ss()` bands along head-space x, painted in the `bone` colour.
(iv) Drive `triDetail()` at a **coarser frequency inside the cap mask** — roughly a third
of the body frequency — so the crown gets big plates while the muzzle keeps fine pebbles.

### 6. Hide colour is too light, too saturated and has almost no value range
**Evidence:** `render_head_q34.png`, `render_head_front.png` vs any reference crop

The head reads as a single mid-value yellow-green across muzzle, cheek, jaw and neck,
with a milky plasticky quality. The reference is **much darker overall and much browner**:
cranium and temple fall to near-black, only the muzzle top and throat catch the key, and
the hue sits in grey-olive/brown, not yellow-green. The reference also has heavy
**mottling** — irregular darker olive-brown blotches — which the render has only as a
soft two-tone gradient.

**Fix:** `src/materials/materials.js` `SKIN_FRAG` palette (~lines 172-177). Pull green
down relative to red on `warmOl` (`vec3(0.072, 0.076, 0.028)` → ~`vec3(0.068, 0.062, 0.032)`)
and darken `belly` (`vec3(0.119, 0.118, 0.055)` → ~`vec3(0.088, 0.084, 0.048)`) — the
throat is currently the brightest thing on the character, which is backwards. Widen the
dorsal-to-ventral range so `dorsal2` really reaches near-black on the temples. Add a
second, larger-scale `fbm` mottling term (~1/4 the current `P * 44.0` frequency) at ~0.35
mix strength.

### 7. Scale texture is one uniform hex grid over the entire head at a single size
**Evidence:** `render_eye_closeup.png` (head), `render_hand_closeup.png` (hand)

The same fine isotropic hex-pebble runs unchanged across muzzle, cheek, brow, cranium and
neck — it reads as **fabric mesh or fishnet**, not scales. Meanwhile the *hand* uses a
completely different, far coarser cobblestone, so the two are visibly inconsistent. The
neck also has a **hard horizontal texture seam** — an ugly ring where the scute banding
switches on abruptly (`render_head_q34.png`, `render_head_side.png` at the collar line).

The reference has clear zonation: large plates on the cranium, medium hex on the muzzle
top, fine pebbles on the cheek, wide horizontal banded scutes on the throat, with smooth
transitions.

**Fix:** `src/materials/materials.js`, the `triDetail()` call in `SKIN_FRAG` — make detail
frequency a **function of the head masks** rather than a constant: coarse under `cap`,
medium on the muzzle, fine on the cheek. Then soften the scute-band edges: the `bandZone`
term `ventral * ss(1.50, 1.57, H.y) * ss(1.68, 1.61, H.y)` produces the hard ring — widen
to ~`ss(1.46, 1.60, H.y)` and fade band amplitude toward the boundary.

### 8. Clothing has no fabric: no folds, no seams, no wear, and no value separation
**Evidence:** `render_torso_front.png`, `render_belt_closeup.png`, `render_full_front.png`

- **The undershirt is a flat, hard-edged pale-grey slab** stuck on the chest with a
  rounded-rectangle bottom edge — it reads as a napkin taped on. The reference shows a
  modest grey-**green** V at the collar following the chest form.
- **The sash is a wide flat ribbon** with a knife-thin zero-thickness silhouette, a hard
  unhemmed cut end floating free of the body, and no braid. The reference sash is a
  narrow **braided cord** with visible plait.
- **The tunic is uniform milk-chocolate brown** — no folds, no seams, no stitching, no
  dirt. The reference tunic is desaturated grey-umber with heavy drape folds, worn
  patches and visible seams.
- **Tunic, trousers and belt are almost the same value** (`[0.070,0.049,0.033]`,
  `[0.055,0.045,0.034]`, `[0.042,0.028,0.018]`), so the lower body merges into one brown
  mass in `render_full_front.png`.
- **The belt knot is a smooth plastic toggle** with two straight rounded rods — no cloth
  bunching — and the belt band is indistinguishable from the tunic.

**Fix:** `src/parts/clothing.js` — fold amplitudes are below voxel resolution and are
being smoothed away: `folds(0.0082)` (tunic) and `folds(0.0035, 20)` (undershirt) are
8 mm and 3.5 mm against `cell: 0.0055`. Raise the tunic to ~`folds(0.020, 9)` and drop
its `cell` to ~`0.004`. Halve the height of the undershirt coverage
`roundBox([0, 1.252, 0.005], [0.30, 0.188, 0.28], 0.02)` so it only shows at the collar,
and blend its lower edge instead of ending in a hard rounded box. In `buildBelt()`,
replace the lozenge `knot` sweep and the two straight tails with a shorter knot plus
curved, tapered, flattened-profile tails. In `src/materials/materials.js`
`createMaterials()`: desaturate the tunic toward grey-umber (~`[0.062, 0.052, 0.042]`),
darken trousers to ~`[0.032, 0.028, 0.024]` for separation, and make the undershirt
grey-green and darker (~`[0.070, 0.074, 0.060]`). Add a low-frequency dirt/wear term to
`CLOTH_FRAG`.

### 9. The hands are rectangular paddles with parallel rods, and one thumb is detached and floating
**Evidence:** `render_hand_closeup.png`, `render_hand_floating_thumb.png`

The palm is a **flat rectangular slab with square corners** (the `roundBox` mitten,
half-extents `[0.014, 0.036, 0.036]`), and four **straight, parallel, equal-diameter
finger rods** hang off its bottom edge with hard rectangular gaps between them, meeting
the palm at a visible right-angle seam. No curl, no knuckle read, no length variation, no
taper. It reads as a garden fork.

Worse: `render_hand_floating_thumb.png` shows a **detached thumb — a green finger segment
with a claw hovering in mid-air**, clear of the body, with no hand attached. That is a
hard geometry bug, not a styling issue.

Also: the wrist wrap (`cloth7`, the mesh the audit reports at **negative volume
-0.00032**) is an open-ended, zero-thickness, untextured flat grey band with visible open
edges.

**Fix:** `src/parts/anatomy.js` — palm `roundBox([s*0.217, 0.822, 0.01], [0.014, 0.036,
0.036], 0.016)`: raise corner radius to ~`0.026`, taper so the pinky side is thinner, and
add a thenar/thumb-base ellipsoid. `src/rig/skeleton.js` — the thumb chain is
mispositioned; check `thumb1/2/3.L/.R` rest positions against the palm centre, they should
sit on the radial side of the palm roughly 0.02 m forward of it, not floating free.
`src/parts/features.js` `buildFingers()` — vary length per finger, add real curl to the
`curveRings` control points (currently a straight bone chain), and start the root further
inside the palm. `src/parts/clothing.js` `buildWristWraps()` uses
`sweep(..., {capStart:false, capEnd:false})`, giving an open shell — give it real
thickness (double-walled sweep or capped band) and a fabric texture.

### 10. Spikes: a dorsal neck row the reference does not have, and jaw spikes that are too large
**Evidence:** `render_head_side.png`, `render_head_rear34.png`

`buildJawSpikes()` adds a four-spike **dorsal neck ridge** at y = 1.60 → 1.47. The
reference has **no neck spikes at all** — the spike row stops at the jaw hinge. The
cheek/jaw-hinge spikes are also too large and too widely spaced: big prominent cones
roughly level with the mouth, whereas the reference's are small, tucked, and sit lower
along the jaw. The crown spikes are stuck-on cones with hard, unblended base
intersections — no basal flare where they meet the skull.

**Fix:** `src/parts/features.js` `buildJawSpikes()` — delete the `neck` dorsal-ridge array
entirely. Reduce cheek spike lengths from `0.038`/`0.031` to ~`0.026`/`0.021` and move
them down ~0.012 m in y. In `spike()` (`src/core/geom.js`) add a basal flare so the first
rings widen and the cone blends into the skin instead of popping out.

### 11. Two teeth protrude from a closed mouth
**Evidence:** `render_head_front.png`, `render_head_q34.png`

`buildTeeth()` places two lower tusks poking up outside the lip. In the render these read
as two small white buck-teeth on an otherwise closed, thin mouth line. **No teeth are
visible at all** in any reference crop — the jaw is closed and shows only a long mouth-line
crease.

**Fix:** `src/parts/features.js` `buildTeeth()` — remove the two tusks, or shrink them to
~`0.003` length and sink them so only a hairline shows. Instead deepen and lengthen the
mouth crease in `buildHeadField()` (`creaseSlot(...)`, currently width `0.0011`, depth
`0.083`) — the reference's defining mouth feature is the *crease*, not teeth.

### 12. Lighting: the lower two-thirds of the figure is crushed to black and there is no rim
**Evidence:** `render_full_front.png`, `render_full_side.png`

Below the belt the figure is essentially unreadable — trousers, shoes and tail all sit in
the same near-black. Meanwhile the throat is the brightest thing on the model. There is no
warm rim separating the silhouette from the background, so shoulders and head dissolve
into the backdrop. The reference is dim but **legible**: the tunic sits in a readable
mid-tone, a warm key from front-left models the form, and a warm rim separates the figure
from a near-black background.

**Fix:** `src/scene/viewer.js`. `key` is a `SpotLight` at intensity 36 with `angle: 0.8,
penumbra: 0.62` aimed at y=1.15 — its falloff starves the legs. Widen the cone or move the
key further out and raise intensity; alternatively lift `floorBounce` from `0.14` to
~`0.35`. Raise `toneMappingExposure` from `0.95` to ~`1.15`. The two rims (`rimWarm` 1.0,
`rimCool` 0.92) sit behind the figure but are too diffuse to read as edge light — bring
`rimWarm` round to ~45° off back-left and raise it above head height so it catches the
horns and the shoulder line.

### 13. Tail hangs limp and vertical with no dorsal detail *(plausibility only — not shown in the references)*
**Evidence:** `render_tail.png`, `render_full_side.png`

The tail leaves the hip and drops **straight down alongside the leg**, then droops forward,
ending in a point near knee height. No S-curve, no arc away from the body, and it visually
merges with the thigh from behind. It carries the same uniform pebble texture as the rest
of the body — no dorsal scutes, no ridge, no ventral banding, no thickness variation beyond
a linear taper. It also exits the tunic with no accommodation in the garment: the skirt
simply ends and the tail sits in front of it.

**Fix:** `src/parts/anatomy.js` `buildBodyField()` tail chain — control points run almost
straight down and back. Give them a real arc: keep the root at `[0, 0.968, -0.078]` but
push the mid-section further back (z ≈ `-0.34` at y ≈ `0.72`) and bring the tip back up and
out so the tail sweeps behind the figure rather than hanging. Add a dorsal scute ridge in
`SKIN_FRAG` keyed off the tail's rest-space z.

### 14. Legs and feet are featureless tubes and bricks, with a gap at the ankle *(plausibility only)*
**Evidence:** `render_feet.png`, `render_full_side.png`

The trouser legs are perfect tapered cylinders with no knee break and no calf. The shoes
are large rounded blocks with a flat top, no sole, no heel, no seam and no fastening. There
is a **visible gap between the trouser hem and the shoe** showing a ring of bare green
ankle, with the hem hovering above the shoe rather than resting on it.

**Fix:** `src/parts/anatomy.js` — the leg is `capsule + calf ellipsoid`; add a knee mass and
shift the calf ellipsoid rearward for a real profile. `src/parts/clothing.js` shoe block —
add a sole slab distinct in value from the upper, and extend the trouser cuff
`ellipsoid([s*0.1, 0.172, -0.012], [0.052, 0.014, 0.052])` downward ~0.02 m so it overlaps
the shoe and closes the gap.

---

## What is already right — do not regress it

- **Structure and pipeline.** The mesh audit passes on winding and solidity; 529k tris, no
  see-through surfaces, no page errors. The SDF + marching-cubes surface is clean — no
  ripple, no visible stair-stepping on the head.
- **Feature inventory is complete.** Every element the reference calls for exists in some
  form: big horn pair, crown spike fan, jaw/cheek spikes, amber vertical-slit iris, mouth
  crease, nostrils, throat scutes, ventral lightening, dorsal darkening, tunic, undershirt,
  diagonal sash, knotted cloth belt, mid-forearm sleeves with pale cuffs, bare clawed hands,
  trousers, shoes, tail. This is a re-tuning job, not a rebuild.
- **The sash runs the correct way** — character's right shoulder to left hip, matching
  `..._081046_...`. Note `docs/REFERENCE.md` states "left shoulder → right hip", which is the
  mirror of what the screenshots show; the *render* is correct and the doc is wrong. Do not
  "fix" the render to match the doc.
- **The iris hue and vertical slit are right** — amber/gold with a clean vertical pupil. The
  problem is the eyeball around it, not the iris itself.
- **The maroon brow and dark cap masks exist and are correctly placed** — they need contrast
  and hard edges, not repositioning.
- **Overall height and stance are plausible** (~1.79 m, feet on the ground, slightly hunched
  shoulders), and the head-length-to-braincase ratio in the field definition is close to the
  reference's ~1:1.
