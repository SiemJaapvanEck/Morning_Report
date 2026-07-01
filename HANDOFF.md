# HANDOFF — current state

> Last updated: 1 July 2026, on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.
> Sprint board + full Phase D/E plan: `docs/threads-plan.md`.

## Where we stand

**Phase E (umbrella master–detail reader) is shipped and stable.** Open an
umbrella from `/archive` and you read all its storylines in place instead of
clicking through each one:

- **Left (2/3), sticky** — an article panel: the storyline's accumulated "Stand
  van zaken", the selected moment's deep article (lead + ripples + Sol's note),
  an "in deze verhaallijn" event list, sources, and an "Open volledige
  verhaallijn →" link to the full leaf page.
- **Right (1/3)** — the storylines as a single-column bento list (Siem's call:
  stays single-column, no 2-up grid). Each block: category-colored **facet
  eyebrow** (e.g. "Nasdaq 100", "Cursor"), the headline, a pressable
  **event-dot strip**, LIVE · upd · N delen, and a follow bell. Selecting a
  block swaps the left panel.
- **The dots are event pickers**, 13px (16px selected). Three distinct looks
  since this session's fix: **selected** = solid fill + ring; **has a deep
  article, not selected** = full-opacity hollow outline; **no article, not
  selected** = faint hollow outline. Hover pops the event title; pressing opens
  that exact moment ("Gekozen moment") in the panel.

This session was small live-usage polish reacting to Siem actually reading the
umbrella pages (see below) — no migration, no pipeline change, no schema
change. Gate is green (lint / tsc / **220 tests** / build). The pipeline shape
is unchanged (scan → select → threads → agenda → generate → daily_paper →
finalize).

## What was done this session — reader polish

Two of last session's open follow-ups plus a bug Siem hit while reading live:

1. **Archive badge → child count.** The "▨ verhaallijnen" tag on `/archive`
   rows was a plain label, redundant now every row is an umbrella. Added
   `Story.storylineCount` (`app/lib/queries.ts`), computed from the existing
   children-per-parent map in `listStories`, so the badge now reads e.g.
   "▨ 4 verhaallijnen" (`StoriesList.tsx`).
2. **Right-side layout: kept single-column** — Siem's call, no `grid-cols-2`
   change needed.
