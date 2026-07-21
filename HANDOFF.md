# HANDOFF — MOR-12: research note → seeded, auto-updated followed thread

> **Last updated:** 22 July 2026 — dispatched session, branch
> `MOR-12-seed-track-thread-2026-07-22`. Gate green, pushed, PR open.
> `needs-siem` (live askAI + DB writes + a pipeline run) — not merged.

## Where we stand

`main` carries Wave 1 (finance + research foundations, migrations `0019` +
`0020` applied) and Wave 2's finance UI (MOR-6/7) + settings shell (MOR-15).
Research Tracking's Phase 1 (schema) and Phase 2 (pure extraction +
`extractResearch`) were already `Done` on `main` before this session. This
session built **Phase 3 — seed & track**: creating a research note now spawns
a followed thread that the existing pipeline matches news to and updates.

## This session (MOR-12)

- **`modules/research/index.ts`** gained a DB-helpers section (Phase 2's pure
  extraction is untouched above it):
  - `createResearch({ profileId, title, body })` — the full create path:
    `extractResearch` → resolve `category_id` from the extracted slug →
    insert `user_research` → `seedResearchThread`. Returns the note with its
    `thread_id`/`status` set.
  - `seedResearchThread(...)` — opens a thread via `modules/threads`'
    `insertThread` (reused wholesale, **no parallel matcher**), anchored on
    the first extracted entity, `title` = the research note's own title
    (locked decision — not the AI `topicLabel`), `entities` = extracted,
    `status: "active"`; upserts a `follow_marks` row (`target_type: "thread"`,
    `active: true`); writes `user_research.thread_id` + `status: "gevolgd"`.
  - `isResearchOriginThread(threadId)` — the sole "is this a research thread"
    signal, a read of `user_research.thread_id` (no `threads`-schema change,
    per the locked decision). Used only for framing (below), never matching.
- **`app/api/research/route.ts`** (new file) — `POST` create path only,
  cookie-gated (401 without `mr_profile`), same pattern as
  `app/api/holdings/route.ts`. `GET`/`PATCH`/`DELETE` are Phase 4
  (MijnOnderzoek, MOR-13) — not built here.
- **`modules/generate/index.ts`** — `researchOriginFraming(isResearchOrigin,
  isFirstUpdate)`, a pure helper mirroring `storylineFraming`: when a thread
  originated from research (`isResearchOrigin`) AND this is its first update
  (`thread.state == null` — the same signal the prompt already uses for "new
  story"), it prepends a one-line frame so the update opens with a reference
  to the reader's own research ("sinds jouw onderzoek…") instead of a cold
  restart. `""` in every other case, including every update after the first.
  Wired into `generateThreadUpdate`'s prompt assembly. Unit-tested
  (`generate.test.ts`, 4 new cases).
- **`modules/pipeline/steps.ts`** — the one hook: `generateStep` now calls
  `isResearchOriginThread(job.threadId)` before `generateThreadUpdate` and
  passes it through as `researchOrigin`. `threadsStep` (matching) is
  **completely untouched** — a research thread is matched exactly like any
  other followed thread, per the PRD's locked decision.
- Gate green: lint clean, `tsc --noEmit` clean, **416/416 tests pass** (+4
  new for `researchOriginFraming`), `next build` compiles
  `/api/research` alongside the existing routes.
- Two commits: `a57fc0f` (seed + create API), `408517a` (framing + pipeline
  hook).

## What's open / next

- **Live verification (Siem, `needs-siem`)**: this issue's acceptance
  criteria require a real `askAI` call, real DB writes, and a live pipeline
  run to confirm — (1) POSTing a research note actually opens a thread +
  `follow_marks` row and links back onto `user_research`; (2) that thread
  participates in a real `threadsStep` run (entity overlap) and picks up a
  `generateThreadUpdate`; (3) its first update in the krant/archive genuinely
  reads with the "sinds jouw onderzoek" opening. None of this is
  gate-checkable — no live DB, no paid pipeline in this session (rails).
- **MOR-13** — "Mijn onderzoek" management component + API (`GET`/`PATCH`/
  `DELETE` on `app/api/research/route.ts`, `app/components/MijnOnderzoek.tsx`,
  `getResearch` in `app/lib/queries.ts`). Parallelizable with this phase;
  now unblocked to build against the same `createResearch` path.
- **MOR-14** — surface research-origin storylines in the report/archive
  ("Uit jouw onderzoek" label). Depends on this phase; unblocked now.
- Other Wave-2 backlog unchanged: **MOR-8/MOR-9** (finance goals + dashboard
  tiles), **MOR-16/17/18** (settings-shell convergence for
  pipeline-rapport/financiën/account tabs).

## Known issues / gotchas

- `seedResearchThread` anchors on `entities[0]` (extraction/scan salience
  order) with no registry-aware umbrella preference (unlike
  `modules/threads`' `primaryEntity`) — a deliberate simplification per the
  issue's "no new matching code" rail; if a research note's first entity is
  a weak anchor, its thread may match less news than expected. Not a bug,
  but worth watching in live review (the PRD's own risk note: "a research
  note with no matches simply shows no updates yet — no error").
- If `extractResearch` degrades to an empty extraction (AI failure), the
  seeded thread has `anchor_entity: null` and empty `entities` — it still
  gets created and followed, but can't match anything until curated. Also
  expected/by-design, not a bug.
- `.claude/settings.local.json` carries an uncommitted local diff (session
  permission grants) — kept out of commits (per-contributor file).
- `modules/research`'s `CATEGORY_SLUGS` is a static mirror of the seeded
  `categories` table — update it if a migration changes the catalog.
- Freshly-created worktrees have no `node_modules` — dispatched sessions
  `npm install` first.
- Tavily citation row (MOR-3) only shows once `TAVILY_API_KEY` is set + a
  pipeline runs.
- Build-cache hygiene: a file-sync tool has been cloning files with a `" 2"`
  suffix (e.g. stray `.next/**/* 2.ts`, `HANDOFF 2.md`); these pollute `tsc`.
  `rm -rf .next` before a gate if you see phantom duplicate-identifier errors.
