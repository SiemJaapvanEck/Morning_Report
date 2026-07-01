# HANDOFF — current state

> Last updated: 1 July 2026, on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.
> Sprint board + full Phase D/E plan: `docs/threads-plan.md`.

## Where we stand

The **storyline hierarchy** (Phase D) now generates. A flat entity thread became a
**big thread (umbrella)** branching into **storylines** (child threads) in D1/D2;
this session shipped **Phase D3 — thread-aware generation per storyline**. Each
storyline advances its own accumulated `state` each edition, with the update
**framed to its facet**, bounded by a per-edition budget cap. Gate is green (lint /
tsc / **208 tests** / build). Migration `0016` is **applied live**. Verified
end-to-end on today's editions.

Pipeline shape unchanged (scan → select → **threads** → agenda → generate →
daily_paper → finalize). The next visible step is **Phase E** (the umbrella
multi-line timeline UI), still un-built — it consumes D3's `aggregateUmbrellaState`.

## What was done this session — Phase D3

**The problem D3 solved:** generation still ran in the flat-thread world. Two
breakages under multi-link: (a) `nextThreadUpdateJob` collapsed the many-to-many
links (`Map(item→thread)`), so an item in two storylines only advanced one; (b)
idempotency was the per-item `summary_text` flag, so once a shared item's body was
written, every other storyline sharing it looked "done" and never advanced.

**Decisions (Siem, 1 Jul 2026):** **capped per-storyline** (facet framing, bounded
per edition, followed-first) + **first/primary storyline wins** for a shared item's
single card body (all storylines still advance their own state).

- **Migration `0016_thread_state_edition.sql`** — `threads.state_edition_id` (uuid,
  nullable): the per-thread generation idempotency guard the per-item flag can no
  longer provide. Applied live via the Supabase connector. `Thread` type synced.
- **`nextThreadUpdateJob` (`modules/threads`)** reworked: many-to-many/storyline
  aware — groups this edition's links per thread, advances each thread once via the
  guard, carries `facet`/`umbrellaTitle` for framing, and **primary-wins dedupe**
  (a job's `deepEditionItemIds` = only its still-blank deep items; shared items
  already written by an earlier storyline stay in `newItems` so state still
  advances). Signature now `(editionId, profileId, cap)`.
- **Priority + cap** — pure `selectNextThreadJob(candidates, {cap, advancedCount})`:
  **activity-based** (followed-first → new-item count → stable id), bounded by
  `config.generate.maxThreadUpdates` (env `GENERATE_MAX_THREAD_UPDATES`, default 8).
- **`generateThreadUpdate` (`modules/generate`)** — optional `storyline`
  context + pure `storylineFraming` helper: one Dutch prompt line naming the facet
  within its umbrella ("names each storyline"). Additive; flat threads unchanged.
- **`applyThreadUpdate`** gained an `editionId` param; sets `state_edition_id`.
- **`fillBlankThreadDeepItems`** — no-AI overflow fallback (raw_summary, else title)
  for deep cards no storyline claimed / past the cap / in a degraded budget. In
  `generateStep` it runs **outside** the `allowDeep` gate (so `minimaal`/`stop`
  editions never leave a blank thread card).
