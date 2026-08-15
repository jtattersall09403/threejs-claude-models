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

## The loop (this is the whole job)

```
 ┌─ inner loop ─────────────────────────────────────────────┐
 │ 1. plan   → docs/PROGRESS.md "Next actions"              │
 │ 2. code   → src/**                                        │
 │ 3. build  → npm run build      (dist/argonian.html)       │
 │ 4. capture→ npm run capture    (captures/latest/*.png)    │
 │ 5. LOOK at every capture. Compare to corpus/character/.   │
 │    Not perfect? → back to 1.                              │
 └──────────────────────────────────────────────────────────┘
              ↓ only when *you* think it is perfect
 6. Hand off to the harsh critic subagent (.claude/agents/argonian-critic.md).
    It sees ONLY the reference images + the artifact. It reports defects with
    evidence into critic/latest/.
 7. Critic not satisfied? → back to 1, factoring in its evidence.
    Repeat the meta-loop until the critic is completely satisfied.
```

**Never skip step 5.** Reading the capture PNGs with the Read tool *is* the
quality gate. Text-only reasoning about the model is not a substitute.

## Commands

| command | what it does |
|---|---|
| `npm run build` | bundles `src/` + three.js into the single-file `dist/argonian.html` |
| `npm run capture` | headless Chromium orbit + close-up capture → `captures/latest/` |
| `npm run shot -- <name> <az> <el> <dist> <targetY> <fov>` | one ad-hoc framing → `captures/adhoc/` |

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
critic/latest/        most recent critic report + evidence only
.claude/agents/       critic subagent definition
```

**Anti-bloat rules** (a future session must not have to wade through history):
- `captures/latest/` and `critic/latest/` are **overwritten** each run, never
  accumulated. Old imagery is deleted, not archived.
- Findings are summarised as *text* in `docs/PROGRESS.md`; that log is the memory.
- No dated/versioned copies of source files. Git history is the archive.
