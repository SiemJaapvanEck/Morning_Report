# HANDOFF — current state

> Last updated: 30 June 2026, on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

**Phase B is shipped: the `/archive` page is now the flat "Alle verhalen" list of
self-contained story timelines, and the thread model gained entity dedup +
multi-category + recency/category filters.** Gate green (lint / tsc / **179
tests** / build). Live threads were re-derived from history (89 threads, 27 shown
at the ≥3-event floor). The code is committed; **the live pipeline for 2026-06-30
was kicked off at end of session and may still be running** (see Known issues).

Pipeline shape unchanged (scan → select → threads → agenda → generate →
daily_paper → finalize). No schema migration this session.

## What was done this session (Phase B + follow-ups)

### 1. `/archive` → "Alle verhalen" flat list (Phase B)
- New `listStories(profileId)` in `app/lib/queries.ts` replaces the old
  `getThreadArchive`/`ArchiveMega` mega-volume query. One row per anchor thread:
  title, category set, status, first/last event date, event count, last-updated,
  event dots. Floored to **≥3 events** (`MIN_STORY_EVENTS`) — a display cut, the
  threads still exist and climb into view as they accumulate events.
- New `app/components/StoriesList.tsx` (client): sort tabs (Laatste / Langste /
  Actiefste), filter controls, full-width rows with an inline SVG timeline bar.
  A row links to `app/archive/[threadId]/page.tsx` — a **detail stub** that is the
  Phase C drill-in target (currently shows title/status/span + latest article).
- New pure helpers + tests in `app/lib/stories.ts` / `stories.test.ts`
  (`sortStories`, `spanDays`, `updatedAgo`, `categoryColor`, `recencyTier`,
  `STATUS_BADGE`). Dutch UI copy. Removed dead `StorylineChart.tsx` +
  `ThreadTimeline.tsx`.
- Decisions (Siem): page is **Dutch**; status badge = thread status
  (active→LIVE / dormant→SLAPEND / closed→AFGEROND); **no region slot**; rows
  link to a detail stub (not inline panel).

### 2. Entity dedup + geo-guard + multi-category
- **Alias-fold** in `normalizeEntity` (`modules/threads/index.ts`): a curated
  `ENTITY_ALIASES` map folds variants of one real entity at the single choke
  point everything uses — `donald trump`/`trump administration`→`trump`,
  `u s`/`united states`→`us`, `oekraine`→`ukraine`, `us federal reserve`→`federal
  reserve`, etc.
- **Geo-guard**: `DATELINE_STOPLIST` + `isAnchorableEntity()` stop bare datelines
  (`us`, `uk`, `eu`, `france`, `germany`, `kyiv`, `moscow`, `washington`,
  `brussels`, `nederland`, `europe`) from opening catch-all threads. Coherent
  place-stories (Israel, Ukraine, Iran, Gaza, Venezuela) are deliberately kept.
  Applied in `threadsStep` and the rebuild script.
- **Multi-category**: `listStories` derives each story's category set from its
  linked items (dominant → dot color; full set → display tags). No schema change.
  Result: 19/27 stories are multi-category (Trump = Wereldtoneel + Financieel,
  SpaceX = Financieel + Tech + Frontier + Wetenschap).

### 3. Archive filter axes
Asked which axes to filter on now that category is a *tag*, not a partition.
Shipped two that partition cleanly:
- **Recency** (`recencyTier`): Live / Deze week / Sluimerend, measured **relative
  to the newest event in the set** (so "Live" = moved in the most recent
  edition(s), robust to a stale snapshot). Segmented control in `StoriesList`.
- **Category-by-dominant**: chips match each story's #1 category only (multi-cat
  stays as display tags).
- **"Mijn verhalen" (Followed): deliberately dropped** — investigation showed it
  can't discriminate, because Siem's 25 topic-follows already personalize the
  whole edition (all 27 stories matched). The sharp version belongs in **Phase
  C**: a "volg deze verhaallijn" button → `thread_tracking` (currently empty) →
  a real "mine" set. Fully reverted (no dead `followed` field).

