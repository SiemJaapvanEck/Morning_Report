# HANDOFF — current state

> Last updated: 18 June 2026, session on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

**News Threads Phase 5c-3 is done and in `main`.** The `/archive` page is now a
single full-width multi-line chart (`StorylineChart`) — every mega-thread as one
line, colored by its primary DESTEP sector, with interactive dots and an article
panel at Daily Paper width underneath. **Phases 0–5c-3 are complete and green**
(lint/tsc/96 tests/build).

Pipeline: scan → select → **threads (match/link + mega-thread anchoring)** →
**generate (thread-aware)** → **daily_paper (assembly)** → finalize.

### Done & in `main`
- **0–4**: budget cap; threads schema + pure module; entity extraction;
  `threads` step (match/link, gate = followed+`deep` OR big cluster ≥5);
  `generateThreadUpdate` (deep, builds on stored `state`).
- **5a/5b**: Daily Paper assembly (`composeDailyPaper` → `dp_*` in `front_page`)
  + UI (krant page renders Summary→Intro→article cards; front block = `dp_summary`).
- **5c-1**: migration `0009` adds `threads.parent_thread_id` + `anchor_entity`;
  mega-thread anchoring in `threadsStep`. Verified: Iran (5 children) + SpaceX (3).
- **5c-2**: front-page Archive/Storylines tile + `/archive` page (per-mega
  `ThreadTimeline` cards — now superseded by 5c-3).
- **5c-3 — Archive rework (this session):**
  - New **`StorylineChart`** component (`app/components/StorylineChart.tsx`):
    one full-width multi-line SVG chart, one line per mega-thread, X = date,
    Y = daily news volume on a shared scale. Lines colored by primary DESTEP
    sector (politiek=red, economisch=amber, technologisch=violet, sociaal=fuchsia,
    ecologisch=green, demografisch=cyan). Sector legend + storyline chips above
    the chart. Active line's child-story dots are sector-colored (hollow = selected,
    filled = unselected); inactive lines show small sector-colored dots at
    child-story positions — clicking any dot instantly selects that mega AND that
    article (no line-first required). Page doesn't scroll on dot selection
    (`overflow-anchor: none`).
  - **Article panel** (no more small per-storyline timeline): just the article,
    underneath the full-width chart, at `lg:col-span-7` — pixel-identical to the
    Daily Paper hero block on the dashboard.
  - **Lens accuracy fixed**: `getThreadArchive` now joins `topics` + `categories`
    so `selectLenses` gets real topic name + category slug context (not bare
    entities). Fed story now correctly labels "ECONOMISCH" instead of "SOCIAAL".
  - **`dominantLens()`** pure helper in `modules/threads/index.ts` — mode of
    each child's primary lens, tie-broken by LENS_ORDER. 3 new tests (96 total).
  - **`getThreadArchive`** extended: `ArchiveMega` gains `primarySector: DestepLens`;
    `dominantLens` + `DestepLens` exported and used.
  - `/archive` is now full-width (no `max-w-3xl` wrapper).
  - `ThreadTimeline` still exists for future Daily Paper reuse; no longer used
    directly on `/archive`.

## What's open

### Phase 6 (next)
- **og:image fallback + embeddings** — optional, lower priority.

### Later / carried over
- **Broaden the mega net (deferred):** anchor matching is exact-entity (`iran`);
  war elements tagged only "Netanyahu/Hezbollah" aren't pulled in. Looser
  association (co-occurrence/semantic) is a future enhancement.
- **2099 test fixtures** — safe to delete.
- **Colleague design coordination** (Atlas vs. Dispatch resolved on Siem's side;
  collega-side still open).
- **Dutch→English comment retro-translation** — do opportunistically.

## Known issues / things to keep in mind
- **Throwaway dev scripts** (untracked, NOT committed): `scripts/verify-{threads,
  phase4,phase5a}.ts` and `scripts/backfill-threads.ts` (hardcoded Siem profile +
  June dates).
- **Demo data mutated:** Siem's profile has real mega-threads (Iran/SpaceX) and
  June 13–17 editions are entity'd + threaded.
- **English UI exception:** the archive uses English labels ("Archive",
  "Storylines") at Siem's request — deliberate exception to CLAUDE.md "UI copy
  stays Dutch". The nav's Dutch "Archief" (calendar) stays.
- **Existing editions** keep their old step list; threads/daily-paper/mega
  changes only apply going forward. Old editions fall back gracefully.
- **`.claude/` + `Morning Report design/` untracked**; **`CLAUDE.md` gitignored**.
- **403 feeds**, **Open-Meteo** flaky, **Postgres `current_date` is UTC** (use
  `todayLocal()`) — unchanged, non-blocking.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live
  + RLS (service-role only). Vercel auto-deploys on push to `main`.
