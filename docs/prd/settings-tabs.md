# PRD — Tabbed Settings (pipeline report · account+research · financial stats)

> **Status:** approved (2026-07-21) · **Owner:** Siem · **Linear:** Morning Report project · "Settings ·" sprint milestones
> **Linear issues:** P1 MOR-15 · P2 MOR-16 · P3 MOR-17 (blocked by MOR-8) · P4 MOR-18 (blocked by MOR-13)
> A PRD is approved only when no open question could stall an autonomous
> session. Approved PRDs are the autonomy boundary.

## 1. Goal

Restructure `/instellingen` into a **tabbed settings home** that is also the
**convergence point** for the Finance and Research-Tracking initiatives. Three
tabs:

1. **Account** — the existing preferences (`VoorkeurenKiezer`) **plus** the
   "Mijn onderzoek" research manager (mounts PRD #2's `MijnOnderzoek`
   component).
2. **Financiën** — full finance settings: the often-changed **monthly
   investment amount** + **expected return**, goal editing, holdings shortcuts,
   headline stats (mounts PRD #1's finance components), with a link to the full
   `/financien` page.
3. **Pipeline-rapport** — a data-pipeline report: **today's edition** detail
   (articles by category, sources, € cost, Sol articles, deep-research count)
   **plus rolling 7/30-day trends** (cost/day, articles/day).

Most of this PRD is a **container**: the Account and Financiën tabs *mount
standalone components already built* in PRD #2 and PRD #1 (that's the
"merge-at-the-end" seam Siem asked for). The only net-new surface is the
Pipeline-rapport tab, which reads existing tables — **no new schema, no new
dependency, no AI calls.**

## 2. Non-goals