### 4. Service worker dev fix
`app/components/ServiceWorkerRegistratie.tsx`: in production it registers the PWA
SW as before; in **development** it now actively **unregisters any leftover SW
and clears its caches**. This was the cause of "blank HTML, no CSS" pages — the
SW cached navigations and, when the dev server was down, served stale HTML
pointing at chunk hashes that no longer existed after a `.next` wipe. Dev now
always loads fresh; prod PWA behavior unchanged.

## What's open — Phase C and beyond

1. **Phase C — the single-thread detail page.** Flesh out
   `app/archive/[threadId]/page.tsx` (currently a stub): the storyline's events,
   accumulated state, prediction, sources. Add the **"volg deze verhaallijn"**
   button → `thread_tracking`, which then powers a sharp **"Mijn verhalen"**
   filter back on the archive list.
2. **Re-derive after any normalization change.** If `ENTITY_ALIASES` /
   `DATELINE_STOPLIST` change, re-run `scripts/rebuild-threads.ts` (dry first,
   then `--apply`; confirm the dry-run list before wiping).
3. Older open items still standing: surface ripples on the **dashboard** (today
   they render only on the krant view); optional source-citation UI for Tavily;
   finish the **Daily Paper PRD**; broader **block-slice** re-architecture.

## Known issues / things to keep in mind

- **The 2026-06-30 pipeline run was started at end of session and may not have
  finished.** It was in the long `generate` phase when the session closed (also
  completing a half-finished 06-29 edition). All steps were green (no errors).
  Check `pipeline_steps` for `done` and re-run `npm run pipeline` if anything is
  still pending. Once today's edition finishes, today's stories get a fresh
  `last_seen_at` and become the **Live** set on the archive.
- **"Live" is relative, not calendar-based.** `recencyTier` buckets against the
  newest event in the dataset (Live = within ~2 days of it), so before today's
  pipeline completes, "Live" reflects the most recent *completed* edition.
- **`thread_tracking` is empty** — "Mijn verhalen" has no sharp signal until
  Phase C adds the tracking button. Don't re-add a topic-follow-based "followed"
  flag; it marks everything (the edition is already personalized).
- **Live data was rebuilt via `scripts/rebuild-threads.ts` (`--apply`).** It
  deletes all of a profile's threads (cascades `thread_items`) and replays the
  anchor algorithm over history. Deep articles live on `edition_items` and
  survive; only accumulated thread `state` prose is lost (regenerates over time).
  **Always dry-run + show the list before `--apply`.**
- **Thread knobs (env-tunable):** `THREADS_ANCHOR_MIN_DAYS` (3),
  `THREADS_ANCHOR_MIN_ITEMS` (5), `THREADS_ANCHOR_WINDOW_DAYS` (14),
  `THREADS_CLUSTER_OVERLAP` (0.3), `THREADS_BIG_TOPIC_MIN` (5). Archive display
  floor `MIN_STORY_EVENTS` = 3 (in `app/lib/queries.ts`).
- **Budget guard is cumulative per edition per day.** Regenerating the same
  edition stacks `usage_log` spend and trips the throttle; in `minimaal`/`stop`
  deep dives silently stop. A clean edition ≈ €0.07 (ceiling €0.15). To rebuild
  without throttle, raise `BUDGET_EDITION_EUR` or clear the day's `usage_log`.
- **Tavily grounding (Phase 5)** unchanged: `TAVILY_GROUNDING` (on),
  `TAVILY_API_KEY` in `.env.local`. Ripples render only on `/editie/<date>/krant`.
- **Throwaway dev scripts (untracked, NOT committed):** `scripts/rebuild-threads.ts`
  (the destructive re-derive tool — kept locally), plus the older
  `scripts/verify-*`, `scripts/regen-phase5.ts`, `scripts/backfill-threads.ts`.
  `.claude/` + `Morning Report design/` stay untracked; `CLAUDE.md` is gitignored.
- **Pipeline runs are sleep-sensitive** (a live `npm run pipeline` aborts
  in-flight AI fetches if the laptop sleeps; retries absorb it, keep awake).
- **403 feeds**, **Open-Meteo** flaky, **Postgres `current_date` is UTC** (use
  `todayLocal()`) — unchanged, non-blocking.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live
  + RLS (service-role only). Vercel auto-deploys on push to `main`.
