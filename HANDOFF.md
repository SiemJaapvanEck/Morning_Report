# HANDOFF — current state

> Last updated: 19 June 2026, session on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

**Investment & Foresight Phase B — auto-scheduled agenda — is done and in
`main`.** The `calendar_events` table (previously empty + unused) is now filled
automatically: the scan extracts explicitly-dated forward events from article
text, and a new `agenda` pipeline step persists them per-profile, linked to the
source item and its thread. **Everything is green** (lint/tsc/**108 tests**/build).

**Phase A (finance section + RSS seed) was deliberately skipped** at Siem's
request — we jumped straight to B. A is **not abandoned**, just deferred; pick it
up when the finance section is wanted. (Note: the custom-RSS UI from the previous
session is the natural feeder for A.)

Pipeline: scan **(+ event extraction)** → select → **threads** → **agenda
(new)** → **generate (thread-aware)** → **daily_paper** → finalize.

### Phase B — auto-scheduled agenda, grounded in sources (this session, landed)

Populate the agenda from real article text, source-grounded — no free-floating
guesses. Four pieces:

- **Migration `0011_calendar_event_links`** (applied to live DB): adds
  `profile_id` (fk profiles, cascade), `item_id` (fk items), `thread_id`
  (fk threads) to `calendar_events`, + indexes `(profile_id, date)` and
  `(item_id)`. Idempotency lives in the step, so no DB unique constraint.
- **Scan extraction** (`modules/rank`): the cheap batch scan call now also
  returns `events[]` per item — **only** when the text states an explicit forward
  date ("IPO op 1 juli", "verkiezingen 5 nov", "Q3" → first day of quarter).
  Each event: `title`, `date` (YYYY-MM-DD), `kind`, `certainty`. No date ⇒ `[]`,
  never invent one. No extra AI call (piggybacks scan); `maxTokens` 3000→3500.
  Stashed in `items.scan_meta.events`. New `ExtractedEvent` type.
- **New `agenda` step** (`modules/pipeline/steps.ts`): runs **after `threads`**
  so an event inherits its source item's `thread_id`. Scopes to
  **followed-or-threaded items only**, validates hard (real future date, known
  kind/certainty, non-empty title — a cheap-model hallucination never lands),
  dedupes on `(date, lower title)`, persists per-profile. Idempotent via
  delete-by-`item_id` + re-insert.
- **Pure core** (`modules/calendar`): `buildAgendaRows` + `isValidIsoDate` +
  `CALENDAR_KINDS`/`CALENDAR_CERTAINTIES` constants + `persistAgendaRows`.
  8 new tests (100 → 108). `modules/calendar` was dead code before this.

**Scope decisions locked with Siem this session:** events populate
**followed/threaded items only** (extraction runs on all scanned items but only
in-scope items are persisted); landed the **full phase in one go**; committed on
the **green gate** (no live pipeline tick — Phase B has no browser-observable
surface yet, the agenda/graph UI is a later phase).

**Not yet verified end-to-end against live data** — the next real edition run is
the first true test. Validation is strict, so a bad extraction is dropped, not
persisted, but watch the first `agenda` step's `{ events, kandidaatItems }`
result.

### Track-as-thread + custom RSS source (this session, landed)

A feature that was built but had never been committed or recorded — picked up,
verified green, and committed this session. Two related additions:

- **Per-profile "track as thread" selection.** Migration `0010_thread_tracking`
  (already applied to the live DB) adds a `thread_tracking` table (presence of a
  row = tracked; toggle off deletes it; RLS on, service-role only). The catalog
  stays global — only the *selection* is per-profile, sitting alongside
  `follow_marks`/`topic_scores`. `applyThreadTracking()` in `modules/preferences`
  does a diff-based replace. `assembleUserContext` now loads `trackedTopicIds`,
  threaded through `threadsStep` into `planThreadActions`, which gains a third
  thread-birth reason **`"tracked"`**: a tracked topic opens/joins a thread for
  *any* of its items (no `deep`, no separate follow required) — the explicit,
  stronger signal. UI: a "✦ Verhaallijn" toggle next to a followed topic's
  relevance picker in `VoorkeurenKiezer`; only followed topics can be tracked.
