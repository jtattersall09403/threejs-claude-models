# CRITIC ROUND 5 — VERDICT: FAIL

Build judged: dist/argonian.html mtime 01:47. Capture green, no winding regression.
Evidence images alongside this file. Report relayed from the agent's return message
(the agent was blocked from writing to disk — see trap 7).

## Ranked defects

1. **Waist/hip garment shatters into pale hard-edged shards over ~120 deg of the orbit.**
   Belt / coat hem / sash break into flat straight-edged stair-stepped plates with
   striated interiors. Present az ~300, 330, 0, 20, 35, 60; absent az 130-180. Visible in
   the standard capture orbit frames at FULL-BODY distance. At az 300 the shard patch
   peaks L=129 against 69 on adjacent coat and 34 on skirt — 2.5-3.8x the surrounding
   cloth. Suspects: near-coincident garment surfaces where belt/coat-hem/sash coverage
   overlap (trap 13), or cloth detail-normal combing at grazing incidence (halved once,
   not solved).
2. **Eye 3.5x too big by area** (iris area / interoc^2: ref 0.021-0.022, render 0.077),
   iris width +45%. And it is a marble in a slot: bulges PROUD of the hide, no lid rim,
   pupil bar 12% of iris width vs the reference's 4%. Shrink aperture to ~0.54x linear,
   sink the ball, narrow the pupil, add a raised scaled lid ring.
3. **Front silhouette bottom-heavy and armless.** Shoulder 290 px, waist 301, hip 333 —
   the hip is the widest point, 15% wider than the shoulders; the reference's shoulder
   and belt are equal. Head/shoulder 0.39 vs reference 0.49 — the residual error is on
   the BODY side. The bent-arm pose also pins both upper arms inside the torso
   silhouette so no arm reads from the front.
4. **Muzzle 45% too long for the skull; skull 17% too flat.** snout-tip->eye / skull
   length: ref 0.250, render 0.362. muzzle:braincase ref 0.33, render 0.56. skull
   height/length ref 0.850, render 0.702. The documented longer-and-flatter drift, again.
5. **Oxblood brow absent, and the red is on the wrong surface.** Brow R/G vs its own
   muzzle: ref 1.66x, render 1.01x. The red field has slid forward onto the SNOUT DORSUM,
   which is the reddest part of our head and the least red part of the reference's.
6. **Crest pale and five identical cardboard plates.** horn/crest luminance ref 4.13,
   render 1.06. Needs to be ~0.4x the skull cap, with randomised length/width/yaw spread
   across the crown rather than evenly along one midline ridge.
7. **Horn is a spear.** length/skull ref 0.73-0.76 render 0.95; angle ref 25-31 deg
   render 20; base thickness ref 0.135 render 0.088. Metal band is correct — keep it.
8. **Jaw/cheek spikes are cones, not blades.** Placement good. Widen ~1.8x, shorten ~25%,
   give them a definite flat face.
9. **Hands read as a rake** — equal-length parallel cylinders, no taper, no knuckle break.
10. **Mouth line rises 6 deg where the annotated blue line rises 22 deg**, sits too high
    (jaw below as deep as muzzle above), and is a blurry band not a crisp crease.
11. **Tail reads as a third limb** — thin near-vertical rope overlapping the legs az 60-180.
12. **Muzzle scale texture too fine and uniform** where the reference cheek has a large
    crisp polygonal net; the fine pebble belongs only at the centre of the snout.

## Signed off — do not regress

Winding and translucency (all volumes positive, 94-100% outward agreement, no
see-through anywhere in the orbit). Lighting and mood. Lit skin HUE (43-52 deg, matches).
Skull-cap scale net. Nostrils. Horn metal band. Jaw-spike PLACEMENT. Throat scute
banding. Sash direction, braid, belt and knot, bare forearms with pale wrist wraps.
Eye slit legibility from the front. Boots, legs, feet.
