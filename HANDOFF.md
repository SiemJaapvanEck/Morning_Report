# HANDOFF — current state

> Last updated: 28 June 2026 (third session of the day), on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

**Deep-research Phase 5 (web-search grounding) is DONE and being pushed this
session.** Deep articles now ground their facts + ripples in real web text
fetched per topic via Tavily, fed into the existing synthesis call. This fixes
the Phase 4 key finding (ripples were near-zero because RSS source text was too
thin). Gate green (lint/tsc/**164 tests**/build). No schema changes; latest
migrations remain `0013`/`0014`. Pipeline shape unchanged
(scan → select → threads → agenda → generate → daily_paper → finalize).

**Verified live on both profiles, end-to-end through the real pipeline:**
ripples went from avg **0.2 / 0.38** (Siem / Jesse) to avg **1.00** on both —
roughly a 3–6× lift. Today's editions (2026-06-28) were rebuilt and reflect the
Phase 5 logic. Substantive ripples land on stories that warrant them (Iran
strikes, Netanyahu/Lebanon, Anthropic gov access); curiosity/science items
(supernova, CERN, PlayStation) correctly get zero — the model still refuses to
invent consequences it can't ground.

**Phases 3 + 4 stand as before.** Phase 3 (two-pass deep) was deliberately
skipped — the single rich deep call (10–16s) fits the tick route's hard
`maxDuration = 60` ceiling, so two-pass adds complexity for no gain.

## Shipped this session (Phase 5)

**Web-search grounding for deep research.**
- **New `modules/tavily/index.ts`** — a small client. Pure, tested helpers:
  `buildQuery(title, entities)` (focused query, dedupes entities already in the
  title, caps how many it appends), `shapeGrounding` (bounds + filters raw
  results), `formatGroundingBlock` (numbered, attributed Dutch citation block),
  `tavilyEnabled()`. Impure `searchTavily` via plain `fetch` — **NOT** through
  `askAI` (it's retrieval, not an LLM call). Fully defensive: missing key /
  network error / bad response → empty grounding, pipeline runs unchanged.
- **`modules/shared/config.ts`** — new `tavily` block: `apiKey`, `enabled`
  master switch (`TAVILY_GROUNDING=off` to disable), `maxResults` (5),
  `searchDepth` (basic), `maxSnippetChars` (1200), endpoint. All env-tunable.
- **`modules/generate/index.ts`** — `generateThreadUpdate` (via
  `ThreadUpdateInput.grounding`) and `deepArticle` (new optional `grounding`
  arg) inject the grounding block into the prompt + add a `GROUNDING_RULE`
  sentence that treats web snippets as valid source under the same
  no-fabrication discipline. Output schema unchanged (citations go INTO the
  prompt, not into a new article field — keeps "no schema change").
- **`modules/pipeline/steps.ts`** — `generateStep` fetches Tavily grounding per
  deep topic before synthesis: the thread path uses `job.threadEntities`, the
  one-off `deepArticle` path uses `item.scan_meta.entities`. Guarded by
  `tavilyEnabled()`.
- **Tests:** 11 new pure-helper tests (`modules/tavily/tavily.test.ts`).
  Total 153 → **164**.

### Cost (measured today)
A clean single edition with Phase 5 is **~€0.07** (range €0.06–0.09): deep
research ~€0.035, daily-paper synthesis ~€0.030, scan/rank ~€0.015, summaries
~€0.005, **Tavily €0.00** (free dev tier, ~540/mo ≪ 1000 limit). Well under the
**€0.15** ceiling. Note: it now sits not far below the `zuinig` throttle (€0.09)
— watch this if we keep deepening articles. Two editions/day ≈ €0.14/day ≈ €4/mo.

## What's open

- **Surface the deep article on the dashboard.** Ripples currently render ONLY
  on the **krant** view (`/editie/[datum]/krant`, `EditieWeergave.tsx` →
  `Ripples` component, for deep-band items). The main dashboard
  (`/editie/[datum]`, `EditionScreen`/`EditionView`) renders **no ripples at
  all** — a deep article shows only its flattened summary there. Worth deciding
  whether the dashboard should preview ripples too.
- **Optional: surface source citations in the UI.** Tavily snippets currently
  ground the model invisibly. We could add the source links to the article
  output (would touch schema + UI — deferred to keep Phase 5 clean).
- **Jesse's edition** has 9/10 deep items with a lead (one came up empty during
  the earlier shared full run); only Siem's was rebuilt this session. Easy to
  top up with a `generate` re-run if wanted.
