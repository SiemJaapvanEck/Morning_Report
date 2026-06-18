# HANDOFF — current state

> Last updated: 18 June 2026, session on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

We are building **News Threads** — making the morning report **build forth on
itself**: persistent storylines (threads) per profile that accumulate state
across editions. Each morning the pipeline finds what's new, attaches it to the
right thread, and writes an **update that builds on yesterday's stored state**.

Plan + sprint board: **`docs/threads-plan.md`**. We work **one phase per sprint,
pausing for Siem's review after each**. **Phases 0–4 are done and green**
(lint/tsc/89 tests/build). **Phase 5 is next, and Siem split it into 5a + 5b.**

The pipeline now: scan → select → **threads (match/link)** → **generate
(thread-aware)** → daily_paper (still the old "rode draad") → finalize. Threads
are populated and thread updates are written to deep items, but **nothing is
reader-visible yet** — that's Phase 5b.

### Phases 0–2 (in `main`)
- **0** budget cap €0.10 + scan reclaim. **1** `threads`/`thread_items` schema +
  pure `modules/threads`. **2** entity extraction on the scan call
  (`scan_meta.entities`, display form, `dedupeEntities`).

### Phase 3 — `threads` pipeline step (this session)
- New `threads` step in `planStep` **after `select`, before `generate`**;
  registered in `stepRegistry`. **No AI.**
- `modules/threads/index.ts`: `clusterByEntities` (connected-component
  cross-source clustering) + **`planThreadActions`** (the pure decision) + DB
  helpers (`loadActiveThreads`, `loadLinkedItemIds`, `loadEditionCandidates`,
  `insertThread`, `linkThreadItems`, `touchThread`).
- **Thread-creation gate (Siem's decision):** linking is universal (any item
  overlapping an active thread joins it); a NEW thread is born only for **(a) a
  followed item that is ALSO `deep` band** ("followed + significant"), or **(b) a
  big cross-source cluster** (≥ `bigTopicMinCluster=5` items). This replaced the
  first cut ("every followed item"), which exploded to 52 threads because Siem
  follows ~all 25 topics. Manual selection (trigger 3) is deferred to the UI;
  note `follow_marks` already supports `target_type='item'`.
- **Idempotency:** `planThreadActions` runs to a **fixed point** — attaching an
  item grows a thread's entity set, so a straggler that only matches after that
  growth is pulled in *this* run; a re-run then links nothing. Verified: 54
  items → 9 threads, re-run identical (was non-idempotent before the fix).
- Config: `threads.matchMinOverlap=0.34`, `bigTopicMinOverlap=0.3`,
  `bigTopicMinCluster=5` (all env-overridable).

### Phase 4 — thread-aware generation (this session)
- `modules/generate/index.ts`: **`generateThreadUpdate`** — `deep`-tier
  `askAIJson`, budget-gated like `deepDive`, returns `{headline, body, newState,
  lenses}`. Dutch prompt: builds an UPDATE on the stored `state`, uses only the
  given DESTEP lenses, ties to market impact.
- `modules/archive/index.ts`: **`archivePrimer`** — titles the reader rated ≥4
  in the thread's topic/category (reader perspective). One query pair, no AI.
- `modules/threads/index.ts`: `nextThreadUpdateJob` (one pending thread per call)
  + `applyThreadUpdate` (body → deep items, `state`/`title` → thread).
- `generateStep` rewritten: **one work-unit per tick** — a pending thread update
  first (one per thread; its deep items excluded from the normal deep-dive
  branch), else one section summary/deep-dive. Requeue while work remains.
- **Per-thread, not per-item:** a thread = one article. Non-thread deep items
  keep `deepDive`.
- **Deviation from the written plan:** dropped `computeDelta`/`delta` — because
  `thread_items` is `unique(thread_id,item_id)`, today's links are always
  genuinely new, so the delta was a no-op. "Build on state" comes from the stored
  `state` + today's items.
- Verified live (June 17, 9 threads): 9 updates, all 9 threads got coherent
  `state` + rewritten headline + body with the right lens, **idempotent**,
  **€0.013** for all 9.

## What's open
1. **Phase 5a (next sprint)** — Daily Paper assembly, **backend only**: extend
   `writeDailyDigest` (`modules/redactie`) to return structured `{summary, intro,
   generalArticle}`; `dailyPaperStep` consumes the thread updates (deep items ⋈
   threads); `finalizeStep` writes `dp_summary/dp_intro/dp_articles` into
   `front_page`. Verifiable via the DB. No UI.
2. **Phase 5b** — the UI: `EditieWeergave` renders Summary → Introduction →
   per-thread articles (lens tags, followed first); `EditionView` front-page DP
   block. Fallback to old `daily_paper`. **First localhost-visible change.**
3. **Phase 6** — optional og:image fallback + embeddings.
4. **Carried over:** 2099 test fixtures in the DB (safe to delete); design
   coordination with the colleague; retro-translation of remaining Dutch comments.

## Known issues / things to keep in mind
- **Throwaway verify scripts** `scripts/verify-threads.ts` + `verify-phase4.ts`
  are **untracked dev tools** (hardcoded Siem profile + edition date). NOT
  committed; keep locally or delete.
- **Verification mutated June 17 data:** Siem's profile has 9 real threads with
  `state`/`title`/bodies, and June 17's thread-linked deep items now show the
  thread-update prose. Correct demonstration data; it's what the next edition
  builds on.
- **Morning cron makes EMPTY editions:** the 03:02 UTC cron creates today's
  edition shell with 0 AI calls (fires before ingest populates feeds). Today's
  June 18 edition is empty — pre-existing, worth a look when revisiting cron.
- **Niche topics won't surface news until forced-search lands** (`query_mode`
  read by nothing yet). The 4 followed niche topics (Tuinieren/Plantenindustrie/
  Landbouw/Tibet) are live in the DB.
- **Existing editions** keep their old step list; the `threads` step only appears
  in plans created after Phase 3 landed.
- **`.claude/` + `Morning Report design/` stay untracked**; **`CLAUDE.md` is
  gitignored** (per-contributor).
- **403 feeds** (Reddit, BleepingComputer), **Open-Meteo** flaky, **Postgres
  `current_date` is UTC** (use `todayLocal()`) — unchanged, non-blocking.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live
  + RLS (service-role only). Vercel auto-deploys on push to `main`.
