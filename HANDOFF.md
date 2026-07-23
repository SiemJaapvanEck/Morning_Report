# HANDOFF — MOR-13 rebuilt, gate green, PR open

> **Last updated:** 23 July 2026 — local session (dispatched by the
> orchestrator, re-dispatch of the 22 Jul cloud run whose work was lost).
> Branch: `MOR-13-mijn-onderzoek-component-api-2026-07-23`. Worktree:
> `../Morning_Report-worktrees/MOR-13`.

## Where we stand

This branch carries **MOR-13 (Research P4 — "Mijn onderzoek" management
component + API)**, rebuilt from scratch against current `main` (which
already has MOR-8/12/16 promoted, per the orchestrator's 22 Jul HANDOFF on
`main`). The 22 Jul cloud session built this same scope and reported gate
green, but its container had no GitHub write access (`git push` and the
GitHub MCP tools both 403'd) and the work was lost when the container was
reclaimed — see its Linear comment on MOR-13, which served as the build spec
for this rebuild. This session pushed cleanly and opened the PR.

**What this session built:**
- `app/api/research/route.ts` — added `GET` (list), `DELETE`/`PATCH`
  (both archive, aliased — soft delete via the new `archiveResearch`), next
  to the existing `POST` create path (MOR-12). All cookie-gated (401).
- `modules/research/index.ts` — `archiveResearch(profileId, id)`: sets
  `status='gearchiveerd'`, scoped by `profile_id`, no hard delete (keeps
  storyline history, locked decision).
- `app/lib/queries.ts` — `getResearch(profileId)` → `ResearchNote[]`,
  batch-joining `user_research` rows with their seeded thread's `status` +
  `last_seen_at` (via one `in(...)` lookup, same pattern as
  `getStoryDetail`), precomputing a `threadUpdatedLabel` with the existing
  `updatedAgo` helper.
- `app/components/MijnOnderzoek.tsx` — new self-contained client component:
  add form (`CaptureFormulier.tsx` pattern), list with status + thread
  status + "bijgewerkt Xu" label, a link to each note's storyline
  (`/archive/[threadId]`), and an archive action. Takes its initial list as
  a prop (`initial: ResearchNote[]`) and owns its own state/API calls from
  there — no page-specific assumptions, so it drops in unchanged wherever
  it's mounted.
- `app/instellingen/page.tsx` — temporary mount: a new section **below**
  `InstellingenTabs`, deliberately not touching `InstellingenAccountTab.tsx`
  — that integration (folding it into the Account tab) is **MOR-18's job**,
  which depends on this component existing.

**Gate: green.** `npm run lint && npx tsc --noEmit && npm test && npm run
build` — 433 tests, clean build, no warnings.

**PR:** https://github.com/SiemJaapvanEck/Morning_Report/pull/10 (base
`main`, per the merge policy this actually lands on `staging` after
review). Linear MOR-13 → In Review.

## What's next

- Reviewer pass on PR #10.
- Once reviewed + gate green on `staging`, land it (orchestrator, per merge
  policy) — this unblocks **MOR-18** (Account tab mounts `MijnOnderzoek`)
  and **MOR-14** (Phase 5, surfacing research storylines in the report).
- Needs-siem live check (can't be verified unattended): add a research note
  on the `staging` preview, confirm extraction → thread seed → the list
  shows it as "Gevolgd", the storyline link resolves, and archive works.

## Known issues / gotchas

- `MijnOnderzoek`'s optimistic post-create state assumes the freshly seeded
  thread is `active`/"nu" (accurate per `seedResearchThread`, which always
  seeds `status: "active"` with `last_seen_at: now`) — not re-fetched from
  the server, so if `createResearch` ever changes that default this
  optimistic patch needs to move too.
- No new migration in this phase — schema (`0020_user_research.sql`) and
  `modules/research`'s extraction/seeding were already on `main` (MOR-12).
- Same repo-wide gotchas as `main`'s HANDOFF (finance FX today's-rate
  conversion, `modules/research` `CATEGORY_SLUGS` static mirror, gitignored
  `.claude/ntfy-topic.txt`, uncommitted-by-design
  `.claude/settings.local.json`, fresh worktrees need `npm install`, `rm -rf
  .next` before a gate on phantom duplicate-identifier errors).
