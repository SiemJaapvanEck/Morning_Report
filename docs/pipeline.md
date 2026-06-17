# Pipeline — step catalog

Every edition runs the same step machine. Steps are idempotent, finish in ~7 s,
and store intermediate results in `pipeline_steps.payload`. The final `finalize`
step assembles everything into `editions.front_page`.

---

## Tag taxonomy

Two axes: **what a step does** (purpose) and **how/where it stores its result** (storage).

### Purpose tags
| Tag | Meaning |
|---|---|
| `orchestration` | Creates or coordinates other steps |
| `ingest` | Pulls raw data from the outside world |
| `rank` | Scores and filters the candidate pool |
| `select` | Caps and locks the final item set for this edition |
| `deep` | LLM-intensive research or deep dive |
| `editorial` | Synthesis, narrative, and cross-referencing |
| `output` | Final assembly — nothing writes after this |

### Trigger tags
| Tag | Meaning |
|---|---|
| `daily` | Runs on every edition |
| `forced` | Always runs, even under tight budget — cannot be skipped |
| `conditional` | Skipped or reduced in `zuinig` / `stop` budget mode |
| `onboarding` | Runs once per account, not part of the daily pipeline |

### Storage tags
| Tag | Where the result lives |
|---|---|
| `→ pipeline-payload` | `pipeline_steps.payload` (intermediate; consumed by later steps) |
| `→ items-table` | `items` table (raw content, persists across editions) |
| `→ edition-items` | `edition_items` join table (selected pool for this edition) |
| `→ front-page` | `editions.front_page` JSON (final, served to the UI) |
| `→ usage-log` | `usage_log` table (token cost; every AI call via `askAI()`) |
| `← feedback-events` | Reads from `feedback_events` (user ratings, the "archive") |

---

## Pipeline flow

```
plan
 ├── weather
 ├── markten          ← forced: always present
 └── ingest (×N)     ← one per source batch, parallel

scan_rank (multi-round)
select
generate             ← reads ← feedback-events for personalization
daily_paper          ← reads ← generate + markten
finalize             → front-page
```

Separately, once per account:
```
onboarding           ← account creation trigger
```

---

## Step catalog

---

### `plan`
**Purpose:** `orchestration` · `daily`
**Storage:** `→ pipeline-payload`

Creates the full list of steps for this edition — inserts every subsequent step
row into `pipeline_steps` in the right order. Reads the profile and active
sources to decide which ingest batches to create.

Nothing else runs until `plan` is done.

---

### `weather`
**Purpose:** `ingest` · `daily`
**Storage:** `→ pipeline-payload` → `→ front-page`

Fetches current and short-term weather for the reader's location (Open-Meteo).
Result is a `WeatherSnapshot` stored in the step payload, later merged into
`front_page.weather` by `finalize`.

Flaky: retried up to 4 times on network error.

---

### `markten` *(current → continental ETFs: planned)*
**Purpose:** `ingest` · `daily` · `forced`
**Storage:** `→ pipeline-payload` → `→ front-page`

**Current:** fetches a generic market snapshot (AEX, S&P 500, etc.) as a
`MarktSnapshot`.

**Planned:** becomes a *forced* continental ETF step. Each major geographic
region (Europe, North America, Asia-Pacific, EM, …) always gets its ETF
performance fetched regardless of user preferences or budget mode. This powers
the map in the UI — tapping a region surfaces that region's stock-market news
and ETF performance. Forced because Siem always wants to know how a region is
doing financially when checking the map.

---

### `ingest`
**Purpose:** `ingest` · `daily`
**Storage:** `→ items-table`

Fetches raw items from one batch of sources (RSS, podcast, video). Multiple
`ingest` steps run in parallel, one per source batch, all created by `plan`.

Media feeds (podcasts, YouTube) are capped at the N newest episodes per feed
(`ingest.mediaMaxPerFeed = 3`) to prevent backcatalog floods — a single podcast
feed can have 500+ episodes, nearly all old.

Each item lands in the `items` table with a `content_hash` (title-based) and
source metadata. Items are shared across editions and profiles.

---

### `scan_rank`
**Purpose:** `rank` · `daily` · `conditional`
**Storage:** `→ items-table` · `→ pipeline-payload` · `→ usage-log`

Two-stage filter:

