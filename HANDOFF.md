# HANDOFF — current state

> Last updated: 28 June 2026, session on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

This session shipped **Phase C — Broaden + rank the selection**, the real fix for
"more articles than paper". The change is in `main` and green
(lint/tsc/**135 tests**/build). No schema changes (config + step logic only); the
two prior migrations (`0013`, `0014`) remain the latest applied.

The pipeline shape is unchanged (scan → select → threads → agenda → generate →
daily_paper → finalize). Phase C only loosened the **funnel caps** in the
`select` step and the band split — everything else is untouched.

### Roadmap context

The re-imagined daily paper follows the order **C → B → D**, then deep-research
3/4. **C is now done**; B is next. (Overarching direction unchanged: Plan A —
re-architect the app layer into "block-slices", keep the pure engine; the Daily
Paper PRD is paused, not abandoned. Memory: `block-slice-architecture`,
`daily-paper-reimagination`.)

### Shipped this session (in `main`)

**Phase C — broaden the funnel, keep cost flat.** Key finding during planning:
the *ranking* Phase C named ("by profile + threads + reviews") was **already in
place** — `priority()` (`modules/rank/index.ts`) blends interest (topic_scores,
which absorb review ratings via `ratingToDelta` + follows), source weight (with
feedback baked in), and importance; thread featuring already happens via the
generate thread-update path. So Phase C was almost entirely about the **caps**,
not a new ranking formula. Posture chosen with Siem: **Lean** — broaden the free
headline tail hard, keep the paid (deep/summary) tiers ~flat.

Three caps loosened, all via a new env-tunable `config.select` block
(`modules/shared/config.ts`):

- **Fresh pool** 200 → **400** items (`freshPoolLimit`), window 36h → **48h**
  (`freshWindowHours`) — `selectStep` in `modules/pipeline/steps.ts`.
- **Per-category cap** 10 → **24** (`maxPerCategory`) — the killer cap; anything
  past rank 10 used to never reach the paper, not even as a free headline.
- **Paid summaries** 5 → **6** per section (`maxSummariesPerSection`), passed into
  `assignBands(...)`. **Deep count unchanged** (still governed by `budgetPolicy`),
  so the extra breadth lands in the **free** "Ook in het nieuws" headline tail.

The krant UI needed no changes — `getEdition` has no per-section cap and
`BriefLijst` renders all headlines, so the broader selection just fills the page.

**Verified on a live run** (2026-06-28, both profiles). Measured before → after:

| Edition | total | deep | summary | headline | cost |
|---|---|---|---|---|---|
| 27 Jun Jesse (before) | 67 | 15 | 34 | 18 | €0.038 |
| **28 Jun Jesse (after)** | **130** | 14 | 40 | **76** | €0.028 |
| 27 Jun Siem (before) | 1 | 0 | 1 | 0 | — |
| **28 Jun Siem (after)** | **130** | 12 | 42 | **76** | €0.045 |

The free headline tail grew 4.2× (18 → 76); paid tiers stayed flat; cost stayed
far under the €0.15 ceiling (budget mode never left `vol`). Bonus: Siem's profile
went from 1 item to a full 130-item paper — the old "Siem's profile is thin"
issue is resolved. Run on localhost: `npm run dev`, open either profile's krant
for 2026-06-28.

## What's open

Roadmap order **B → D**, then deep-research 3/4:

- **Phase B — Storyline links + restore Vooruitblik.** Surface explicit
  *"Verhaallijn · deel N"* links per article, and reconnect thread data so the
  **prediction box returns** (dropped from the krant in the Phase A reshape — see
  known issues). Also: followed-section-first ordering. **← next**
- **Phase D — Reviews steer the paper.** Make the −2…+2 ratings + follows actively
  promote/demote what's selected and featured. (Note: the base ranking already
  blends reviews/follows via `priority()`; Phase D is about making it *visibly*
  steer selection + featuring.)
- **Deep-research Phase 3/4 (deferred):** two-pass research per topic if a single
  rich call breaches the ~7s tick wall; scale to 6–12 deep topics/edition.
- **Daily Paper PRD** — finish it (paused mid-grilling).

## Known issues / things to keep in mind

- **Inline "Vooruitblik" (prediction) is still missing from the krant** — the
  Phase A layout renders from section items, which don't carry the thread
  prediction. It returns in Phase B. Data is intact (threads, `calendar_events`,
  dashboard agenda, archive).
- **Phase C `select` knobs are env-tunable** — `SELECT_FRESH_POOL`,
  `SELECT_FRESH_WINDOW_H`, `SELECT_MAX_PER_CATEGORY`, `SELECT_MAX_SUMMARIES`
  override the defaults (400 / 48 / 24 / 6) without code changes if the paper
  needs re-balancing.
- **Pipeline runs are sleep-sensitive.** This session's live run was interrupted
  by the laptop sleeping; in-flight AI fetches aborted "due to timeout" (absurd
  16–35 min durations in the log). The step machine's retries (maxAttempts 3)
  absorbed it and both editions finalized cleanly — but don't mistake those
  timeouts for a code bug; keep the machine awake for a full `npm run pipeline`.
- **`content` only flows forward** — the ~8,600 pre-existing items have
  `content = null`; full bodies + ripples appear on items ingested after the
  27 Jun change. Old editions fall back gracefully.
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
