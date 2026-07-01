# HANDOFF — idle run: Entity Typing (Phases F1–F5)

> **This is the `idle-work/2026-07-02` branch**, seeded 2 July 2026 (~01:40 CEST)
> on Siem's account for an unattended overnight coding run. Working agreements
> live in CLAUDE.md. **Full sprint board + per-phase specs: `docs/entity-typing-plan.md`.**
> Idle-session rituals: `/start-idle` (open) and `/push-idle-branche` (close).

## What this run is

An overnight, autonomous build of **entity typing** — the fix for the storyline
fragmentation Siem saw in the umbrella reader (under *Anthropic*: "Claude" /
"Claude Science" / "Claude Sonnet 5" splitting into separate storylines; *Fable*
vs *Claude Fable 5* doubling up). The root cause: entities are flat strings, so
threading can't tell an **actor** (Anthropic) from a **product** (Claude) from an
**event** (an IPO). We attach a **type** to every entity via a growing DB
**registry**, then apply the rule: **umbrellas = actors, storylines = the
products/events an actor is involved in.**

Five phases, each its own scheduled session:

- **F1** — `entities` registry table (migration) + seed + pure `modules/entities/` helpers. No behaviour change.
- **F2** — scan tags each entity with a type (registry-as-memory + write-back loop).
- **F3** — threading uses the type (actors anchor umbrellas, products/events become facets). **The visible reader fix.**
- **F4** — relationships (product→actor) + variant canonicalization (deep layer).
- **F5** — feed typed entities + relationships into Sol/redactie (actor-level cross-ref).

## Where the idle run starts

- **Branch:** `idle-work/2026-07-02`, forked from `main` at `f9f0504` (Phase E
  reader polish; gate was green there — lint / tsc / 220 tests / build).
- **First unchecked box:** **Phase F1**. Each session picks up at the first
  unchecked box on the sprint board in `docs/entity-typing-plan.md`.
- The plan doc is the source of truth; each phase's spec (goal · acceptance ·
  files · locked decisions) is also injected verbatim into that phase's scheduled
  session prompt, so a cold session can start writing code immediately.

## Backup checkpoint after F3 (Siem's call)

F3 completes the *shallow* fix — the natural review point. **At the start of
Phase F4, the session must first create and push `idle-work/2026-07-02-after-f3`
from the current HEAD** (snapshotting F1–F3), then write F4 code. This preserves a
clean shallow-fix state before the deep layer builds on it.

## Standing rules for every idle session (non-negotiable)

- **This branch only. NEVER push `main`.** Siem merges in the morning after review.
- **Migration files only — never apply them live.** Author the numbered SQL in
  `supabase/migrations/`; Siem applies it via the Supabase connector in the morning.
  No live DB calls, no live pipeline run, no paid AI calls at night.
- **"Done" = code written + gate green + migration authored**, not live-verified.
  The gate is `npm run lint && npx tsc --noEmit && npm test && npm run build`.
  Idle sessions verify via the gate only (no localhost, no secrets, no DB).
- **Architecture invariants hold** (CLAUDE.md): pure `modules/`; step-machine
  pipeline (idempotent, ~7s/step); every AI call via `askAI()`; typing
  **piggybacks the existing scan call** (no extra AI call); registry write-back is
  an idempotent upsert on `norm_key`. Budget ceiling unchanged (€0.15, aim €0.10).
- **Bug-backup rule:** before any risky rewrite, checkpoint so nothing green is lost.
- **If blocked:** stop, checkpoint, write an honest HANDOFF, and leave the board
  accurate. **Never fake a green gate.**
- Close every session with `/push-idle-branche` (rewrites this HANDOFF on the
  branch, ticks the board, runs the gate, commits + pushes to this branch only).

## Known gotchas (from the Phase E sessions)

- `.next/types/… 2.*` duplicate files break `tsc` with bogus "Duplicate
  identifier". Fix: `find .next -name "* 2.*" -delete` then re-run.
- CSS can fail to load after many HMR cycles → `rm -rf .next` and restart (only
  relevant if a session tries the dev server; the gate itself doesn't need it).
- Following is thread-level (`follow_marks`, `target_type`/`target_id`/`active`).
- AI provider = Grok (xAI) via `askAI()`; Anthropic switchable. All model IDs /
  prices live in `modules/shared/config.ts`.

## Morning review (Siem)

1. Read this file + `docs/entity-typing-plan.md` (board shows how far it got).
2. Apply any new `supabase/migrations/*.sql` via the Supabase connector.
3. Live-verify the reader fix (F3 payoff) on `localhost:3000` in a real desktop
   browser — the headless preview reports a 0-width viewport.
4. Decide on merging `idle-work/2026-07-02` → `main`. The
   `idle-work/2026-07-02-after-f3` branch is the shallow-only fallback.
