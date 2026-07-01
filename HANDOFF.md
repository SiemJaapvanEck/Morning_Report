# HANDOFF — current state

> Last updated: 1 July 2026, on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.
> Sprint board + full Phase D/E plan: `docs/threads-plan.md`.

## Where we stand

We're building the **storyline hierarchy** (Phase D): a flat entity thread becomes
a **big thread (umbrella)** that branches into **storylines** (child threads). This
session shipped **Phase D1 (pure logic)** and **Phase D2 (pipeline + live split)**,
and **designed Phase E** (the visualization UX) with an approved mockup. Gate is
green (lint / tsc / **197 tests** / build). **Nothing committed/pushed yet** — the
working tree holds all of this session's work.

**Live data is already split:** the split script was applied — **9 umbrellas now
have 24 storylines** (e.g. Anthropic → Fable, Claude Fable 5, Claude Sonnet 5,
Claude Science; SpaceX → Starship, NASDAQ; Iran → Strait of Hormuz, …).

Pipeline shape unchanged (scan → select → **threads** → agenda → generate →
daily_paper → finalize). No migration this session (the model reuses
`parent_thread_id` from `0009`).

## The model (what "storyline" means now)

- **Big thread / umbrella:** `parent_thread_id = null`, `anchor_entity` = a
  recurring entity (Anthropic, SpaceX). Matches items by anchor containment.
- **Storyline / child:** `parent_thread_id → umbrella`, `anchor_entity` = a
  *secondary facet* entity (fable, ipo). Storylines **are threads**, so
  `thread_items` carries item↔storyline links — **many-to-many**: an item about
  Fable *and* the IPO links to **both** storylines; an item with the anchor but no
  facet links to the umbrella (a general "Algemeen" bucket).
- **Promotion:** a thread only splits once **≥2 recurring facets** emerge
  (`promoteMinFacets`); below that it stays flat.
- **Suppress rule:** a facet that is itself a big-thread anchor is a *sibling
  umbrella*, not a sub-storyline — it's excluded (kills circular Iran↔Israel
  nesting; via `storylineFacets(..., exclude)`).

## What was done this session

### Phase D1 — pure foundation (`modules/threads/index.ts` + tests)
`storylineFacets(bigAnchor, items, minItems, exclude?)`, `matchStorylines`,
`shouldPromote`. 9 vitest cases (188 → 197).

### Phase D2 — pipeline + live split
- `modules/shared/config.ts`: `threads.facetMinItems` (`THREADS_FACET_MIN_ITEMS`,
  default **2** — storylines appear fast, per Siem) and `threads.promoteMinFacets`
  (`THREADS_PROMOTE_MIN_FACETS`, default **2**).
- `threadsStep` (`modules/pipeline/steps.ts`) reworked: match items to **big**
  threads (parent null only) → per umbrella, detect facets over full history +
  today → promote & spawn storyline children (inherit umbrella topic/category) →
  **multi-link** items to their storylines (or the umbrella if no facet). Still no
  AI, idempotent (already-linked skip + upsert-ignore + set-union merge).
- DB helpers: `insertThread` gained `parentThreadId` + nullable `lastEditionId`;
  `linkThreadItems` editionId now nullable; new `loadThreadItemEntities(threadIds)`
  (chunked, feeds facet detection).
- `ENTITY_ALIASES`: added `libanon → lebanon`.
- **`scripts/split-storylines.ts`** (untracked, additive, dry-run default,
  `--apply` writes) — retroactively splits existing umbrellas + moves item links.
  **Applied** to Siem's profile (9 → 24).

### Phase E — designed (not built)
Approved mockup `umbrella_thread_multiline_bell_follow_mockup` (earlier mockups
iterated away: hub-and-spoke rejected; legend-below → moved left; star → bell).
Decisions + E1/E2 build plan are in `docs/threads-plan.md` under "Phase E".
Summary: each **child** keeps its own Phase C graph; the **umbrella** gets one **big
multi-line timeline chart** — x = time, **one line per storyline**, y = items/day,
**color = DESTEP lens**, live lines thicker with a pulse, dashed neutral "Algemeen"
line for the general bucket; click a line → storyline page. **Left-side legend**
with a **follow bell per storyline** (filled accent = followed). Two follow tiers: hero **"Volg heel verhaal"**
(umbrella + all children, incl. future) vs a per-storyline ★ (narrow) — both
`follow_marks` type `thread`. `/archive` restructures to list umbrellas;
`/archive/[threadId]` branches umbrella-vs-leaf.

