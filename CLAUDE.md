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

The **only** end condition is: the harsh critic subagent returns **VERDICT: PASS**.

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
            ↓ ONLY once **you** believe the bar is met
 ┌─ OUTER LOOP ──────────────────────────────────────────────────────────┐
 │ 7. Hand off to the harsh critic subagent. It sees only the reference   │
 │    images and the artifact, and finds what you could not see yourself. │
 │ 8. Critic FAIL? → work its ranked list, then GO BACK TO THE INNER LOOP │
 │    and iterate on your own until you again think the bar is met.       │
 │    Only then hand off for the next critic round.                       │
 └───────────────────────────────────────────────────────────────────────┘
```

**The critic is not your feedback loop — it is your audit.** Handing off after a single
pass of fixes wastes a round: the critic burns ~25 minutes rendering and comes back with
things you would have caught yourself by looking. Its value is finding what you are
*blind* to, and you only get that value once you have already fixed everything you can
*see*. Expect several inner-loop iterations per critic round.

Concretely, before every hand-off:
- Run a full `npm run capture` and actually read the orbit frames, the head close-ups
  and the detail shots — not one hero angle.
- Run `npm run compare` and study the reference/render pairs side by side.
- Write down what still looks wrong. If the list is non-empty, you are not ready to
  hand off — go fix it.

**Never skip step 5.** Reading the capture PNGs with the Read tool *is* the
quality gate. Text-only reasoning about the model is not a substitute.

**Judge the framing before you judge the model.** A capture can lie: too close,
clipped, camera inside the mesh, subject a speck in the corner. Ask "did this shot
actually capture what I aimed at?" before drawing conclusions from it. `npm run
capture` prints `window.__frameStats()` coverage for the full-body shots and fails
if the subject is clipped or tiny — but ad-hoc `npm run shot` framings are
unchecked, so eyeball them. If a shot is badly framed, re-frame and re-shoot
rather than reasoning from a bad image.

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

## Commands

| command | what it does |
|---|---|
| `npm run build` | bundles `src/` + three.js into the single-file `dist/argonian.html` |
| `npm run capture` | headless Chromium orbit + close-up capture → `captures/latest/` |
| `npm run shot -- <name> <az> <el> <dist> <targetY> <fov>` | one ad-hoc framing → `captures/adhoc/` |
| `npm run compare` | reference/render side-by-side sheets → `captures/compare/` |

`npm run capture` fails loudly if the page logs a WebGL/JS error, so a green run
means the artifact really renders.

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