- **Add-your-own RSS source.** `createUserSource()` + `validateFeedUrl()` in
  `modules/preferences` actually fetch/parse the feed (same path as ingestion)
  before inserting; idempotent on `url`. New `POST /api/bronnen` (profile-cookie
  auth). UI: a collapsible "Feed niet in de lijst?" form in `VoorkeurenKiezer`
  that validates and auto-selects the new feed. `isHttpUrl()` pure helper.
- Tests: +2 `planThreadActions` (tracked opens a thread without deep/follow) and
  +1 `isHttpUrl` (96 → 100). Verified green and smoke-tested on localhost.

### Done & in `main`
- **0–4**: budget cap; threads schema + pure module; entity extraction;
  `threads` step (match/link, gate = followed+`deep` OR big cluster ≥5);
  `generateThreadUpdate` (deep, builds on stored `state`).
- **5a/5b**: Daily Paper assembly (`composeDailyPaper` → `dp_*` in `front_page`)
  + UI (krant page renders Summary→Intro→article cards; front block = `dp_summary`).
- **5c-1**: migration `0009` adds `threads.parent_thread_id` + `anchor_entity`;
  mega-thread anchoring in `threadsStep`. Verified: Iran (5 children) + SpaceX (3).
- **5c-2**: front-page Archive/Storylines tile + `/archive` page (per-mega
  `ThreadTimeline` cards — now superseded by 5c-3).
- **5c-3 — Archive rework (this session):**
  - New **`StorylineChart`** component (`app/components/StorylineChart.tsx`):
    one full-width multi-line SVG chart, one line per mega-thread, X = date,
    Y = daily news volume on a shared scale. Lines colored by primary DESTEP
    sector (politiek=red, economisch=amber, technologisch=violet, sociaal=fuchsia,
    ecologisch=green, demografisch=cyan). Sector legend + storyline chips above
    the chart. Active line's child-story dots are sector-colored (hollow = selected,
    filled = unselected); inactive lines show small sector-colored dots at
    child-story positions — clicking any dot instantly selects that mega AND that
    article (no line-first required). Page doesn't scroll on dot selection
    (`overflow-anchor: none`).
  - **Article panel** (no more small per-storyline timeline): just the article,
    underneath the full-width chart, at `lg:col-span-7` — pixel-identical to the
    Daily Paper hero block on the dashboard.
  - **Lens accuracy fixed**: `getThreadArchive` now joins `topics` + `categories`
    so `selectLenses` gets real topic name + category slug context (not bare
    entities). Fed story now correctly labels "ECONOMISCH" instead of "SOCIAAL".
  - **`dominantLens()`** pure helper in `modules/threads/index.ts` — mode of
    each child's primary lens, tie-broken by LENS_ORDER. 3 new tests (96 total).
  - **`getThreadArchive`** extended: `ArchiveMega` gains `primarySector: DestepLens`;
    `dominantLens` + `DestepLens` exported and used.
  - `/archive` is now full-width (no `max-w-3xl` wrapper).
  - `ThreadTimeline` still exists for future Daily Paper reuse; no longer used
    directly on `/archive`.

## What's open

### NEXT BUILD — "Investment & Foresight" (approved 18 June 2026)

Siem's new roadmap, replacing the old Phase 6. One coherent loop:
**finance sources → threads → a source-grounded, confidence-tagged prediction
with a target date → that date becomes an agenda event → a dotted line on that
thread's graph reaches toward it.**

Cadence: **one phase per sprint, pause for review after each.** Progress so far:
**Phase A skipped (deferred, not abandoned)**, **Phase B done (this session)**.
**Next up is Phase C** (per-thread prediction) — it builds directly on the agenda
that B now fills.

Decisions already locked with Siem:
- Investment section = a **block inside the Daily Paper** (krant page), not a
  separate page.
- The new **standard Daily Paper layout gives each topic/thread its own graph**
  inline with its article (single 52-week line + dotted projection) — not one
  shared multi-line chart. The existing `/archive` multi-line chart still
  rebins to 52 weeks (shared component).