- **Daily Paper PRD** — finish it (paused mid-grilling).
- **Broader direction:** continue the block-slice re-architecture (Plan A).

## Known issues / things to keep in mind

- **Ripples only render on the krant view** — see "What's open". If ripples seem
  "missing", check you're on `/editie/<date>/krant` (and that the dev server is
  actually up — a down server serves stale browser cache).
- **Phase 5 knobs are env-tunable** — `TAVILY_GROUNDING` (on), `TAVILY_MAX_RESULTS`
  (5), `TAVILY_SEARCH_DEPTH` (basic), `TAVILY_SNIPPET_CHARS` (1200). The
  `TAVILY_API_KEY` lives in `.env.local` (gitignored; `.env*` is fully ignored,
  so `.env.example` is NOT tracked either — its Tavily placeholder is local only).
- **Phase 4 select/deep knobs** — `GENERATE_MAX_DEEP` (10), `GENERATE_DEEP_FLOOR`
  (0.35), `GENERATE_MAX_DEEP_PER_CAT` (2), `GENERATE_MAX_RIPPLES` (5),
  `SELECT_TOPIC_SUMMARY_FLOOR` (0.90). Phase C knobs unchanged (`SELECT_FRESH_POOL`
  400 / `_WINDOW_H` 48 / `_MAX_PER_CATEGORY` 24 / `_MAX_SUMMARIES` 6).
- **Budget guard is cumulative per edition per day.** Regenerating the same
  edition multiple times in a day stacks `usage_log` spend and trips the throttle
  (`zuinig` 0.09 → `minimaal` 0.1275 → `stop` 0.15); in `minimaal`/`stop`,
  `deepDivesPerSectie = 0` so deep articles silently stop being produced. This bit
  us this session (Siem's edition regressed to 2 ripples after 3× regen). To
  rebuild without throttle, run with `BUDGET_EDITION_EUR` raised on the command
  (env-only, not committed), or clear the day's `usage_log` rows for that edition.
- **Regenerating an edition:** today's `pipeline_steps` are all `done`, so a
  re-run does nothing. To force it, dedupe the requeue duplicates then reset the
  rows you want to `pending`: full rebuild = positions 22–27 (`select`→`finalize`,
  `select` wipes+reinserts `edition_items`; feedback lives in `topic_scores`, not
  lost); deep bodies only = null `summary_text`+`article` on the deep items and
  reset `generate`→down (positions 25–27). `claim_next_step` enforces position
  order, and steps run only when no earlier position is unfinished. Then run
  `npm run pipeline` (identical code to the `/api/pipeline/tick` endpoint).
- **xAI web search is via `/v1/responses`** (Agent Tools API), NOT
  chat/completions; legacy `search_parameters` Live Search is deprecated (410).
  We chose Tavily over this for Phase 5 (~5× cheaper). Kept for reference.
- **Pipeline runs are sleep-sensitive.** A live `npm run pipeline` aborts
  in-flight AI fetches if the laptop sleeps; the step machine's retries absorb it,
  but keep the machine awake.
- **`content` only flows forward** — items ingested before 27 Jun have
  `content = null`; full bodies appear only on newer items.
- **Dev server:** runs on `localhost:3000` (`npm run dev`). Siem checks localhost
  himself — don't screenshot (text-based curl/snapshot is fine for verification).
- **Throwaway dev scripts** (untracked, NOT committed): `scripts/verify-{threads,
  phase4,phase5,phase5a}.ts`, `scripts/regen-phase5.ts`, `scripts/backfill-threads.ts`.
  `.claude/` + `Morning Report design/` stay untracked; `CLAUDE.md` is gitignored.
- **403 feeds**, **Open-Meteo** flaky, **Postgres `current_date` is UTC** (use
  `todayLocal()`) — unchanged, non-blocking.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live
  + RLS (service-role only). Vercel auto-deploys on push to `main`.
