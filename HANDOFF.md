# HANDOFF — current state

> Last updated: 29 June 2026, on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

**Threads have been re-architected into an entity-anchored, flat model (Phase A
of a multi-phase rework). DONE, gate green, committed — but NOT yet run against
live data.** This is the start of a larger thread/Daily-Paper redesign Siem is
driving. The next session starts **Phase B: rebuild the `/archive` page** to a
flat list of self-contained story timelines (reference image below).

Gate green: lint / tsc / **166 tests** / build. No schema migration needed
(`anchor_entity` already existed on `threads`). Pipeline shape unchanged
(scan → select → threads → agenda → generate → daily_paper → finalize).

**Important:** verification this session was a **read-only simulation**
(`scripts/verify-anchor-threads.ts`) against Siem's real 2026-06-28 edition. The
live pipeline was **not** run and **no live data was mutated** — the database
still holds the *old* fuzzy/mega threads. A rebuild is the first task of Phase B
(see "What's open").

## The new thread model (what Phase A changed)

Every thread is now **one self-contained story anchored on a single entity**
(Ford, PlayStation, Israel) — flat, no mega/parent–child nesting.

- **Birth paths** (a thread opens when an entity qualifies via any of):
  1. **recurring** — entity appears across ≥ `anchorMinDays` (3) distinct days
     **AND** in ≥ `anchorMinItems` (5) items in the window (the *volume floor*).
  2. **big_topic** — a same-day cross-source cluster of ≥ `bigTopicMinCluster`
     (5) items → instant-on (a breaking story gets a thread the day it breaks).
  3. **followed/tracked** — a followed+deep item, or any item on an explicitly
     tracked topic, anchored on its primary entity.
- **Linking** — an item joins the **single best** existing anchor thread whose
  anchor entity it contains (`matchByAnchor`; earliest/most-salient entity wins,
  ties by thread id). One item → at most one thread (keeps generate's
  one-update-per-thread intact).