1. **Pre-rank (free, no LLM):** scores every candidate on
   `source_weight × recency × interest`. Candidates below the threshold are
   skipped entirely — they never get an LLM call. Followed topics always clear
   the threshold regardless of score.
2. **LLM scan:** the top batch is classified for topic relevance and assigned an
   `importance` score. Loops up to `scan.maxRounds`; each round re-queues itself.
   Items that never reach a scan keep `importance = null` and age out.

Cost dial: `batchSize × maxRounds`. Default caps at ~280 items/day on a busy news
day. All config in `modules/shared/config.ts`, env-overridable.

---

### `select`
**Purpose:** `select` · `daily`
**Storage:** `→ edition-items`

Picks the final item pool for this edition:

- Reads all scanned items ordered by `importance`.
- Deduplicates against the last 7 days of the reader's editions (exact
  `content_hash` match — near-duplicate clustering is an open improvement).
- Caps per section to avoid one topic dominating.
- Guarantees followed topics are represented even if their importance is lower.
- Writes the final set to `edition_items`.

Nothing after `select` touches the raw `items` table — everything downstream
works from `edition_items`.

---

### `generate`
**Purpose:** `deep` · `daily` · `conditional`
**Storage:** `→ pipeline-payload` · `→ usage-log` · `← feedback-events`

For each topic section in the selected pool:

1. **Summary:** a `Band.summary` pass over the section's items — concise,
   structured, uses the `scan` tier model.
2. **Deep dive:** a `Band.deep` pass on the most important story — the real
   research, uses the `deep` tier model.

**Planned personalization (the "archive" connection):** before generating the
deep dive, `generate` will query `feedback_events` for the user's recently
rated/liked stories (their archived perspective). These are passed as context
so the deep dive reflects the angles and framings the user has shown they care
about — not just what happened, but *why it matters to this specific reader*.

Budget mode controls depth: `deepDivesPerSectie = 0` in `stop` mode.

---

### `daily_paper`
**Purpose:** `editorial` · `daily` · `conditional`
**Storage:** `→ pipeline-payload` · `→ usage-log`

The editorial synthesis layer. Reads all `generate` results and produces the
Sol Daily Paper (DP).

**Current:** one neutral cross-reference synthesis ("De rode draad") — plain
prose covering only topics with real news that day, leading with followed topics,
drawing explicit cross-references. No personas.

**Planned restructure (Sol DP — four layers):**

| Layer | What it covers |
|---|---|
| **Region** | Per-continent narrative, anchored to the `markten` continental ETF data — how the news connects to the region's financial performance |
| **Topic** | Per-topic summary with cross-references between stories |
| **User source-topic** | Items from the reader's specific followed source + topic combinations (the most personal layer) |
| **News × stocks** | For each significant story: the stocks and ETFs it is likely to influence or that are relevant context |

The four layers compose into the full Daily Paper view on `/editie/[datum]/krant`.

---

### `finalize`
**Purpose:** `output` · `daily`
**Storage:** `→ front-page`

Assembles every step's payload into the final `editions.front_page` JSON and
marks the edition as `done`. Nothing writes to the edition after this.

The calendar-cover intro (the short lead shown on the edition tile) is derived
from the first sentence of the `daily_paper` step — no separate AI call.

---

## Onboarding pipeline *(planned)*

**Purpose:** `orchestration` · `onboarding` · `forced`
**Trigger:** account creation / first login
**Storage:** `profiles` table, `topic_follows`

One-time initialization for a new account. Not part of the daily step machine.

Establishes the reader's profile: interest areas, followed topics, geographic
region (for the map / continental ETFs), and preferred source types. Optionally
generates an "introduction edition" — a seed edition that orients the reader
before their first live morning report arrives.

This is the **introduction** node in the pipeline drawing: a separate input
that only runs once, not a daily feed.

---

## The archive as a personalization signal

`feedback_events` stores per-item ratings (1–5) and implicit signals (views,
shares). This is the "archive" in the pipeline drawing.

It feeds into the pipeline at two points:

| Where | How |
|---|---|
| `scan_rank` (pre-rank) | Items from sources and topics the reader has historically rated highly get a boosted `interest` weight — they clear the pre-rank threshold more easily |
| `generate` (deep dive) | Liked and rated stories from the past N days are passed as context to the deep-dive prompt, framing the research around the reader's established perspective |

The archive does **not** re-surface old stories (that is `dedupeForEdition`'s
job). It shapes the *angle* of new research, not the item selection.
