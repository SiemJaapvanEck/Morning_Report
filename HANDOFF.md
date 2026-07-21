# HANDOFF — three initiatives planned; Wave 1 dispatched

> **Last updated:** 21 July 2026 (interactive session with Siem) — on `main`

## Where we stand

`main` has workflow v2 + the krant A2 rebuild (`0ae2df5`) + MOR-3 Tavily
citation UI (`6896120`). This session planned **three new initiatives** onto the
Linear board and (about to) dispatched Wave 1.

## Board state (all in the single "Morning Report" Linear project)

Issues are separated by **initiative-prefixed sprint milestones** (Siem's rule:
one Linear project, not separate projects):

- **Finance** (`docs/prd/finance.md`) — MOR-4…MOR-9. Private portfolio (manual
  holdings, free keyless Yahoo quotes, multi-currency→€), income/expense report
  → surplus = DCA → compound projection (7%) → investment-goal ETA + savings
  goals. New `/financien` page + dashboard tiles. No new dep / paid API / AI.
- **Research Tracking** (`docs/prd/research-tracking.md`) — MOR-10…MOR-14.
  Paste/write research → one askAI extraction → seeds a followed thread the
  existing threads engine matches news to + updates daily. Embeddable
  `MijnOnderzoek` component (mounted in Settings later).
- **Settings Tabs** (`docs/prd/settings-tabs.md`) — MOR-15…MOR-18. Restructure
  `/instellingen` into tabs (Account · Financiën · Pipeline-rapport); the
  **convergence** project that mounts Finance + Research components. Cross-issue
  blocks: MOR-17←MOR-8, MOR-18←MOR-13.

**Ready (`Todo`):** MOR-4, MOR-10, MOR-15. All else `Backlog` (dependency-gated).

## What's open / next

1. **Wave 1 dispatched:** MOR-4 (Finance foundation) + MOR-10 (Research
   foundation) — both `auto-ok`, unattended-safe, each in its own worktree +
   branch + implementer session. On green + review → `/merge`.
2. **Migrations to apply (Siem):** `0019_finance.sql` (MOR-4) and
   `0020_user_research.sql` (MOR-10) — authored by the sessions, applied by
   Siem before the `needs-siem` surface phases can go live.
3. **Wave 2 (needs-siem):** the finance/research surfaces + Settings shell/report
   — after migrations applied + Siem visual review.
4. Three now-empty **canceled** Linear projects (Personal Finance / Research
   Tracking / Settings Tabs) can be hard-deleted from the Linear UI (the MCP has
   no delete-project; they're already Canceled + empty).

## Known issues / gotchas

- `.claude/settings.local.json` carries an uncommitted local diff (session
  permission grants) — kept out of commits (per-contributor file).
- Tavily citation row (MOR-3, on main) only appears once `TAVILY_API_KEY` is set
  + a pipeline runs — Siem's live check.
- Pre-existing: `.next/types/… 2.*` duplicate files on macOS/iCloud →
  `find .next -name "* 2.*" -delete` then re-run tsc.
