# HANDOFF — current state

> Last updated: 28 June 2026, session on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

Two phases of the re-imagined daily paper shipped this session: **Phase C**
(broaden + rank the selection) and **Phase B** (storyline links + restore
Vooruitblik + followed-first ordering). Both are in `main` and green
(lint/tsc/**139 tests**/build). No schema changes this session; the latest
applied migrations remain `0013`/`0014`.

The pipeline shape is unchanged (scan → select → threads → agenda → generate →
daily_paper → finalize). All Phase B + C work was in the `select` step, config,
and the krant reading surface — no new AI calls, no migrations.

### Roadmap context

Order **C → B → D**, then deep-research 3/4. **C and B are done**; **D is next.**
(Overarching direction unchanged: Plan A — block-slices on top of the pure
engine; the Daily Paper PRD is paused, not abandoned. Memory:
`block-slice-architecture`, `daily-paper-reimagination`.)

### Shipped this session (in `main`)

**Phase C — broaden + rank the selection** (commit `432e7e7`). The funnel capped
hard so little reached the paper. Finding: the ranking C asked for (profile +
threads + reviews) was already in `priority()` + the thread path, so C was purely
about the caps. Lean posture: broaden the free headline tail, keep paid tiers
flat. New env-tunable `config.select` block wired into `selectStep` +
`assignBands` — fresh pool 200→400, window 36h→48h, per-category 10→24, summaries
5→6; deep count unchanged. Live run: headline tail 18→76 (4.2×), paid tiers flat,
cost ~€0.03 vs the €0.15 ceiling; Siem's previously-thin profile now gets a full
130-item paper.

**Phase B — storyline links + Vooruitblik + followed-first** (this commit). The
Phase A reshape rendered the krant from section items and dropped the storyline
connection + the prediction box. All the data already existed, so B was a
thread-join in `getEdition` + rendering — no schema, no AI:
- `getEdition` (`app/lib/queries.ts`) now attaches to each **deep** article: its
  storyline `{ thread_id, title, part }` and the thread's `prediction`, plus
  `followedCategoryIds` on the edition. A deep item can match several threads, so
  the storyline pick is **deterministic**: most-established storyline (highest
  "deel N", tie-broken by id).
- New pure helper `orderSectionsFollowedFirst` (`app/lib/krant.ts`, 4 tests).
- `EditieWeergave.tsx`: a `Verhaallijn · {title} · deel N` label (links to
  `/archive`) and a restored **Vooruitblik** box (forecast text + target date +
  certainty chip) on the lead + featured deep articles; sections reordered
  followed-first.

**Verified on localhost** (today's 2026-06-28 editions; no pipeline re-run
needed — the data was already persisted). Every deep article links to a thread
(storyline labels render on all), real predictions show (e.g. the Iran/Hormuz
and SpaceX forecasts). Siem checked and approved the look.

## What's open

Roadmap order **D**, then deep-research 3/4:

- **Phase D — Reviews steer the paper.** Make the −2…+2 ratings + follows
  *actively* promote/demote what's selected and featured. Note the base ranking
  already blends reviews/follows via `priority()` (topic_scores absorb
  `ratingToDelta`); D is about making it *visibly and strongly* steer selection +
  featuring (and likely the deep/headline split), and tuning the strength. **←
  next**
- **Deep-research Phase 3/4 (deferred):** two-pass research per topic if a single
  rich call breaches the ~7s tick wall; scale to 6–12 deep topics/edition.
- **Daily Paper PRD** — finish it (paused mid-grilling).

## Known issues / things to keep in mind

- **Followed-first ordering is currently a no-op** — neither profile follows a
  *category* (`follow_marks` of target_type `category` = 0), so the section
  reorder has nothing to lift. It's unit-tested and activates the moment a
  category is followed in Instellingen. (Topic follows exist but the krant orders
  by category section.)
- **Storyline "deel N" counts editions, not articles** — distinct editions the
  thread appeared in, on/before the edition date. Good enough; revisit if a
  thread can appear twice in a day.
- **Phase C `select` knobs are env-tunable** — `SELECT_FRESH_POOL`,
  `SELECT_FRESH_WINDOW_H`, `SELECT_MAX_PER_CATEGORY`, `SELECT_MAX_SUMMARIES`
  override the defaults (400 / 48 / 24 / 6) without code changes.
- **Pipeline runs are sleep-sensitive.** A live `npm run pipeline` aborts
  in-flight AI fetches if the laptop sleeps (absurd multi-minute "timeout"
  durations in the log); the step machine's retries absorb it, but keep the
  machine awake for a full run.
- **`content` only flows forward** — items ingested before 27 Jun have
  `content = null`; full bodies + ripples appear only on newer items. Old
  editions fall back gracefully.
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
