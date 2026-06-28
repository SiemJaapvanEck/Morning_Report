# HANDOFF — current state

> Last updated: 28 June 2026, session on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

The full **C → B → D** roadmap of the re-imagined daily paper is now **done**.
This session shipped all three phases, each verified and pushed to `main`:
Phase C (broaden + rank the selection), Phase B (storyline links + restore
Vooruitblik + followed-first), and Phase D (reviews + follows actively steer the
paper). Everything is in `main` and green (lint/tsc/**144 tests**/build). No
schema changes this session; latest applied migrations remain `0013`/`0014`.

The pipeline shape is unchanged (scan → select → threads → agenda → generate →
daily_paper → finalize). All work was in the `select` step, the `rank` module,
config, the feedback route, and the krant reading surface — no migrations, no new
AI calls.

### Roadmap context

**C, B, and D are all complete.** What remains of the re-imagined paper is
deferred: deep-research Phase 3/4 and finishing the Daily Paper PRD. (Overarching
direction unchanged: Plan A — block-slices on top of the pure engine. Memory:
`block-slice-architecture`, `daily-paper-reimagination`.)

### Shipped this session (in `main`)

**Phase C — broaden + rank the selection** (commit `432e7e7`). The funnel capped
hard. Lean posture: broaden the free headline tail, keep paid tiers flat. New
env-tunable `config.select` block in `selectStep` + `assignBands` — fresh pool
200→400, window 36h→48h, per-category 10→24, summaries 5→6; deep count unchanged.
Live: headline tail 18→76 (4.2×), cost ~€0.03 vs the €0.15 ceiling; Siem's
previously-thin profile now gets a full 130-item paper.

**Phase B — storyline links + Vooruitblik + followed-first** (commit `7ff37fd`).
`getEdition` (`app/lib/queries.ts`) attaches to each deep article its storyline
`{ thread_id, title, deel N }` and the thread's `prediction`, plus
`followedCategoryIds`; storyline pick is deterministic (most-established thread).
New pure helper `orderSectionsFollowedFirst` (`app/lib/krant.ts`). The krant shows
a `Verhaallijn · deel N` label (→ /archive) and a Vooruitblik box (forecast +
target date + certainty) on lead + featured articles, and orders sections
followed-first.

**Phase D — reviews + follows actively steer the paper** (this commit). Two
signals barely moved the paper before; now they bite. No schema, no new AI:
- **Item ratings count.** New `applyItemFeedback` (`modules/rank/index.ts`)
  resolves an article's `topic_id` (else `category_id`) and moves its
  `topic_scores` (reusing `applyFeedback`); the feedback route now calls it for
  `target_type:"item"` instead of dropping it (the old "fase 4" TODO). Rating an
  article in the krant steers its topic for every future edition.
- **Follows boost ranking.** `ScoreContext` carries `followedTopicIds` +
  `followedCategoryIds` (loaded in `loadScoreContext`); `priority()` +
  `preRankScore()` lift a followed topic/category to an interest **floor**
  (`config.rank.followInterestFloor`, default 0.6, env `RANK_FOLLOW_FLOOR`).
- **Featuring tilt.** `assignBands` takes an optional `followedIds` set; followed
  items are deep-eligible below the 0.5 gate (still bounded by budget mode). The
  select step builds the set from the followed context.

**Verified on real data** (read-only, no writes/AI): a quiet followed category
gains a featured article (Goed nieuws deep 1→2); busy categories stay at 2 deep
(their slots are already filled by high-importance news), so the visible effect
there is section-first ordering + which items rank top — by design. Siem confirmed
on localhost that ranking "is working better now."

## What's open

- **Deep-research Phase 3/4 (deferred):** two-pass research per topic if a single
  rich call breaches the ~7s tick wall; scale to 6–12 deep topics/edition. **←
  the obvious next build**
- **Daily Paper PRD** — finish it (paused mid-grilling).
- **Broader direction:** continue the block-slice re-architecture (Plan A) as the
  app layer grows.

## Known issues / things to keep in mind

- **Follow steer is strongest for quiet categories + ordering.** Following a
  busy category (Tech/Wereldtoneel) won't add deep articles — its 2 deep slots
  are already filled by high-importance news; the follow shows up as section-first
  ordering + item prioritization. The band-tilt adds a featured article only when
  a followed category is quiet. This is deliberate (don't bury huge news). Tune
  via `RANK_FOLLOW_FLOOR` if a stronger tilt is wanted.
- **Followed-first ordering needs a category follow.** It keys on `follow_marks`
  of target_type `category`; topic-only follows don't reorder sections.
- **Phase C `select` knobs are env-tunable** — `SELECT_FRESH_POOL`,
  `SELECT_FRESH_WINDOW_H`, `SELECT_MAX_PER_CATEGORY`, `SELECT_MAX_SUMMARIES`
  (defaults 400 / 48 / 24 / 6).
- **Storyline "deel N" counts editions, not articles** — distinct editions the
  thread appeared in, on/before the edition date.
- **Pipeline runs are sleep-sensitive.** A live `npm run pipeline` aborts
  in-flight AI fetches if the laptop sleeps (absurd multi-minute "timeout"
  durations); the step machine's retries absorb it, but keep the machine awake.
- **`content` only flows forward** — items ingested before 27 Jun have
  `content = null`; full bodies + ripples appear only on newer items.
- **Today's editions (2026-06-28) are real, regenerated data** on both profiles.
- **Dev server / preview:** runs on `localhost:3000`. Siem checks localhost
  himself — don't screenshot.
- **Throwaway dev scripts** (untracked, NOT committed): `scripts/verify-{threads,
  phase4,phase5a}.ts`, `scripts/backfill-threads.ts`. `.claude/` + `Morning Report
  design/` stay untracked; `CLAUDE.md` is gitignored.
- **403 feeds**, **Open-Meteo** flaky, **Postgres `current_date` is UTC** (use
  `todayLocal()`) — unchanged, non-blocking.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live
  + RLS (service-role only). Vercel auto-deploys on push to `main`.
