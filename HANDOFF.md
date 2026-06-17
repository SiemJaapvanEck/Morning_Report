# HANDOFF — current state

> Last updated: 17 June 2026, session on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

We started the **News Threads** feature — the biggest design shift since the
persona removal. The goal: make the morning report **build forth on itself**.
Instead of a fresh, independent edition each day, the report becomes a set of
**persistent storylines (threads)** per profile that accumulate state across
editions; each morning the pipeline finds what's genuinely new, attaches it to
the right thread, and writes an **update that builds on yesterday's stored state**
rather than a from-scratch article. This is the concrete realization of the
design doc's cross-reference axis B.

The full design + the **sprint board** live in **`docs/threads-plan.md`** (in the
repo, so any session/account can resume). We work it **one phase per sprint:
implement a phase, pass the gate, then PAUSE for Siem's review before the next**
(scrum cadence — Siem's explicit request). A new session should run `/start`, open
`docs/threads-plan.md`, find the first unchecked box, and do exactly that phase.

**Phases 0 and 1 are done and green** (lint/tsc/74 tests/build). Not yet committed
when this session began; this push lands them. The running pipeline is **unchanged**
— threads exist in the DB and the matching logic is tested, but nothing reads or
writes them until Phase 3.

### Phase 0 — Budget cap + scan reclaim (done)
- `modules/shared/config.ts`: `budget.editionCeilingEur` **0.30 → 0.10** (hard cap,
  aim lower; env `BUDGET_EDITION_EUR`). `scan.maxRounds` **7 → 4** (40×4 = 160 items
  ≈ €0.03 vs ~€0.05) to reclaim budget for thread-aware deep research. `batchSize`/
  `candidatePool` stay env-overridable.
- `budget.test.ts` already passes explicit ceilings → untouched, still green.

### Phase 1 — Schema + pure `modules/threads` (done)
- **Migration `0008_threads.sql` applied to the live Supabase** (`iqhyndhrlhjfdrwjvmjv`):
  tables `threads` (profile_id, topic_id, category_id, title, **state**, **entities[]**,
  status active|dormant|closed, last_edition_id, last_seen_at) and `thread_items`
  (thread_id, item_id, edition_id, **unique(thread_id,item_id)** — the idempotency
  backbone). RLS enabled, no policies (matches 0003). The local SQL file matches.
- `modules/shared/types.ts`: added `Thread`, `ThreadItem`, `ThreadStatus`, `DestepLens`,
  `DailyPaperArticle`; `FrontPage` gained `dp_summary?`, `dp_intro?`, `dp_articles?`.
- **New pure `modules/threads/index.ts`**: `normalizeEntity`, `entityOverlap`,
  `matchThread` (free entity-overlap, same-topic tiebreak), `computeDelta`,
  `mergeEntities`, `selectLenses` (relevant DESTEP lenses only), `orderThreads`.
- **`modules/threads/threads.test.ts`**: 22 tests, all green.

### Also this session
- `docs/pipeline.md` — new step-catalog doc (purpose/trigger/storage tags per step,
  plus the planned threads/forced-search/onboarding additions).
- `docs/threads-plan.md` — the phased plan + sprint board (source of truth for the build).

## Decisions made this session
- **News must build on itself → threads**, not per-day articles (Siem's framing).
- **Forced context = user-preference-driven daily search** (active, guaranteed into
  the edition), not just passive reweighting — distinct from the broad firehose scan.
- **Daily Paper** = Summary (also front-page block) + Introduction + body (a deep
  article per *followed* topic = a thread update, **relevant DESTEP lenses only**,
  archive-primed, stock-impact-tied) + **one broad-but-shallow general article**.
- **Images** reused from source articles (og:image / feed thumbnail — already captured
  by `extractImage`/`ingestSource`; only an og:image fallback remains, Phase 6).
- **Hard budget cap €0.10/edition** (aim lower), funded by tightening the broad scan.
- **Sprint cadence**: one phase per session, pause after each for review.

## What's open
1. **Phase 2 (next sprint)** — entity extraction piggybacked on the existing
   `scanBatch` LLM call → `items.scan_meta.entities` (no new call). See plan.
2. **Phases 3–6** — threads step (match+link, no AI) → thread-aware generation +
   DESTEP → Daily Paper assembly + UI (first localhost-visible change) → optional
   og:image fallback + embeddings. All detailed in `docs/threads-plan.md`.
3. **Carried over, still valid**: near-duplicate cross-source clustering in `select`
   (Phase 3's delta + matching largely subsumes this); 2099 test fixtures in the DB
   (safe to delete); design coordination with the colleague (Atlas vs. Dispatch);
   retro-translation of remaining Dutch comments; confirm the cron-job.org job runs.

## Known issues / things to keep in mind
- **`.claude/` tooling + `Morning Report design/` stay untracked** (deliberately
  local, per-account, like `launch.json`). This session did NOT commit them.
- **`CLAUDE.md` is gitignored** (per-contributor workflow file) — each contributor
  keeps their own local copy.
- **Existing editions** keep their old step list; the threads step only appears in
  plans created after Phase 3 lands.
- **403 feeds** (Reddit, BleepingComputer), **Open-Meteo** flaky (4 retries),
  **Postgres `current_date` is UTC** (edition dates via `todayLocal()`,
  Europe/Amsterdam) — unchanged, non-blocking.
- **Git auth**: OAuth token (SiemJaapvanEck) in the macOS keychain; `git push/pull`
  works. `gh auth status` says "not logged in" (token lacks read:org) — expected.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live + RLS
  (service-role only). Vercel auto-deploys on push to `main`.
