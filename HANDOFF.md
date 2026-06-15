# HANDOFF — current state

> Last updated: 15 June 2026, session on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

The pipeline is **cost-optimised** and the **editorial layer is now persona-free**.
A full edition dropped from **~€0.156 to ~€0.077** (measured live on today's edition),
while keeping deep research and *adding* real cross-referencing. The "Daily Paper"
+ five editor personas + Sol's character are gone, replaced by **one neutral,
topic-driven cross-reference synthesis ("De rode draad")**. All gates green
(lint/tsc/52 tests/build) and pushed to `main`.

This session had three threads: the working-language flip, the scan-cost lever
(A), and the persona removal (B).

### Working language → English (dev-facing)
- All code, comments, commits, docs, the `.claude/` skills, `HANDOFF.md`/`TIJDLIJN.md`
  and conversation are now **English**. Rewrote `CLAUDE.md` and the `/start` +
  `/push-main` skills accordingly. `AGENTS.md` was already English.
- **The product stays Dutch for now** (separate decision, not yet made): the app's
  user-facing UI copy and the synthesis prompt (in `modules/redactie/index.ts`,
  which generates Dutch output).
- **`CLAUDE.md` is now gitignored** and removed from the repo — it is a personal,
  per-contributor workflow file (Siem keeps his, a colleague keeps theirs). See
  Known issues for the pull-side consequence.

### Lever A — scan cost (the real driver, not the redaction)
`scan_rank` was ~76% of an edition's cost: pure volume from the 71-source scale-up
+ the 6→12 round cap (~600 items LLM-classified/day), and ~78% of scanned items
never reach an edition. On Grok the scan and deep models cost the same, so the
tier split saves nothing — only volume matters.
- **Pre-scan gate** (`modules/rank/index.ts`): `preRankScore` ranks candidates by
  `source_weight × recency × interest` with **no LLM**; `selectForScan` keeps the
  ones clearing a threshold, **always including the reader's followed topics**.
  `scanRankStep` LLM-scans only the top batch per round; skipped items keep
  `importance = null` and age out. Pure functions, unit-tested.
- **Cost dial** = `batchSize × maxRounds` (the round cap is what bites, since the
  threshold barely binds on fresh news). Config in `modules/shared/config.ts`
  (`scan.batchSize=40`, `preRankThreshold=0.5`, `maxRounds=7`, `candidatePool=800`),
  all env-overridable. Default ≈ 280 items/busy-day.
- **Media intake cap** (`modules/ingest/index.ts`): newest N per podcast/video feed
  (`ingest.mediaMaxPerFeed=3`) — stops backcatalog floods (Lex Fridman alone had
  498 episodes, 403 of them LLM-scanned).
- **Verified live** (15 June, both profiles, a busy day): 717 candidates → top **280
  scanned** (cap engaged) → scan_rank **€0.047–0.051** (was ~€0.119). Edition data
  **100% same-day**, followed topics covered.

### Lever B — editorial layer without personas
Per Siem: remove the personalities; what matters is cross-referencing + deep research.
- **Removed** the 5 desk-editor personas and Sol's character voice. Deleted all six
  prompt files (`modules/redactie/prompts/*`, `modules/sol/prompts/karakter.md`).
  `modules/sol` is now just `loadMemory` (kept for the future cross-ref axis B).
- **Replaced** the `desks` + `sol_daily_paper` + `sol_intro` steps (7 persona calls)
  with **one `daily_paper` step**. `writeDailyDigest` (`modules/redactie/index.ts`)
  produces a neutral, plain-prose synthesis that covers **only the topics with news
  that day**, **leads with the reader's followed topics**, and draws explicit
  cross-references. `orderDigestTopics` is pure + unit-tested.
- **Kept** deep research (`generate` deep-dives) untouched — that is the substance.
- `FrontPage.desks` dropped; `front_page.intro` (the calendar-cover lead) is now
  **derived from the digest's first sentence** — no separate intro call. `finalize`
  hardened to read the latest done `daily_paper` step.
- **UI** (`EditieWeergave.tsx`): the Sol-branded "Daily Paper" block + desk grid is
  now a neutral "De rode draad" section (no avatar, no persona).
- **Verified live**: real topic-driven synthesis with explicit cross-references,
  flags topics with no real news, **€0.002/edition**, renders cleanly, no console
  errors.
- New pipeline order: `… generate → daily_paper → finalize`.

### Unchanged, still valid
- **AI provider = Grok (xAI)** via `modules/shared/ai.ts` (`askAI()`): `grok-4.20…`
  (scan) + `grok-4.3` (deep). Anthropic switchable (`AI_PROVIDER=anthropic`).
- **Supabase live + RLS**: project "Morning Report." (`iqhyndhrlhjfdrwjvmjv`,
  eu-west-1), service-role only.
- **Vercel**: auto-deploy on every push to `main`.
- Account prefs/onboarding, developer mode + themes, weather + markets map: unchanged.

## What's open
1. **Near-duplicate cross-source stories** cluster in sections (today's Tech had ~6
   versions of the UK under-16 social-media ban). `content_hash` is exact-title only,
   so cross-source near-dups slip through `dedupeForEdition`. A background task chip
   was spawned for this (cheap normalized-title/token-overlap clustering in `select`).
2. **2099 test fixtures** still in the DB (`2099-01-01/02`) — isolated from real
   editions, safe to delete.
3. **Rest of the master plan**: cross-ref axis B (earlier news → "reference") and C
   (portfolio hook), deep-research 6–12 topics, select-caps → ~160 visible items,
   budget tuning.
4. **Design direction with the colleague** (Atlas vs. the in-history Dispatch
   `f0ed210`) — still to coordinate; unchanged this session.
5. **Retro-translation** of the remaining Dutch code comments + docs to English
   (do it opportunistically when touching a file).
6. Confirm the cron-job.org job actually runs (`docs/setup.md` §4).

## Known issues / things to keep in mind
- **`CLAUDE.md` removal will hit the colleague on pull.** It is now gitignored and
  deleted from the repo; when this push lands, their next pull removes their tracked
  copy. Coordinate (each contributor keeps a local `CLAUDE.md`).
- **`.claude/` tooling untracked** (`push-main`/`start` skills, `guard-push-main`
  hook, `settings.json`) — deliberately local, like `launch.json`. Commit them only
  if you want to share between accounts.
- **Editions planned before this push** keep their old step list (no `daily_paper`
  step). New editions get the new plan. Today's two editions were re-finalised
  manually to carry the new digest.
- **403 feeds** (Reddit subreddits, BleepingComputer), **Open-Meteo** flaky (4
  retries), **Postgres `current_date` is UTC** (edition dates via `todayLocal()`,
  Europe/Amsterdam) — all unchanged, non-blocking.
- **Git auth**: OAuth token (SiemJaapvanEck) in the macOS keychain; `git push/pull`
  works. `gh auth status` says "not logged in" (token lacks read:org) — expected.