- Finance sources = **free RSS only**, curated (propose the feed list for
  Siem's approval before seeding).
- Predictions = **labeled + confidence-tagged**, and **grounded in actual
  sources** — no free-floating AI guesses; strict schema (no source basis ⇒ no
  prediction).

**Phase A — Investment section in the Daily Paper. [SKIPPED — deferred.]** A real
finance block, fed by in-depth free RSS. Skipped at Siem's request on 19 June to
go straight to B; pick this up when the finance section is wanted.
- Migration (seed): a `Beleggen` category + curated free finance RSS feeds
  (M&A, CEO changes, mergers/new BVs, IPOs, markets) into `sources`. They flow
  through the existing scan → select → threads pipeline untouched.
- `composeDailyPaper` (`modules/redactie`) groups finance-category threads into
  a dedicated investment block (`dp_investment` on `front_page`).
- New investment block on the krant page (`EditieWeergave.tsx`), Atlas styling
  (amber/emerald markets accents).
- Touches: migration, `modules/redactie`, `modules/shared/types.ts`, krant UI.

**Phase B — Auto-scheduled agenda, grounded in sources. [DONE — this session.]**
See "Where we stand" above for the full landing notes. Summary: scan extracts
explicitly-dated forward events; new `agenda` step persists them per-profile,
linked to source item + thread; followed/threaded scope; strict validation;
migration `0011`; +8 tests.

**Phase C — Per-thread prediction piece, source-grounded. [NEXT.]** Every
threaded topic gets a short, confidence-tagged prediction.
- Extend `generateThreadUpdate` output schema with `prediction`
  { text, target_date, confidence, source_basis }. The prompt already gets the
  thread's new items (titles/summaries/URLs); instruct it to predict **only**
  from those + scheduled events, and to name its basis. No basis ⇒ no
  prediction.
- One prediction → one linked `calendar_event` (certainty = confidence). Stored
  on the `DailyPaperArticle`.
- Touches: `modules/generate`, `modules/threads`, types.

**Phase D — 52-week graphs + dotted prediction line.** The new standard layout:
a per-topic graph under each Daily Paper article.
- Rebin `StorylineChart` to **weekly / fixed 52-week X-axis**; add a
  **single-line per-thread mode** for the Daily Paper.
- Dotted projection from the last real week to the prediction's target week;
  dash density encodes confidence (`bevestigd`→tight, `verwacht`→dashed,
  `gerucht`→sparse + faded).
- Rebin the existing `/archive` multi-line chart to 52 weeks too (shared
  component). New per-thread weekly query alongside `getThreadArchive`.
- Touches: `StorylineChart.tsx`, `app/lib/queries.ts`, krant UI,
  `modules/threads`.

Risks to keep in mind: free-RSS depth for M&A/CEO detail varies (propose feeds
first); prediction discipline is a prompt-engineering job (keep schema strict);
a young 52-week line looks sparse until history accrues (acceptable).

### Later / carried over
- **og:image fallback + embeddings** — deferred from the old Phase 6, optional.
- **Broaden the mega net (deferred):** anchor matching is exact-entity (`iran`);
  war elements tagged only "Netanyahu/Hezbollah" aren't pulled in. Looser
  association (co-occurrence/semantic) is a future enhancement.
- **2099 test fixtures** — safe to delete.
- **Colleague design coordination** (Atlas vs. Dispatch resolved on Siem's side;
  collega-side still open).
- **Dutch→English comment retro-translation** — do opportunistically.

## Known issues / things to keep in mind
- **Throwaway dev scripts** (untracked, NOT committed): `scripts/verify-{threads,
  phase4,phase5a}.ts` and `scripts/backfill-threads.ts` (hardcoded Siem profile +
  June dates).
- **Demo data mutated:** Siem's profile has real mega-threads (Iran/SpaceX) and
  June 13–17 editions are entity'd + threaded.
- **English UI exception:** the archive uses English labels ("Archive",
  "Storylines") at Siem's request — deliberate exception to CLAUDE.md "UI copy
  stays Dutch". The nav's Dutch "Archief" (calendar) stays.
- **Existing editions** keep their old step list; threads/daily-paper/mega
  changes only apply going forward. Old editions fall back gracefully.
- **`.claude/` + `Morning Report design/` untracked**; **`CLAUDE.md` gitignored**.
- **403 feeds**, **Open-Meteo** flaky, **Postgres `current_date` is UTC** (use
  `todayLocal()`) — unchanged, non-blocking.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live
  + RLS (service-role only). Vercel auto-deploys on push to `main`.