- **No new data model.** Reads `usage_log`, `pipeline_steps`, `edition_items`,
  `editions`, `finance_settings` (from PRD #1); writes only `finance_settings`.
- **No rebuild of finance/research UI** — the tabs *host* the components from
  PRD #1/#2. If those aren't merged yet, the tab shows an empty/placeholder
  state (graceful), never a duplicate implementation.
- **No comprehensive pipeline analytics** in V1 (per-step token drill-downs,
  Tavily usage, failed-step forensics) — Essentials only (see Phase 2).
- **No settings for other users** — single-profile, cookie + RLS as today.

## 3. Verification reality

- **Gate-checkable (auto-ok):** the tab-shell component, and the **pure
  aggregation helpers** for the pipeline report (over plain rows) with vitest;
  lint/tsc/build.
- **Needs Siem (live):** the report reading real `usage_log`/`pipeline_steps`/
  `edition_items` rows; writing `finance_settings`; visual review of all three
  tabs; and the cross-project mounts actually rendering the PRD #1/#2 components.
  Those phases are **needs-siem**.
- No migration in this PRD (the one schema touch — a `monthly_contribution_override`
  column on `finance_settings` — is folded into PRD #1's migration `0019`).

## 4. Phases (one phase = one Linear issue = one session)

### Phase 1 — Tabbed settings shell
- **Goal:** `/instellingen` becomes a three-tab layout; existing preferences
  move into the Account tab; Financiën + Pipeline-rapport tabs exist as
  placeholders their integration phases fill.
- **Acceptance criteria:**
  - `app/instellingen/page.tsx` restructured to a client tab shell
    (Account · Financiën · Pipeline-rapport), tab state client-side, Dutch
    labels, scheme tokens (no hardcoded colors), keyboard-accessible tabs.
  - `VoorkeurenKiezer` renders inside the **Account** tab, unchanged.
  - Financiën + Pipeline-rapport tabs render a clearly-labelled empty state
    ("komt binnenkort" / wired in a later phase) so the shell ships independently.
  - New `app/components/Instellingen*` tab components; brandbook recipe for the
    tab pattern added. Gate green.
- **Files/areas:** `app/instellingen/page.tsx`,
  `app/components/InstellingenTabs.tsx` (+ per-tab wrappers), `docs/brandbook.md`.
- **Locked decisions:** stay on the **`/instellingen`** route (no new
  `/settings`); three tabs in the order Account · Financiën · Pipeline-rapport;
  tab shell is self-contained so the other two tabs' content mounts later with
  no shell change.
- **Depends on:** —
- **Label:** needs-siem *(visual review of the restructured page)*

### Phase 2 — Pipeline-rapport tab (today + trends, essentials)
- **Goal:** show what the pipeline produced and cost — today's edition detail +
  a 7/30-day trend view.
- **Acceptance criteria:**
  - Pure aggregation helpers (new `modules/pipeline-report/index.ts` or
    `app/lib/`): given rows, compute **today**: article count **by category**,
    distinct **sources**, **€ cost** (`sum(usage_log.cost_eur)` for the edition),
    **Sol article count** (`edition_items` with a `sol_note`), **deep-research
    count** (deep-band items with a non-null `article`), and **per-kind step
    duration** (`finished_at − started_at` from `pipeline_steps`); and
    **trends**: per-edition € cost and article count over the last 7 and 30
    editions. Unit-tested.
  - Read query `getPipelineReport(profileId)` in `app/lib/queries.ts` joining
    `editions` → `pipeline_steps` + `usage_log` + `edition_items`(→`items.category_id`,
    `sources`), scoped to the profile's editions.
  - The tab renders stat tiles (today) + small trend charts reusing
    `seriesPoints()` from `app/lib/stories.ts` (inline SVG `<polyline>`), € via
    `app/lib/geld.ts` (from PRD #1; if unavailable, a local formatter).
  - Gate green (aggregation tested; live data + visuals are Siem's review).
- **Files/areas:** `modules/pipeline-report/index.ts` (+ test),
  `app/lib/queries.ts`, `app/components/Instellingen*`.
- **Locked decisions:** **Essentials** metric set only (articles-by-category,
  sources, € cost, Sol count, deep-research count, per-kind timing); windows =
  today + last 7 + last 30 editions; cost from `usage_log.cost_eur` (already the
  system of record). No token/Tavily/failed-step drill-down in V1.
- **Depends on:** Phase 1
- **Label:** needs-siem

### Phase 3 — Financiën tab (mount finance settings)
- **Goal:** the often-changed finance knobs + stats, in the tab.
- **Acceptance criteria:**
  - The tab hosts an **editable monthly investment amount**
    (`finance_settings.monthly_contribution_override`) and **expected return %**
    (`finance_settings.expected_return_pct`), writing via a settings endpoint;
    plus goal editing and holdings shortcuts by **mounting the PRD #1 finance
    components** (no reimplementation), and headline stats (net worth, ETA) with
    a link to `/financien`.
  - Graceful empty state if PRD #1 isn't merged yet.
  - Gate green.
- **Files/areas:** `app/components/Instellingen*` (Financiën tab wrapper),
  reuse `app/components/Financien*` + `app/api/*` from PRD #1.
- **Locked decisions:** the tab **mounts** PRD #1 components; the only logic it
  owns is the quick-edit of `monthly_contribution_override` + `expected_return_pct`.
- **Depends on:** Phase 1 **and** PRD #1 (Personal Finance) surface phases
  (holdings/goals/settings components + `finance_settings`).
- **Label:** needs-siem

### Phase 4 — Account tab (mount research + preferences)
- **Goal:** preferences and research management in one Account tab.
- **Acceptance criteria:**
  - The Account tab renders `VoorkeurenKiezer` (from Phase 1) **and** the
    `MijnOnderzoek` component from PRD #2 (upload/list/archive research), mounted
    unchanged.
  - Graceful empty state if PRD #2 isn't merged yet.
  - Gate green.
- **Files/areas:** `app/components/Instellingen*` (Account tab wrapper), reuse
  `app/components/MijnOnderzoek.tsx` from PRD #2.
- **Locked decisions:** Account tab = preferences + research only; no new logic
  beyond mounting.
- **Depends on:** Phase 1 **and** PRD #2 (Research Tracking) Phase 4
  (`MijnOnderzoek` component + API).
- **Label:** needs-siem

## 5. Risks & rails

- **Cross-project ordering:** Phases 3/4 depend on PRD #1/#2 components landing
  first. Rail: each tab ships a graceful empty state, so the shell (P1) + report
  (P2) can merge independently and the mount-phases follow once their sources
  land. Dispatch order: this project's P1+P2 alongside the others; P3/P4 last.
- **Report query cost:** aggregations join a few tables per profile edition.
  Rail: bound trends to the last 30 editions; the page is `force-dynamic`, not
  in the pipeline. No AI calls.
- **Privacy:** report reads only the profile's own editions; finance/research
  data stays per-profile (RLS). Nothing new leaves the profile boundary.
- Standing rails: one issue = one branch = one session; gate green; scheme
  tokens only; brandbook recipe for the tab + report patterns.

## 6. Decision log

- **2026-07-21 — PRD drafted with Siem.** Locked: (1) restructure the existing
  **`/instellingen`** into three tabs (Account · Financiën · Pipeline-rapport) —
  no new route; (2) pipeline report shows **today + 7/30-day trends**, **Essentials**
  metric set (articles-by-category, sources, € cost, Sol count, deep-research
  count, per-kind timing); (3) **Financiën tab = full finance settings** but by
  **mounting PRD #1 components** (+ quick-edit of monthly amount & expected
  return); (4) **Account tab mounts PRD #2's `MijnOnderzoek`** + existing
  preferences; (5) **no new schema/dependency/AI** here — the one column
  (`monthly_contribution_override`) folds into PRD #1's `0019`; (6) per Siem, the
  finance/research surfaces were built as standalone components precisely so this
  PRD mounts them — the three plans merge here.
