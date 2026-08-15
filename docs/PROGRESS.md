# PROGRESS — read this first

**Live artifact (always republish to this same URL):**
https://claude.ai/code/artifact/14637ddd-070e-40ea-926e-df6f773c0d92

**Branch:** `claude/argonian-threejs-character-j1wpzp` · **Rule 0: commit + push after
every step, the container restarts without warning.**

---

## Where the loop is

**Critic round 2 is in flight.** Round 1 returned FAIL with 14 defects; iterations 5
and 6 worked all 14. When round 2's report lands, work its list and hand back again.
**The only exit from this loop is VERDICT: PASS** (CLAUDE.md rule 1).

Note: the `argonian-critic` subagent type is registered at session start. If it is not
available in a fresh session, launch a `general-purpose` agent and tell it to read and
follow `.claude/agents/argonian-critic.md`.

**Do not edit `src/` while a critic agent is running** — it builds from source and a
half-applied edit will corrupt its render.

## State of the build

Working: geometry pipeline, rig, auto-skinning, garments, materials, capture harness,
winding audit. `npm run build && npm run capture` is green. ~545k tris, ~4.7 s build.

## Next actions

Work the round-2 report when it lands. My own standing observations from the
iteration-6 captures, for cross-reference:

- **Eyes still read as dark beads**, not the reference's bright amber focal point.
  The aperture and iris coverage are now correct; the problem is that the brow shadows
  them. Likely fix: raise the eye material's `emissiveIntensity` well above 0.42 so
  they self-illuminate in the dim key, and brighten the amber.
- The mouth line is too thick and too black — it reads as a drawn-on stripe.
- Nostrils sit on the side of the snout rather than the top of the tip.
- The near-black skull plate has receded again relative to the maroon brow band.
- The snout tip is squared off a little too abruptly.

### Round 1 defects (all worked in iterations 5–6)

1. **Defect 9 — hands.** Palm is a flat rectangular paddle with four straight parallel
   rods; fingers need per-finger length variation and real curl in the `curveRings`
   control points (`parts/features.js buildFingers`). The **detached floating thumb**
   the critic photographed is the thumb tip poking through the tunic skirt while the
   palm sits inside it — iteration 5 widened the arms, VERIFY it is actually gone
   before closing this. Wrist wraps (`cloth7`) are an open zero-thickness shell with a
   negative signed volume; give them real thickness.
2. **Defect 8 — clothing has no fabric.** Fold amplitudes are near the voxel size and
   get smoothed away: tunic `folds(0.0082)` against `cell: 0.0055`. Raise to
   ~`folds(0.020, 9)` and drop the tunic cell to ~0.004. Undershirt coverage box is
   too tall — halve its height so it only shows at the collar. Separate the values of
   tunic / trousers / belt, which currently merge into one brown mass. Add seams.
3. **Defect 12 — lighting.** Below the belt is crushed to black while the throat is
   the brightest thing on the model. Widen or re-place the key spot, lift
   `floorBounce`, raise `toneMappingExposure` ~0.95 → 1.15, and bring `rimWarm` round
   to ~45° off back-left and above head height so it catches the horns and shoulders.
4. **Defect 13/14 — tail, legs, feet** (plausibility only, not in the references).
   Tail needs an S-curve away from the body and a dorsal scute ridge. Legs need a knee
   break; shoes need a distinct sole; close the gap between trouser hem and shoe.
5. Re-check defect 5: the maroon brow now carries cream claw streaks — confirm they
   read at normal viewing distance and are not just noise.

## Iteration log (newest first — keep this short, prose only, no image dumps)

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