- **Category/topic** for a new thread come from `resolveThreadMeta` (mode over
  today's items carrying the anchor) so the archive can filter by category.

### Decisions made this session (all Siem's calls)
- **Entity-anchored, flat** model (not "loosen old gates", not a topic/entity
  hybrid).
- **Conservative** birth + a **volume floor** (`anchorMinItems = 5`) to cut the
  noise — without it the recurrence bar alone opened ~41 threads/edition incl.
  datelines and one-off institutions; with it, ~30 on the backfill edition (a
  one-time cliff — in steady state most anchors already exist, so daily opens
  are a handful).
- Archive filter taxonomy = **our 7 content categories**.
- **Kept entity-only despite ~22% item coverage.** Measured: of 130 items on the
  2026-06-28 edition only ~28 attach to a thread; 97% carry a topic (19 distinct
  topics) so a topic-backbone hybrid would reach ~97% coverage — but Siem chose
  **curated/sharp over comprehensive**, accepting that most daily news stays
  loose one-offs. Do not re-open this without him; it was a deliberate choice.

### Code touched
- **`modules/threads/index.ts`** — removed `matchThread`, `planThreadActions`
  (+ its `NewThreadPlan`/`ThreadActions`/`ThreadPlanConfig` types), and the whole
  mega layer (`assignMegaThreads`, `MegaAssignment`, and DB helpers
  `findOrCreateMegaThread`/`setThreadParent`/`clearThreadParents`/
  `deleteChildlessMegaThreads`). Added pure `primaryEntity`, `dominantEntity`,
  `bigTopicAnchors`, `personalAnchors`, `mergeAnchors`, `matchByAnchor`,
  `resolveThreadMeta` + `AnchorSpec`/`AnchorReason`. `EntityDays` now tracks a
  per-entity item `count`; `detectAnchors(entityDays, minDays, minItems)`.
- **`modules/pipeline/steps.ts`** — `threadsStep` rewritten around the anchor
  model; mega graduation/reparenting removed.
- **`modules/shared/config.ts`** — `threads` block: added `anchorMinItems` (5,
  env `THREADS_ANCHOR_MIN_ITEMS`); removed the now-dead `matchMinOverlap` and
  `anchorMinChildren`. Kept `bigTopicMinOverlap` (0.3), `bigTopicMinCluster` (5),
  `anchorMinDays` (3), `anchorWindowDays` (14).
- **`modules/threads/threads.test.ts`** — tests for the removed functions
  dropped, tests for the new pure functions added (153→**166** total project).

## What's open — Phase B and beyond

1. **Live rebuild (do this first in Phase B).** Write `scripts/rebuild-threads.ts`
   to wipe the old fuzzy/mega threads and re-derive entity-anchored threads from
   the existing item/entity history, so the archive has real content. **Safe:**
   the written deep articles live on `edition_items` (`summary_text`/`article`),
   NOT on `threads`, so they survive the wipe; only the accumulated `state` prose
   is lost (regenerates over time). It is destructive, so **dry-run it and show
   Siem the thread list before any real wipe** (per CLAUDE.md "confirm
   hard-to-reverse"). Alternative to a wipe: just let the next pipeline run create
   anchor threads going forward (old null-anchor threads become inert).
2. **Rebuild `/archive` + `StorylineChart` to the reference image** (see below):
   a flat list of all stories as rows, with a working **category filter** over the
   7 categories and **Latest / Longest / Most active** sort. Replace the
   `getThreadArchive`/`ArchiveMega` query with a `listStories(profileId)` that
   returns one row per anchor thread with: category, status, region, first/last
   event dates, event count, last-updated, and the event dots.
3. **Phase C (later):** the single-thread detail page (drill-in from a row).
4. Older open items still standing: surface ripples on the **dashboard** (today
   they render only on the krant view); optional source-citation UI for Tavily;
   finish the **Daily Paper PRD**; broader **block-slice** re-architecture.

### Reference image for the archive (Phase B target)
Header "**All stories** · N live timelines", subtitle "BAR LENGTH = TIME SPAN
FROM FIRST → LATEST EVENT", and sort tabs **Latest / Longest / Most active** top-
right. Each story is a full-width row: a colored category dot + category tag
(e.g. GEOPOLITICS) + a status badge (LIVE / MARKETS / POLICY…) + a region label
(Middle East, Technology…); a bold title; "UPD Xh ago"; a horizontal timeline
bar with event dots running first-date → latest-date; and on the right
"**N**d · **M** events" with the end date. Selected row is highlighted in the
`#2f6df0` interaction blue.

## Known issues / things to keep in mind

- **`/archive` is temporarily wrong until Phase B.** `getThreadArchive`
  (`app/lib/queries.ts`) selects threads where `anchor_entity is not null` and
  treats them as mega-parents with child dots. In the new model **every** thread
  has an `anchor_entity` and **none** has a `parent_thread_id`, so once new-model
  threads exist the page would render every thread as an empty-volume "mega"
  card. It still **compiles/builds** — Part B replaces this query + component.
  (Moot right now: no new-model threads exist in live DB yet.)
- **Entity-only coverage is ~22% by design** (Siem's call — see decisions). The
  volume floor does NOT drop **high-volume datelines** (`US`, `UK`, `France`,
  `Russia`): they pass on sheer volume. A small **geo-guard** stoplist is the
  available lever if they clutter the archive — but keep `Israel`/`Ukraine`/etc.
  allowed. Not implemented; flag to Siem if it bothers him in the UI.
- **Thread knobs (env-tunable):** `THREADS_ANCHOR_MIN_DAYS` (3),
  `THREADS_ANCHOR_MIN_ITEMS` (5), `THREADS_ANCHOR_WINDOW_DAYS` (14),
  `THREADS_CLUSTER_OVERLAP` (0.3), `THREADS_BIG_TOPIC_MIN` (5).
- **Budget guard is cumulative per edition per day.** Regenerating the same
  edition multiple times stacks `usage_log` spend and trips the throttle
  (`zuinig` 0.09 → `minimaal` 0.1275 → `stop` 0.15); in `minimaal`/`stop`,
  `deepDivesPerSectie = 0` so deep articles silently stop. To rebuild without
  throttle, raise `BUDGET_EDITION_EUR` on the command (env-only), or clear the
  day's `usage_log` rows. A clean single edition costs ~€0.07 (ceiling 0.15).
- **Regenerating an edition:** today's `pipeline_steps` are all `done`, so a
  re-run does nothing. Force it by resetting the rows to `pending` (full rebuild =
  positions for `select`→`finalize`; `select` wipes+reinserts `edition_items`,
  feedback lives in `topic_scores`). `claim_next_step` enforces position order.
  Then `npm run pipeline` (identical code to `/api/pipeline/tick`).
- **Tavily grounding (Phase 5)** is live and unchanged: `TAVILY_GROUNDING` (on),
  `TAVILY_MAX_RESULTS` (5), `TAVILY_SEARCH_DEPTH` (basic), `TAVILY_SNIPPET_CHARS`
  (1200); `TAVILY_API_KEY` in `.env.local` (gitignored). Ripples render only on
  the **krant** view (`/editie/<date>/krant`).
- **Pipeline runs are sleep-sensitive.** A live `npm run pipeline` aborts
  in-flight AI fetches if the laptop sleeps; retries absorb it, but keep awake.
- **`content` only flows forward** — items ingested before 27 Jun have
  `content = null`; full bodies appear only on newer items.
- **Dev server:** `localhost:3000` (`npm run dev`). Siem checks localhost himself
  — don't screenshot (text-based curl/snapshot is fine for verification).
- **Throwaway dev scripts** (untracked, NOT committed): `scripts/verify-{threads,
  anchor-threads,phase4,phase5,phase5a}.ts`, `scripts/regen-phase5.ts`,
  `scripts/backfill-threads.ts`. `.claude/` + `Morning Report design/` stay
  untracked; `CLAUDE.md` is gitignored.
- **403 feeds**, **Open-Meteo** flaky, **Postgres `current_date` is UTC** (use
  `todayLocal()`) — unchanged, non-blocking.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live
  + RLS (service-role only). Vercel auto-deploys on push to `main`.