- **`aggregateUmbrellaState`** — pure compute-on-read rollup (umbrella "Algemeen"
  state + each child's state) for the Phase E hero. Does NOT overwrite umbrella state.
- Tests 197 → **208** (`selectNextThreadJob`, `aggregateUmbrellaState`,
  `storylineFraming`).

### Verification (live, today's editions)
- **Two bugs caught + fixed during verification:** (1) the follow lookup used
  `type` instead of `target_type`/`active` — `generate` failed every attempt on the
  first run; (2) the overflow fill was gated behind `allowDeep`, leaving blank cards
  in a degraded budget — moved outside the gate.
- **Priority correction:** the plan's original "umbrellas/parent-null before
  storylines" ordering let **seven one-item flat threads eat the whole 8-slot cap →
  zero storylines advanced**. Switched to activity-based (the storylines were the
  *busiest* threads). Re-verified: **all 3 storyline candidates advanced first**,
  same cost. `selectNextThreadJob` is type-neutral now — do NOT reintroduce a
  type-based tiebreak.
- **Result:** storylines advance their own `state` in one edition; 0 blank deep
  cards even in `minimaal` mode; clean-run cost ≈ **€0.10** (scan €0.043 + 8 deep
  updates €0.034 + daily_paper €0.013), under the €0.15 hard cap.

## What's open — the road ahead (order)

1. **Phase E1 → E2** — the umbrella UI: big multi-line timeline (one line per
   storyline, color = DESTEP lens, live lines thicker/pulsing, dashed "Algemeen"),
   left legend with a follow-bell per storyline, two follow tiers. Hero consumes
   **`aggregateUmbrellaState`** (D3 shipped it). `/archive/[threadId]` branches
   umbrella-vs-leaf; `/archive` lists umbrellas. Full spec: `docs/threads-plan.md`
   "Phase E"; approved mockup `umbrella_thread_multiline_bell_follow_mockup`.
2. **Entity typing (later)** — tag entities actor/product/event in the scan so
   umbrellas = actors and storylines = product/event facets; the clean fix for the
   storyline rough edges below. Its own phase.
3. Daily-paper krant redesign — **still parked** (Siem's call).

## Known issues / things to keep in mind

- **Storyline coverage depends on `select` giving storyline items DEEP band.** On
  1 Jul only **2 deep items** landed on storylines vs 7 on flat threads, so few
  storylines could advance regardless of priority. Making storylines more visible is
  partly an upstream `select`-band tuning concern, not D3.
- **Cap default 8 ≈ what €0.10–0.15 affords** (~€0.004/deep update). Raising it
  raises cost; it's a hard reallocation, not free headroom. Env
  `GENERATE_MAX_THREAD_UPDATES`.
- **Storyline titles are the bare facet** ("PS5", "Fable", "Starship") until the
  storyline is generated into a headline — they read short in the "Gerelateerde
  verhaallijnen" rail. Siem considered a composed display label ("PS5 binnen Sony")
  this session and **decided against it** — leave as-is.
- **Today's editions are verification artifacts:** e20ecc87 was regenerated several
  times (cost inflated to ~€0.138, still < €0.15) and showcases the 3 storylines;
  e004bad7 completed on the *pre-fix* priority (budget spent, can't cleanly
  deep-regen) so shows 0 storyline advances. Tomorrow's cron editions run the final
  code from a clean budget and will showcase storylines naturally.
- **Storyline rough edges (need entity typing to fully fix):** product-version
  fragmentation (`Fable` vs `Claude Fable 5`); recurring products suppressed as
  sibling umbrellas (Mythos); coincidental facets from the low floor of 2. Tuning,
  not bugs.
- **Umbrella titles can be a full generated headline** (`generate` overwrites
  `title`) — the E hero/graph should show `anchor_entity` or a short label, not the
  raw title. `nextThreadUpdateJob` already prefers the parent's `anchor_entity` for
  the framing label.
- **`.next/types/… 2.*` duplicate files** break `tsc` with bogus "Duplicate
  identifier". Fix: `find .next -name "* 2.*" -delete` then re-run.
- **Following is thread-level** (`follow_marks` type `thread`, columns
  `target_type`/`target_id`/`active`) — works for umbrellas and storylines.
- **Thread knobs (env):** `THREADS_ANCHOR_MIN_DAYS` (3), `THREADS_ANCHOR_MIN_ITEMS`
  (5), `THREADS_ANCHOR_WINDOW_DAYS` (14), `THREADS_CLUSTER_OVERLAP` (0.3),
  `THREADS_BIG_TOPIC_MIN` (5), `THREADS_FACET_MIN_ITEMS` (2),
  `THREADS_PROMOTE_MIN_FACETS` (2), `GENERATE_MAX_THREAD_UPDATES` (8).
- **Budget:** ceiling `BUDGET_EDITION_EUR` = €0.15 (aim €0.10); guard degrades
  vol → zuinig → minimaal → stop; `minimaal`/`stop` disable deep AI (the overflow
  fill still runs and keeps cards non-blank).
- **A full `npm run pipeline` is ~8–10 min/edition** (`generate` dominates); prod
  runs one step per cron tick (~7 s). Pipeline runs are sleep-sensitive.
- **Throwaway dev scripts (untracked, NOT committed):** `split-storylines.ts`,
  `rebuild-threads.ts`, `verify-*`, `regen-phase5.ts`, `backfill-threads.ts`.
  `.claude/` + `Morning Report design/` stay untracked; `CLAUDE.md` is gitignored.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live +
  RLS (service-role only). Vercel auto-deploys on push to `main`.
