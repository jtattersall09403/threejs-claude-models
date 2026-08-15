# PROGRESS — read this first

**Live artifact (always republish to this same URL):**
https://claude.ai/code/artifact/14637ddd-070e-40ea-926e-df6f773c0d92

**Branch:** `claude/argonian-threejs-character-j1wpzp` · **Rule 0: commit + push after
every step, the container restarts without warning.**

---

## Where the loop is

**Critic round 1 is in flight** (launched at the end of iteration 4). When its report
lands, read `critic/latest/REPORT.md`, work its ranked defect list top-down, then hand
back for critic round 2. Repeat until it returns PASS.

Note: the `argonian-critic` subagent type is only registered at session start. In a
session where it is not yet available, launch a `general-purpose` agent and tell it to
read and follow `.claude/agents/argonian-critic.md`.

## State of the build

Working: geometry pipeline, rig, auto-skinning, garments, materials, capture harness,
winding audit. `npm run build && npm run capture` is green. ~545k tris, ~4.7 s build.

## Next actions

**Wait for the critic report, then work its ranked list.** My own outstanding list,
for cross-reference:

- Muzzle still reads slightly bulbous/rounded at the tip vs the reference's squarer
  snout; the nasal ridge could be more pronounced.
- Neck is long and cylindrical; throat scutes are present but faint.
- Cloth folds exist but the tunic still lacks seams, and the shoulders have no seam
  definition.
- Hands are largely hidden behind the tunic skirt in front views.
- Feet read as blocks.

## Iteration log (newest first — keep this short, prose only, no image dumps)

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
