# HANDOFF — current state

> Last updated: 18 June 2026, session on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

**News Threads** makes the morning report **build forth on itself**. The Daily
Paper is thread-aware and reader-visible, and storylines now roll up into
**mega-threads** with an **archive** view.

Plan + board: **`docs/threads-plan.md`**. One phase per sprint, pause for review.
**Phases 0–5c-2 are done and green** (lint/tsc/93 tests/build). **Phase 5c-3
(archive rework into one big multi-line chart) is next** — fully specced below;
Siem will pick it up in a fresh context window.

Pipeline: scan → select → **threads (match/link + mega-thread anchoring)** →
**generate (thread-aware)** → **daily_paper (assembly)** → finalize.

### Done & in `main` (after this push)
- **0–4**: budget cap; threads schema + pure module; entity extraction;
  `threads` step (match/link, gate = followed+`deep` OR big cluster ≥5);
  `generateThreadUpdate` (deep, builds on stored `state`).
- **5a/5b**: Daily Paper assembly (`composeDailyPaper` → `dp_*` in `front_page`)
  + UI (krant page renders Summary→Intro→article cards; front block = `dp_summary`).
- **5c-1 — mega-threads** (this session): migration `0009` adds
  `threads.parent_thread_id` + `anchor_entity`. In `threadsStep`, after
  match/link: `loadEntityDays` → `detectAnchors` (entity recurring on ≥
  `anchorMinDays=3` distinct days) → `assignMegaThreads` (each child to its
  **single best/biggest anchor**; keep anchors with ≥ `anchorMinChildren=3`) →
  `findOrCreateMegaThread` + `setThreadParent` + `clearThreadParents` +
  `deleteChildlessMegaThreads`. Mega-threads (`anchor_entity` set) are excluded
  from the item-match pool. Config in `modules/shared/config.ts` (`threads.*`).
  Verified: **Iran** mega (5 child threads, dots across 5 days) + **SpaceX** (3).
- **5c-2 — archive UI v1** (this session): front-page **Archive/Storylines tile**
  (split the weather tile in half in `EditionView`); **`/archive`** page renders
  one **`ThreadTimeline`** card per mega-thread (a volume line, child storylines
  as clickable dots, an article panel that defaults to latest and swaps on
  dot-click). `getThreadArchive()` in `app/lib/queries.ts` builds the data.
  Verified on localhost (no console errors).

## What's open

### Phase 5c-3 — Archive rework: ONE big multi-line chart (NEXT) — Siem's final spec
Replace the per-mega `ThreadTimeline` **cards** on `/archive` with **one big,
full-width chart**:
- **Every mega-thread is a single line** on it (X = date over time, Y = that
  story's daily news volume). Currently Iran + SpaceX; ~30–40 mega-threads/year.
- **Each line is colored by its sector** = its **primary DESTEP lens** (politiek,
  economisch, …). **One line per storyline** (option a) — a multi-sector story
  like Iran takes its *primary* sector's color, NOT one line per sector.
- A **legend** maps colors → sectors. Define a **DESTEP→color palette** (6
  lenses; keep the `#2f6df0` accent for interaction, give sectors distinct hues).
- **Click a line → open that storyline** — reuse the existing dot/article panel
  (`ThreadTimeline`) as the per-storyline detail (e.g. `/archive/[threadId]` or
  an in-page selection). The current `ThreadTimeline` component is a good basis;
  the new top-level chart is a new component (e.g. `StorylineChart`).
- Data: extend/replace `getThreadArchive()` to return, per mega-thread, a
  **daily volume series** + its **primary sector** (derive from the mega's
  children's lenses, or `selectLenses` over its anchor/entities). Note: lens
  accuracy is currently approximate (computed from entities only — see below).
- Page should be **full-width** (drop the `max-w-3xl` wrapper on `/archive`).

### Known nit to fix during 5c-3
- **Lens tags are approximate.** `getThreadArchive` calls
  `selectLenses(null, null, entities)` (no topic/category context), so e.g. the
  Fed story shows "SOCIAAL" instead of "ECONOMISCH". For 5c-3's sector coloring,
  derive the sector more reliably (pass the child/mega topic+category, or pick
  the dominant lens across the mega's children).

### Later
- **Phase 6** — optional og:image fallback + embeddings.
- **Broaden the mega net (deferred):** a mega gathers threads sharing the
  *exact* anchor entity (`iran`); war elements tagged only "Netanyahu/Hezbollah"
  aren't pulled in. Looser association (co-occurrence/semantic) is a future
  enhancement — revisit if Iran's net feels too narrow.
- **Carried over:** 2099 test fixtures (safe to delete); colleague design
  coordination; Dutch→English comment retro-translation.

## Known issues / things to keep in mind
- **Throwaway dev scripts** (untracked, NOT committed): `scripts/verify-{threads,
  phase4,phase5a}.ts` and `scripts/backfill-threads.ts` (hardcoded Siem profile +
  June dates; re-scans entity-less days + runs the threads step across June 13–17).
- **Demo data mutated:** Siem's profile has real mega-threads (Iran/SpaceX) and
  June 13–17 editions are entity'd + threaded (June 13–15 were re-scanned, since
  they predate Phase 2). Today's edition is the usual **empty cron shell**.
- **English UI exception:** the archive uses English labels ("Archive",
  "Storylines") at Siem's request — a deliberate exception to the CLAUDE.md
  "UI copy stays Dutch" rule. The nav's Dutch "Archief" (calendar) stays.
- **Existing editions** keep their old step list; threads/daily-paper/mega
  changes only apply going forward. Old editions fall back gracefully.
- **`.claude/` + `Morning Report design/` untracked**; **`CLAUDE.md` gitignored**.
- **403 feeds**, **Open-Meteo** flaky, **Postgres `current_date` is UTC** (use
  `todayLocal()`) — unchanged, non-blocking.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live
  + RLS (service-role only). Vercel auto-deploys on push to `main`.