## What's open — the road ahead (order)

1. **Phase D3** — thread-aware generation **per storyline**: updates run per child;
   the generate call **names** each storyline (the hybrid choice); the umbrella
   aggregates its storylines' state (feeds the E hero). Touches
   `modules/generate` + `generateStep`/`nextThreadUpdateJob`.
2. **Phase E1 → E2** — the umbrella hub-and-spoke UI (see plan). E's hero depends
   on D3's aggregation (start with a fallback concatenation).
3. **Entity typing (later)** — tag entities actor/product/event in the scan so
   umbrellas = actors and storylines = product/event facets. This is the clean fix
   for the two known rough edges below. Its own phase; not urgent.
4. Daily-paper krant redesign — **still parked** (Siem's call).

## Known issues / things to keep in mind

- **Storyline rough edges (need entity typing to fully fix):** (a) *product-version
  fragmentation* — `Fable` vs `Claude Fable 5` show as two storylines; (b)
  *recurring products suppressed* — a product that independently threaded (Mythos)
  is treated as a sibling umbrella and doesn't appear under its parent; (c)
  *coincidental facets* from the low floor of 2 (Iran → FIFA/World Cup). All
  tuning, not bugs. Knobs: `THREADS_FACET_MIN_ITEMS`, `THREADS_PROMOTE_MIN_FACETS`.
- **The split apply is NOT trivially reversible** — it creates child threads and
  *moves* item links off the umbrella. Undo = delete storylines + re-run
  `scripts/rebuild-threads.ts --apply` (the flat rebuild). Deep articles on
  `edition_items` survive regardless.
- **Umbrella titles can be a full generated headline** (e.g. "Anthropic lanceert
  Claude Science…") not a clean "Anthropic" — `generate` overwrites `title` with
  the update headline. Cosmetic; the E hero/graph should show the anchor entity or
  a short label, not the raw title.
- **`getStoryDetail` already surfaces parent/children** in the "Gerelateerd" rail
  (`app/lib/queries.ts`), so Phase C pages already cross-link umbrella↔storyline.
- **`.next/types/… 2.*` duplicate files** break `tsc` with bogus "Duplicate
  identifier". Fix: `find .next -name "* 2.*" -delete` then re-run. Not a code issue.
- **Archive display floor** `MIN_STORY_EVENTS = 3` (`app/lib/queries.ts`) hides the
  2-item storylines from the flat list — Phase E should reach storylines via the
  umbrella graph, not this list.
- **Thread knobs (env):** `THREADS_ANCHOR_MIN_DAYS` (3), `THREADS_ANCHOR_MIN_ITEMS`
  (5), `THREADS_ANCHOR_WINDOW_DAYS` (14), `THREADS_CLUSTER_OVERLAP` (0.3),
  `THREADS_BIG_TOPIC_MIN` (5), `THREADS_FACET_MIN_ITEMS` (2),
  `THREADS_PROMOTE_MIN_FACETS` (2).
- **Following is thread-level** (`follow_marks` type `thread`) — works for both
  umbrellas and storylines (both are threads).
- **A full `npm run pipeline` is ~8–10 min/edition** (`generate` dominates);
  prod runs one step per cron tick (~7 s). Pipeline runs are sleep-sensitive.
- **Throwaway dev scripts (untracked, NOT committed):** `split-storylines.ts`,
  `rebuild-threads.ts`, `verify-*`, `regen-phase5.ts`, `backfill-threads.ts`.
  `.claude/` + `Morning Report design/` stay untracked; `CLAUDE.md` is gitignored.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live +
  RLS (service-role only). Vercel auto-deploys on push to `main`.
