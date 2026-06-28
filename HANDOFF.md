# HANDOFF — current state

> Last updated: 28 June 2026 (second session of the day), on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

**Deep-research Phase 4 is done and committed** (`4c18da8`, pushed to `main`):
deep research now scales to 8–10 topics spread across every live category, and
every deep topic — storyline or one-off — gets the full two-layer
`{ lead, ripples }` article. Gate green (lint/tsc/**153 tests**/build). No schema
changes; latest migrations remain `0013`/`0014`. Pipeline shape unchanged
(scan → select → threads → agenda → generate → daily_paper → finalize).

**Phase 3 was skipped** (deliberately): the deep call runs 10–16s, past the ~7s
*soft* tick budget, but the tick route's hard ceiling is `maxDuration = 60`, so a
single rich call is safe. Two-pass would add complexity for no production gain.

**Phase 5 is fully designed + de-risked but NOT built** — it is blocked on one
thing only: a **`TAVILY_API_KEY`** in `.env.local` (see "What's open").

Today's editions (2026-06-28) on both profiles were regenerated twice this
session and reflect the Phase 4 logic.

## Shipped this session (commit `4c18da8`)

**Phase 4 — scale + deepen deep research across categories.**
- **Global deep distribution.** New pure `distributeBands` (`modules/rank/index.ts`)
  replaces the per-section "top-2 above 0.5" gate that starved quiet categories
  (their best story sits below 0.5 → zero deep). A GLOBAL deep budget is handed out
  round-robin — each category gets its strongest eligible story before any gets a
  second. Knobs: `GENERATE_MAX_DEEP` (10), `GENERATE_DEEP_FLOOR` (0.35),
  `GENERATE_MAX_DEEP_PER_CAT` (2). `selectStep` now ranks all categories, then
  distributes once (two-pass: build → distribute → insert).
- **Topic-aware summary floor.** Any topic matching ≥ `SELECT_TOPIC_SUMMARY_FLOOR`
  (0.90) keeps its own summary past the per-section cap, so standout topics never
  drop to a bare headline.
- **Unified the deep path.** New `deepArticle` (`modules/generate/index.ts`) gives a
  non-storyline deep item the SAME two-layer article as a thread update; the shallow
  single-paragraph `deepDive` is retired. Every deep item now has an `article` jsonb.
- **Deepened each article.** Ripple cap 3→5 (`GENERATE_MAX_RIPPLES`), lead 4-7→6-10
  sentences, thread-update tokens 1500→2200. `cleanArticle` takes a `maxRipples` param.
- **Verified live on both profiles:** deep 10 / 8 across 6 / 8 categories (was 9 / 5
  bunched), cost ~€0.03/edition (ceiling €0.15).

### THE key finding (drives Phase 5)

After the unify, **ripples are still near-zero** (avg 0.2–0.4 per article). Root
cause is **not the code — it's thin source text.** RSS gives ~350-char summaries,
and the model correctly refuses to fabricate consequences it can't ground.
Measured: articles WITH ripples averaged 1091 source chars; those WITHOUT, 358. So
the next lever is **source enrichment**, not more prompt/path tuning.

## What's open

- **Phase 5 — web-search grounding (designed, awaiting a key). ← the next build.**
  Decisions, all made with Siem this session:
  - **Route: Tavily search API.** NOT xAI's agentic web search. (I spiked xAI: its
    `/v1/responses` endpoint with the `web_search` tool AND `text.format` json_schema
    works in ONE call and returns real grounded ripples + citations — but it costs
    ~€0.02–0.04/article because the agentic model fires several searches and injects
    the results as input tokens. ~5× our budget.) Tavily decouples retrieval (free
    tier ~1000/mo; our volume ~540/mo = €0) from our existing cheap synthesis call.
  - **Shape:** per deep topic, query Tavily with the topic title/entities → LLM
    snippets+citations → fed into the existing `deepArticle`/`generateThreadUpdate`
    JSON call as grounding. Ground ALL 8–10 deep topics. ~+€0.002/article → edition
    ~€0.05, fits €0.15, **no ceiling change**.
  - **Build:** a small Tavily client (a plain fetch, like ingest's RSS — NOT through
    `askAI`, since it's not an LLM call), wired into the generate step before the
    synthesis call. Pure helpers tested.
  - **BLOCKER:** add `TAVILY_API_KEY` to `.env.local` (free signup, no card). Cannot
    be built+verified without it.
- **Daily Paper PRD** — finish it (paused mid-grilling).
- **Broader direction:** continue the block-slice re-architecture (Plan A).

## Known issues / things to keep in mind

- **Ripples need rich source text** (see key finding). Without it, deep articles are
  lead-only. Phase 5 (Tavily) is the fix; until then ripples appear only where a feed
  gave a substantial body.
- **Phase 4 select/deep knobs are env-tunable** — `GENERATE_MAX_DEEP` (10),
  `GENERATE_DEEP_FLOOR` (0.35), `GENERATE_MAX_DEEP_PER_CAT` (2),
  `GENERATE_MAX_RIPPLES` (5), `SELECT_TOPIC_SUMMARY_FLOOR` (0.90). Phase C knobs
  unchanged (`SELECT_FRESH_POOL` 400 / `_WINDOW_H` 48 / `_MAX_PER_CATEGORY` 24 /
  `_MAX_SUMMARIES` 6).
- **xAI web search is via `/v1/responses`** (Agent Tools API), NOT chat/completions;
  legacy `search_parameters` Live Search is deprecated (410). The endpoint reports
  `usage.cost_in_usd_ticks` (÷ 1e10 = USD) and `server_side_tool_usage_details`.
  Kept for reference in case we ever want the agentic route.
- **Regenerating an edition:** today's `pipeline_steps` are all `done`, so a re-run
  does nothing. To force it, reset the `select`→`finalize` rows (positions 22–27) to
  `pending` for the edition (delete the requeue duplicates first); `claim_next_step`
  enforces position order so the chain replays. `select` wipes+reinserts
  `edition_items` (feedback lives in `topic_scores`, not lost). To re-gen only deep
  bodies, null `summary_text`+`article` on the deep items and reset `generate`+down.
- **Pipeline runs are sleep-sensitive.** A live `npm run pipeline` aborts in-flight
  AI fetches if the laptop sleeps (absurd multi-minute "timeout" durations); the step
  machine's retries absorb it, but keep the machine awake.
- **`content` only flows forward** — items ingested before 27 Jun have
  `content = null`; full bodies appear only on newer items.
- **Dev server:** runs on `localhost:3000`. Siem checks localhost himself — don't
  screenshot.
- **Throwaway dev scripts** (untracked, NOT committed): `scripts/verify-{threads,
  phase4,phase5a}.ts`, `scripts/backfill-threads.ts`. `.claude/` + `Morning Report
  design/` stay untracked; `CLAUDE.md` is gitignored.
- **403 feeds**, **Open-Meteo** flaky, **Postgres `current_date` is UTC** (use
  `todayLocal()`) — unchanged, non-blocking.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live
  + RLS (service-role only). Vercel auto-deploys on push to `main`.
