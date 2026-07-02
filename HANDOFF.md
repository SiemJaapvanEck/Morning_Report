# HANDOFF — Krant A3 "Dagblad + Verhaallijn" (idle run)

> **Branch:** `idle-work/2026-07-02-krant-a3` — **IDLE WORK ONLY. NEVER PUSH MAIN.**
> **Started:** 2 July 2026, Siem (setup on `main`, run executes locally overnight).
> **Full plan + per-phase specs:** `docs/krant-a3-plan.md` (source of truth).

## What this run is

Redesign the full krant reading page — `app/components/EditieWeergave.tsx` — to the
**A3 "Dagblad + Verhaallijn"** design, **keeping every current feature** and folding
it into A3's visual language. Design source is a standalone HTML mockup Siem
provided (`~/Downloads/Morning Report A3 (standalone).html`; its internal `<title>`
still says "Richting A2" — that's a stale label, the file is A3).

A3's signature: every deep story is shown **as an ongoing storyline over time** —
a **Verhaallijn timeline** (deel 1..N → vandaag → Vooruitblik forecast) plus an
**impact map "WAAR HET SPEELT"** in an aside, on top of a proper daily-paper shell
(masthead + weather bar + a topzone with Sol's synthesis and Markten/Regio data
tiles). All of it is backed by **data that already exists** — see the data map in
the plan doc. This is enrichment + restyle, not a rewrite of the pipeline.

## Three phases — one per scheduled session

- [ ] **Phase 1 — A3 shell + topzone + card restyle** (frontend only, no backend)
- [ ] **Phase 2 — Verhaallijn timeline** (pure builder + query extension + card)
- [ ] **Phase 3 — Impact map "WAAR HET SPEELT"** (pure geo helper + query + card)

Each phase's **full self-contained spec** (goal · acceptance criteria · files ·
locked decisions) is in `docs/krant-a3-plan.md` and is injected into that phase's
scheduled prompt. Read the plan doc first.

## Locked decisions (agreed with Siem, 2 Jul 2026)

- **Full A3, 3 phases.** A3 **replaces** the current sectioned-paper layout.
- **Timeline = honest deel-nodes** — real editions the storyline appeared in; **no
  fake UPDATE/ANALYSE tags**, no AI node-typing.
- **Impact map = reuse `WereldKaart` + geo-chips** (place-typed entities from the
  F1–F5 registry + item `regio`).
- **Ignore** the mockup's Tweaks/Kleurschema panel (design-tool artifact; the app
  themes via `ThemaKiezer`). **Edition "nr."** derived from `edition.date`.
- **Keep every feature:** ItemRating, follows-first ordering, ripples, Vooruitblik +
  certainty chip, source + match%, image-or-hatch, empty-list grace, Dutch copy,
  light+dark.

## Standing autonomy rules (every session)

- **Idle branch only — never push `main`.** Close each session with
  `/push-idle-branche` (pushes to this branch only).
- **Migration files only — never apply live.** Author numbered SQL under
  `supabase/migrations/`; Siem applies in the morning. (Phases 1–3 expect **no**
  migration.)
- **Idle "done" = code written + gate green + migration files authored** — NOT
  live-verified (no localhost/DB/paid pipeline at night):
  `npm run lint && npx tsc --noEmit && npm test && npm run build`.
- Budget under the edition ceiling; bug-backup before risky edits; if blocked,
  checkpoint + honest HANDOFF — **never fake green**.
- Architecture rules still bind: pure `modules/`, step-machine pipeline, every AI
  call via `askAI()` (none needed here), types in sync.

## Gotchas carried over

- `.next/types/… 2.*` duplicate files break `tsc` with bogus "Duplicate
  identifier". Fix: `find .next -name "* 2.*" -delete`, then re-run.
- Data lives in `front_page` (`dp_summary`, `dp_sections`, `markten.indices`,
  `regios`) and `EditionView.sections[].items[]`. Storyline history is
  reconstructable from `thread_items` → `editions.date` (no migration).
- Place typing already shipped (F1–F5); `entities` table is live. `WereldKaart` /
  `MarktenKaart` / `wereldGrid.ts` + `modules/shared/regios.ts` are the map assets.

## For Siem in the morning

Apply any authored migrations (expected: none), `npm run dev`, Jesse profile →
"Lees de krant", verify A3 renders with the timeline + impact map and that every
old feature still works, then decide on merging this branch → `main` (see
`/merge-idle-to-main`).
