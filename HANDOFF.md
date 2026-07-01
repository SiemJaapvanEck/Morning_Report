# HANDOFF — current state

> Last updated: 30 June 2026, on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

**Phase C is shipped: `/archive/[threadId]` is now the full single-storyline
detail page.** A sticky timeline scrubber with an intensity strip sits on top;
clicking a moment swaps the full deep article below it without navigating. A fixed
context rail holds the thread-wide picture (forecast → agenda → related → sources).
A **"Volg verhaallijn"** button on the page writes a thread-level follow, which
powers a new **"Mijn verhalen"** filter back on the archive list. Gate green
(lint / tsc / **188 tests** / build), pushed to `main`.

Pipeline shape unchanged (scan → select → threads → agenda → generate →
daily_paper → finalize). One schema migration this session (`0015`).

## What was done this session (Phase C)

### 1. Migration — follow a whole storyline
- `supabase/migrations/0015_follow_marks_thread.sql` replaces the
  `follow_marks.target_type` CHECK to allow `'thread'`. Applied to the live
  Supabase via the connector. `FollowMark.target_type` in
  `modules/shared/types.ts` extended to match.
- **Why a migration, not `thread_tracking`:** threads are entity-anchored since
  Phase A (`anchor_entity`, often `topic_id = null`), so the topic-keyed
  `thread_tracking` can't express "follow this exact storyline". Reusing
  `follow_marks` (RLS + unique constraint already in place) is the clean fit.

### 2. Data — `getStoryDetail` enriched (`app/lib/queries.ts`)
The Phase B stub became the full detail query:
- **Per event** (`StoryEvent`): the structured `DeepArticle` (lead + ripples),
  `sol_note`, `source_name`, `url` — keyed by `item:edition` so an item that
  recurs across editions resolves the right article. Falls back to `summary_text`.
- **Thread-wide**: `prediction`, `entities`, dominant + multi `categories`,
  `followed`.
- **Agenda**: upcoming `calendar_events` scoped to the thread.
- **Related storylines**: other open threads ranked by entity overlap (reuses
  `entityOverlap` from `modules/threads`), with parent/children always included;
  each carries the shared entities for the "deelt: …" label.
- **Sources**: per-source event count. All `in(...)` lookups batched via the
  existing `fetchInChunks`.
- `listStories` gained `followed` (from `follow_marks` type `thread`).

### 3. Pure helpers + tests (`app/lib/stories.ts` / `stories.test.ts`)
- `timelinePositions(dates)` — 0..100% per event (same mapping as the archive
  `TimelineBar`). `eventHeat(dates, bins)` — event density per time bin (the
  intensity strip). `rankRelated(self, others, overlap, limit)` — overlap ranking
  (overlap fn injected so it stays pure/testable). 9 new vitest cases (179 → 188).

### 4. UI — server page + client view
- `app/components/StoryDetailView.tsx` (client): sticky scrubber + heat, the
  `useState` selection, the changing deep article, and the rail in the
  mockup-approved order (Voorspelling → Agenda → Gerelateerd → Bronnen). The
  ripple/lead markup is **inlined with the exact Tailwind classes from
  `EditieWeergave`** (not imported) so it looks identical to the krant while
  staying self-contained.
- `app/archive/[threadId]/page.tsx` is now a thin server wrapper (auth + fetch).
- `app/components/StoriesList.tsx` gained a **★ Mijn verhalen** toggle (shown only
  when ≥1 story is followed) — the sharp, thread-specific "mine" filter that Phase
  B deliberately deferred.

### 5. Follow plumbing
- `setThreadFollow(profileId, threadId, active)` in `modules/preferences/index.ts`
  (idempotent upsert). Endpoint `app/api/threads/follow/route.ts` (POST
  `{thread_id, active}`, profile-cookie auth). The button toggles optimistically.

### Design decisions (Siem, via the approved mockup `threadpage_phase_c_mockup`)
- Graph = timeline scrubber **+ intensity** (event density — the only honest
  quantitative axis we have; no per-thread sentiment/price).
- Under-pane = the **full DeepArticle** of the selected event (not "event +
  context"); the rail stays thread-wide and does **not** change on scrub.
- Rail order: **Voorspelling → Agenda → Gerelateerd → Bronnen**.
- No standalone entities/actors section — entities surface only as the
  "deelt: …" label on related stories.

## What's open — beyond Phase C

1. **Surface ripples on the dashboard** — today they render only on the krant view
   (`/editie/<date>/krant`), not the dashboard.
2. Optional **source-citation UI** for Tavily grounding.
3. Finish the **Daily Paper PRD**; broader **block-slice** re-architecture.
4. Phase-C polish ideas if wanted: lastSeenAt "upd … geleden" in the detail header
   (currently dropped — only the date range is shown); deep-link a specific moment
   (`?t=`) so a scrubber position is shareable.

## Known issues / things to keep in mind

- **`.next/types/… 2.*` duplicate files** (likely from file sync) make `tsc`
  fail with bogus "Duplicate identifier" errors. Fix:
  `find .next -name "* 2.*" -delete` then re-run. Not a code issue.
- **Recency "Live" is relative**, not calendar-based — `recencyTier` buckets
  against the newest event in the set (Live = within ~2 days of it).
- **Following is thread-level now** (`follow_marks` type `thread`). Don't confuse
  with topic follows (`type topic`) or `thread_tracking` (still topic-keyed, used
  by the redaction lead-ordering). "Mijn verhalen" reads the thread follows only.
- **A full `npm run pipeline` is ~8–10 min per edition**; `generate` (deep
  research) dominates. In production `/api/pipeline/tick` runs one step per cron
  tick (~7 s).
- **Live data was rebuilt earlier via `scripts/rebuild-threads.ts` (`--apply`)** —
  destructive (deletes a profile's threads, replays the anchor algorithm). Deep
  articles on `edition_items` survive; only accumulated thread `state` prose is
  lost. **Always dry-run + show the list before `--apply`.** No re-derive was
  needed this session (no anchor/alias changes).
- **Budget guard is cumulative per edition per day** — regenerating the same
  edition stacks `usage_log` spend and can trip the throttle.
- **Thread knobs (env-tunable):** `THREADS_ANCHOR_MIN_DAYS` (3),
  `THREADS_ANCHOR_MIN_ITEMS` (5), `THREADS_ANCHOR_WINDOW_DAYS` (14),
  `THREADS_CLUSTER_OVERLAP` (0.3), `THREADS_BIG_TOPIC_MIN` (5). Archive display
  floor `MIN_STORY_EVENTS` = 3 (in `app/lib/queries.ts`).
- **Tavily grounding (Phase 5)** unchanged: `TAVILY_GROUNDING` (on),
  `TAVILY_API_KEY` in `.env.local`. Ripples render only on `/editie/<date>/krant`.
- **Throwaway dev scripts (untracked, NOT committed):**
  `scripts/rebuild-threads.ts` plus the older `scripts/verify-*`,
  `scripts/regen-phase5.ts`, `scripts/backfill-threads.ts`. `.claude/` +
  `Morning Report design/` stay untracked; `CLAUDE.md` is gitignored.
- **Pipeline runs are sleep-sensitive** (a live `npm run pipeline` aborts in-flight
  AI fetches if the laptop sleeps; keep awake).
- **403 feeds**, **Open-Meteo** flaky, **Postgres `current_date` is UTC** (use
  `todayLocal()`) — unchanged, non-blocking.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live
  + RLS (service-role only). Vercel auto-deploys on push to `main`.