3. **Dot fill/selection bug** (`UmbrellaReader.tsx`'s `EventDots`) — Siem
   noticed dots "stay filled" when moving to another dot/block, and that
   selecting a new storyline seemed to "auto-fill" its last dot. Root cause:
   the dot's fill color was `on || hasArticle ? color : transparent` — "has an
   article" and "is selected" shared the same solid-fill look, so an
   always-filled has-article dot read as leftover/auto selection state. Fixed
   by giving has-article dots a hollow outline instead of a fill; only the
   truly selected dot gets solid fill now. See the three-state description
   above.

## Phase E build (prior session — E1 + E2 + iterations)

The build diverged from the plan's "multi-line timeline + legend" spec because
Siem iterated on the read-side design live. The final shape (master–detail
reader) is what's in the code; the graph and the interim tile grid were built
then removed.

**E1 — data + pure helpers** (`app/lib/stories.ts`, tested):
- `dailyActivitySeries`, `seriesPoints`, `lineWeight` (the last two are now only
  used by the deleted chart — harmless dead helpers, still tested).
- `threadSubject(title, anchor)` — short display subject for umbrellas: keeps an
  already-short title with its exact casing ("SpaceX", "NASA"), else falls back
  to the title-cased anchor ("Anthropic lanceert Claude Science…" → "Anthropic").
  `titleCaseEntity` helper alongside it.

**E1 — `getUmbrella(profileId, threadId)`** (`app/lib/queries.ts`):
- Returns `null` for a leaf thread → caller falls back to `getStoryDetail` +
  `StoryDetailView` (Phase C, unchanged). Otherwise the umbrella meta +
  `aggregateUmbrellaState` rollup + one `UmbrellaLine` per storyline (+ the
  "Algemeen" general bucket when the umbrella directly holds items).
- Each line carries a **facet** (first entity ≠ the umbrella's anchor,
  title-cased), a rolled-up `series`, and a **`detail`** payload for the reader:
  `state`, per-event list (each event now carries **its own `article` + Sol
  note**, so any dot can render its moment), sources — reusing the exact
  `edition_items` fetch pattern from `getStoryDetail`.

**E2 — UI + routing:**
- `app/archive/[threadId]/page.tsx` branches: umbrella → `UmbrellaHero` +
  `UmbrellaReader`; leaf → `StoryDetailView`.
- `UmbrellaHero.tsx` — hero with the aggregated state and the broad "Volg heel
  verhaal" bell (follows the umbrella id).
- `UmbrellaReader.tsx` — the master–detail component (selection + per-storyline
  follow state; left `ArticlePanel`, right `StorylineBlock` list with the
  `EventDots` strip and `FollowBell`).
- `/archive` (`listStories`) now lists **umbrellas only**; flat threads are
  hidden. Umbrella rows roll their children's events into their own
  timeline/count and show a "▨ N verhaallijnen" badge (`StoriesList.tsx`;
  child count added this session, see above).

**Decisions made this session (Siem, 1 Jul 2026):**
- Line/tile color = **category color** (reuse `categoryColor`), not the DESTEP lens.
- `/archive` = **umbrellas only** (flat threads dropped from the index).
- The **multi-line graph was rejected** → bento tiles → finally the
  **master–detail reader** (article left 2/3, storylines right 1/3).
- Umbrella titles display as **subjects** ("Anthropic"), not full headlines.
- The dots are **event pickers** that drive the sticky panel.

## What's open — the road ahead

1. **Entity typing (its own phase)** — tag entities actor/product/event in the
   scan so umbrellas = actors and storylines = product/event facets. This is the
   real fix for the storyline fragmentation now visible in the reader (e.g. under
   Anthropic: "Claude" vs "Claude Science" vs "Claude Sonnet 5" as separate
   storylines; Fable vs Claude Fable 5).
2. Daily-paper krant redesign — **still parked** (Siem's call).

## Known issues / things to keep in mind

- **Console "Encountered a script tag while rendering" errors are harmless
  pre-existing noise** — they come from the anti-flash theme `<script>` in
  `layout.tsx` (fires on every page), not from the reader.
- **Storyline facet/label rough edges** (product-version fragmentation, the
  low facet floor) need **entity typing** to fully fix — tuning, not bugs.
- **Umbrella/child titles are often full generated headlines** (`generate`
  overwrites `title`); the reader deliberately shows the short **facet** eyebrow
  and `threadSubject` handles the archive/hero labels.
- **Dev server CSS occasionally fails to load** after many HMR cycles / session
  resumes → `rm -rf .next` and restart (a plain restart isn't always enough).
- **`.next/types/… 2.*` duplicate files** break `tsc` with bogus "Duplicate
  identifier". Fix: `find .next -name "* 2.*" -delete` then re-run.
- **Following is thread-level** (`follow_marks` type `thread`, columns
  `target_type`/`target_id`/`active`) — works for umbrellas and storylines.
- **Verify on localhost, not the headless preview** — the preview harness reports
  a 0-width viewport, so the `lg:` two-column split can't be measured there; it
  renders correctly in a real desktop browser. This session's dot-fill fix was
  verified the same way (Siem checked `localhost:3000` directly).
- **Budget:** ceiling `BUDGET_EDITION_EUR` = €0.15 (aim €0.10); guard degrades
  vol → zuinig → minimaal → stop. Thread knobs (env): `THREADS_ANCHOR_MIN_DAYS`
  (3), `THREADS_ANCHOR_MIN_ITEMS` (5), `THREADS_ANCHOR_WINDOW_DAYS` (14),
  `THREADS_CLUSTER_OVERLAP` (0.3), `THREADS_BIG_TOPIC_MIN` (5),
  `THREADS_FACET_MIN_ITEMS` (2), `THREADS_PROMOTE_MIN_FACETS` (2),
  `GENERATE_MAX_THREAD_UPDATES` (8).
- **Throwaway dev scripts (untracked, NOT committed):** `split-storylines.ts`,
  `rebuild-threads.ts`, `verify-*`, `regen-phase5.ts`, `backfill-threads.ts`.
  `.claude/` + `Morning Report design/` stay untracked; `CLAUDE.md` is gitignored.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live +
  RLS (service-role only). Vercel auto-deploys on push to `main`.
