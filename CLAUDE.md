# threejs-claude-models — Argonian character

Build a full-body, animation-ready **Argonian (Skyrim)** character in Three.js, delivered
as a single self-contained HTML Artifact the user can orbit around. Match the reference
screenshots in `corpus/character/` on **graphics quality and visual likeness**.

> **If you have just been given "continue" with no memory: read
> `docs/PROGRESS.md` first — it says exactly what state the loop is in and what to do
> next. Then `docs/REFERENCE.md` (what we're matching) and `docs/ARCHITECTURE.md`
> (how the code works).**

---

## RULE 0 — COMMIT OFTEN. THE CONTAINER RESTARTS WITHOUT WARNING.

This environment can be reclaimed at any moment and **anything uncommitted is lost**.

- Commit after **every** meaningful step: a working build, a capture run, a critic
  report, a doc update. Never batch up an hour of work.
- Push to `origin claude/argonian-threejs-character-j1wpzp` after each commit
  (`git push -u origin claude/argonian-threejs-character-j1wpzp`, retry on network
  failure with 2s/4s/8s/16s backoff).
- Before starting any long operation, commit what you already have.
- Subagents must follow this rule too — it is repeated in `.claude/agents/*.md`.
- `docs/PROGRESS.md` must be updated *and committed* at the end of every loop
  iteration, so a fresh session can resume with zero context.

---

## RULE 1 — DO NOT STOP LOOPING UNTIL THE CRITIC PASSES.

The **only** end condition is: the critic subagent returns **VERDICT: PASS**.
That bar is real but reachable — the critic is asked to sign off when it genuinely
cannot find a way the build falls short of the references, not to object forever.

- A critic FAIL is not a stopping point. It is the input to the next iteration.
  Work its ranked defect list, re-render, re-hand-off, repeat.
- Running out of things *you* can see is not a stopping point either — hand off to the
  critic and let it find more.
- Do not stop to ask whether to continue, do not stop to summarise progress, and do not
  treat "I've done a lot this session" as done. Keep the loop turning.
- Only surface to the user when the critic passes, or when you are genuinely blocked on
  something only they can decide.

---

## The loop (this is the whole job)

There are TWO loops. The inner one is yours and you do most of your work there. The
outer one brings in a fresh pair of eyes. **Do not collapse them into one.**

```
 ┌─ INNER LOOP — this is where you spend most of your time ──────────────┐
 │ 1. plan    → what specifically is off, and what will you change?      │
 │ 2. code    → src/**                                                    │
 │ 3. build   → npm run build                                             │
 │ 4. capture → npm run capture   (multi-angle: orbit + head + detail)    │
 │ 5. LOOK at the captures, SIDE BY SIDE against corpus/character/.       │
 │    npm run compare  builds the comparison sheets for you.              │
 │ 6. Not yet at the bar? → back to 1. Loop again. And again.             │
 └───────────────────────────────────────────────────────────────────────┘
            ↓ ONLY once **you** believe NOTHING is left wrong
 ┌─ OUTER LOOP ──────────────────────────────────────────────────────────┐
 │ 7. Hand off to the critic. Fresh eyes, no attachment: it decides for   │
 │    itself what to check and whether this is production-ready.          │
 │ 8. Critic FAIL? → work its ranked list, then GO BACK TO THE INNER LOOP │
 │    and iterate on your own until nothing looks wrong to you again.     │
 │    Only then hand off for the next critic round.                       │
 └───────────────────────────────────────────────────────────────────────┘
```

**The critic is not your feedback loop — it is a fresh pair of eyes.** You hand off
**only when you believe there is nothing left wrong**. Not "nothing left that I have
time for", not "nothing left on the critic's last list" — nothing you can find, having
genuinely looked. That is the whole point of the split: the critic's value is finding
what you are *blind* to, and you only get that value once you have already fixed
everything you can *see*. Expect many inner-loop iterations per critic round.

Concretely, before every hand-off:
- Run a full `npm run capture` and actually read the orbit frames, the head close-ups
  and the detail shots — not one hero angle.
- Run `npm run compare` and study the reference/render pairs side by side.
- List everything that still looks wrong to you. **If that list is not empty, do not
  hand off — go fix it, and look again.** You hand off when the list comes back empty.

Then the critic looks at it cold: not checking whether you did what you intended, but
asking whether the thing in front of it is production-ready against the references, and
thinking for itself about what to examine.

**Never skip step 5.** Reading the capture PNGs with the Read tool *is* the
quality gate. Text-only reasoning about the model is not a substitute.

**Judge the framing before you judge the model.** A capture can lie: too close,
clipped, camera inside the mesh, subject a speck in the corner. Ask "did this shot
actually capture what I aimed at?" before drawing conclusions from it. `npm run
capture` prints `window.__frameStats()` coverage for the full-body shots and fails
if the subject is clipped or tiny — but ad-hoc `npm run shot` framings are
unchecked, so eyeball them. If a shot is badly framed, re-frame and re-shoot
rather than reasoning from a bad image.

## The reference corpus

`corpus/character/` (INPUT, never edit). The five **named** images were added later and
are far more informative than the original timestamped screenshots — prefer them.

| file | what it is best for |
|---|---|
| `face-left-profile.jpg` | **The most important one.** The forehead-to-snout line, snout depth, horn sweep, jaw spike row, neck. |
| `face-neck-jawline-closeup.jpg` | Jawline, spike count/size/placement, neck and clavicle. |
| `face-neck-jawline-right-profile.jpg` | Same from the other side — check bilateral consistency. |
| `close-crop-face-front-slight-right-profile.jpg` | Facial markings, eye and brow detail at close range. |
| `face-front-and-bust-proportions.jpg` | Head-to-shoulder proportion, shoulder width and slope, stance. |
| `Screenshot_*.jpg` (5) | The originals. Wider context, full body, garments. |

### What the profile reference settles

- **The forehead flows into the snout as ONE SMOOTH CURVE** — crown, brow and snout
  form a single unbroken arc. There is no step, no shelf, no separate muzzle block.
  Building the muzzle as a box bolted onto a braincase produces a *dog* muzzle, which
  is the single most persistent likeness error in this project.
- **The snout is SHALLOW in vertical section** and tapers to a narrow tip. A deep
  box-section snout is wrong even when its length and width are right.
- **The jaw spikes are large, flat and blade-like**, swept back, and there are only a
  few of them — not a row of small cones.
- The neck is substantial and visible, running down into the collar.

## Known traps (each of these cost a full iteration — do not re-learn them)

1. **Triangle winding.** Marching cubes and swept tubes must emit CCW-from-outside
   triangles. Inverted winding culls front faces and you see the *inside* of the far
   surface — it reads as an eerie translucency (you can "see through" clothes to the
   shoulder), NOT as an obvious error. `npm run capture` audits signed volume and
   outward-face agreement and fails the run if it regresses.
2. **Garments must be offsets of the baked body surface** (`offsetSurface` + `isect`
   with a coverage volume), never authored from primitive radii. Smooth-min blending
   inflates the body several cm past its primitives and swallows anything else.
   Coverage volumes bound the garment's *extent* only — make them generously wider
   than the body, or the intersection lands inside the skin.
3. **`THREE.Skeleton` snapshots `bone.matrixWorld`** at construction. Call
   `root.updateMatrixWorld(true)` first or every vertex gets its rest transform
   applied twice (character renders ~2x scale and distorted).
4. **GLSL `smoothstep` is undefined when `edge0 >= edge1`.** Use the `ss()` helper in
   materials.js for descending ranges; raw descending smoothstep returns garbage and
   flattens the whole palette to one colour.
5. **Custom uniforms need GLSL declarations.** `onBeforeCompile` supplies values only;
   `declare()` in materials.js emits the `uniform` lines.
6. **Horns/spikes must be seated with `raySurface`**, not placed at authored
   coordinates — the blend-inflated skull swallows them otherwise. Seat against the
   *authoring-space* head field, BEFORE `transformHeadField()` — seating against the
   transformed field buries every spike inside the skull.
7. **A critic report on disk may be stale.** `critic/latest/REPORT.md` is restored by
   `git pull` and a new round may not have overwritten it yet. Check its mtime against
   the build it claims to judge, and prefer the agent's *returned message* — a report
   citing values you have already changed is last round's. Do not act on it.
8. **Anything painted in the shader that traces a geometric feature must share ONE
   constant with the geometry** (see `LIP` in parts/anatomy.js). The mouth line was cut
   from one curve and painted from another with a different intercept and slope; the
   dark line drifted off the groove and smeared onto the cheek.
9. **Do not rebuild `dist/` while a critic agent is running** — it captures once and
   then takes ad-hoc shots against `dist/`, so a rebuild desyncs its evidence. Editing
   `src/` is safe; running `npm run build` is not.
10. **Profile modulation on swept parts aliases.** A `sin(a*n + t*m)` braid with `m`
    large relative to the ring count turns a strap into a jagged rope. Keep the
    per-ring phase step well under a radian and prefer more lobes around (`a*3`+) over
    a fast twist.
11. **Head masks must use head space `H`, never world `P`.** `headMask` was driven
    from `P.y` and so read ~0 across the whole lower jaw, which was then shaded as
    *body*. Three separate attempts to fix "the pale jaw" by tuning the ventral mask
    were chasing the wrong cause. **`debugMasks(5)` paints head-space Y in 10 mm bands
    with a red stripe at 1.60** — reach for it first, it settles where a threshold
    actually lands in one look rather than one rebuild per hypothesis.
12. **Garment fold noise must be non-negative AND smooth.** It displaces the garment's
    *offset from the skin*, so a zero-mean version goes negative in the valleys and
    the body erupts through the cloth. And a ridged (folded-absolute) version has a
    kink in its gradient that the voxel bake cannot represent — marching cubes turns
    it into hard faceted plateaus that read as peeling paint. Keep baked folds smooth
    and low-amplitude; shade fine creases in `CLOTH_FRAG`, where no bake resolution is
    involved.
13. **Coverage volumes print through at their end caps.** The garment is a *smooth
    intersection* with the coverage volume, so wherever the coverage surface is the
    outermost one it becomes the garment's shape. A sleeve capsule anchored out over
    the deltoid made its spherical cap the outermost surface at the shoulder and
    rendered a leg-of-mutton puff sleeve. Start coverage capsules **inboard**, inside
    the neighbouring volume.
14. **Project straps per-ring, not per-control-point.** Projecting 7 control points
    onto the cloth and then interpolating draws a smooth curve between distant
    anchors, which cuts straight through the folds in between: the strap surfaces only
    in patches and reads as torn geometry. Project every ring centre, smooth the
    resulting polyline lightly, and make the lift exceed the fold depth.
15. **A crease cut is not a slab of empty space.** `creaseSlot` was a band in `y`
    inside a hard limit in `x` — a *through-cut*. Where the surface turns to face
    sideways (the corners of the mouth) it stops grazing the surface and saws a slit
    clean through: solid at the front, sliced open at the sides. Any cut meant to be
    a groove must taper closed on **every** axis it is bounded on.
16. **Don't gate a mask by another mask that is zero where it matters.** `jawShadow`
    was multiplied by `headMask`, which fades across exactly the band the shadow was
    meant to darken, so it cancelled itself. Same family as trap 11. When a painted
    effect "does nothing", check what it is being multiplied by before re-tuning it.
17. **Changing `HEAD_XF.scale` moves everything the head sits against.** Scaling the
    head to 1.16 dropped the jaw ~2 cm while the collar stayed put, so the cowl rim
    ended up *above* the jaw and swallowed it. After any head resize, re-check the
    collar height, the capture framings, and anything seated by world coordinate.

18. **Backticks inside a GLSL template literal terminate the JS string.** A comment
    reading ``in ss(a, b, d), `b` is the solid radius`` inside a `/* glsl */\`...\``
    block ends the literal and esbuild reports a syntax error somewhere else entirely.
19. **`npm run build` failing is easy to miss** — the shell pipeline's exit status
    comes from `tail`, not from node, so `npm run build | tail -2` reports success
    while `dist/` keeps the previous build. If a change appears to have no effect,
    `grep` the new value in `dist/argonian.html` before re-tuning anything.
20. **In `ss(a, b, x)` with `a > b` (the descending form), `b` is the SOLID radius**
    and `a` is where it fades to zero. Setting `b` very small leaves a sub-pixel core
    and the feature disappears even though the mask is present and correctly placed.

## Commands

| command | what it does |
|---|---|
| `npm run build` | bundles `src/` + three.js into the single-file `dist/argonian.html` |
| `npm run capture` | headless Chromium orbit + close-up capture → `captures/latest/` |
| `npm run shot -- <name> <az> <el> <dist> <targetY> <fov>` | one ad-hoc framing → `captures/adhoc/` |
| `npm run compare` | reference/render side-by-side sheets → `captures/compare/` |

`npm run capture` fails loudly if the page logs a WebGL/JS error, so a green run
means the artifact really renders.

## If you get cut off

An hourly watchdog Routine (`trig_01LKYqwcGrZeTRZsj1g55xdg`, "Argonian loop watchdog")
fires into this session and tells you to resume. If you are mid-iteration, ignore it.
If you have lost context, bootstrap from `CLAUDE.md` → `docs/PROGRESS.md` →
`docs/REFERENCE.md` and pick the loop back up. Delete the Routine once the critic
passes and the work is signed off.

## Publishing the artifact

`dist/argonian.html` is the deliverable. Publish with the Artifact tool
(`file_path: dist/argonian.html`). **Always pass the same `url`** so it updates in
place instead of creating a new link — the live URL is recorded at the top of
`docs/PROGRESS.md`. Favicon stays `🦎`.

## Repo layout — keep it this way

```
corpus/character/     reference screenshots (INPUT, never edit)
docs/                 REFERENCE.md · ARCHITECTURE.md · PROGRESS.md
src/                  the model (see docs/ARCHITECTURE.md)
tools/                build.mjs · capture.mjs
dist/argonian.html    the built artifact (committed)
captures/latest/      most recent capture run only
captures/compare/     reference-vs-render sheets (regenerated, never accumulated)
critic/latest/        most recent critic report + evidence only
.claude/agents/       critic subagent definition
```

**Anti-bloat rules** (a future session must not have to wade through history):
- `captures/latest/` and `critic/latest/` are **overwritten** each run, never
  accumulated. Old imagery is deleted, not archived.
- Findings are summarised as *text* in `docs/PROGRESS.md`; that log is the memory.
- No dated/versioned copies of source files. Git history is the archive.
