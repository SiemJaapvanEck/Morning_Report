# Morning Report — Brandbook

> **Status:** source of truth for the entire visual system since 6 July 2026.
> Supersedes `docs/design.md` (the "Atlas" note, folded into §5). Any session
> that touches UI reads this first and builds against it — no re-improvising.
>
> **Reference designs (pixel truth):**
> - Krant reading page: `Morning Report design/krant-a2-dagblad.html`
>   (direction "A2 · Dagblad + Verhaallijn", chosen 6 July 2026 — replaces the
>   A3 idle-run layout).
> - Dashboard/cover: `Morning Report design/atlas-daily.jsx` ("Atlas", 14 June 2026).
>
> **Token source of truth in code:** `app/lib/schemes.ts` (generates the CSS)
> + the static tokens in `app/globals.css`. When this document and that code
> disagree, fix whichever is wrong *and* the other — they must never drift.

## 0. How to use this document

- **Never hardcode a color.** Components use the CSS variables
  (`var(--accent)`, `var(--ink)`, …) — via Tailwind arbitrary values
  (`text-[var(--accent)]`, `border-[var(--line)]`) or plain CSS. The only hex
  values in components are in `schemes.ts` and `globals.css`.
- **Sizes in this book are exact**, taken from the reference designs. Don't
  round them to the nearest Tailwind step; use arbitrary values
  (`text-[19px]`, `tracking-[.16em]`) when Tailwind has no matching step.
- New UI = look up the recipe in §4/§5. A component that has no recipe here
  gets one added in the same PR that introduces it.

## 1. Color

### 1.1 Semantic tokens (per scheme)

Every scheme defines this full set. Meaning, not palette:

| Token | Role |
|---|---|
| `--accent` | Interaction, Sol, follow, selection, "today", storylines |
| `--accent-deep` | Hover/active shade of accent |
| `--accent-tint` | Accent-tinted chip/selection background |
| `--bg` | Page background |
| `--paper` | Card/tile surface |
| `--ink` | Primary text, hard borders (masthead rule) |
| `--ink2` | Body text (one step softer) |
| `--muted` | Secondary text, captions |
| `--faint` | Tertiary text, placeholders, idle labels |
| `--line` | Standard borders/dividers |
| `--line2` | Subtle inner dividers |
| `--hatch` | Hatch stripe color for image placeholders |
| `--util-bg` | Sticky utility-bar background (translucent, pairs with `backdrop-filter: blur(12px)`) |
| `--map-bg` / `--map-ocean` / `--map-land` | World-map surfaces |

Legacy aliases (kept for pre-brandbook components): `--background` → `--bg`,
`--foreground` → `--ink` (defined once in `globals.css`).

### 1.2 Neutral bases

All light schemes share `NEUTRAL_LIGHT`; all dark schemes share `NEUTRAL_DARK`
(see `app/lib/schemes.ts` for the values). A scheme only adds its accent set
(`--accent`, `--accent-deep`, `--accent-tint`) and `--bg`.

### 1.3 Schemes

24 schemes — 17 light, 7 dark — defined in `app/lib/schemes.ts` (`SCHEMES`).
Default: **`blue` "Signaalblauw" (`#2f6df0`)**; dark default **`dark`
"Middernacht"**. The picker (`ThemaKiezer`) writes `localStorage.mr_scheme`;
the anti-flash script in `layout.tsx` applies `html[data-scheme]` + the
`.dark` class before first paint and migrates the legacy `mr_thema` values
(krant→blue, sepia→amber, mint→green, nacht→dark).

Dark mode is **class-based** (`html.dark`), toggled by choosing a dark scheme —
never by the OS alone once a choice is stored.

### 1.4 Status colors (scheme-independent, in `globals.css`)

| Pair | Tokens | Use |
|---|---|---|
| Emerald | `--emer-t` `#0f7a4f` on `--emer-b` `#d8f0e2` | market gain, certainty "bevestigd" |
| Amber | `--amber-t` `#9a6b15` on `--amber-b` `#f6eccf` | in progress, certainty "verwacht", tag ANALYSE |
| Stone | `--stone-t` `#78716c` on `--stone-b` `#eceae6` | neutral chips, certainty "gerucht", tag UPDATE |
| Rose | `--rose` `#e0364f` | market loss, negative rating |

## 2. Typography

Three families via `next/font/google`, scoped in the components that use them
(not global — the app shell stays on Geist for now):

| Family | Var | Weights | Role |
|---|---|---|---|
| **Archivo** | `--font-archivo` | 500–900 | Headings, numbers with impact. Tight tracking (−.01em to −.04em), tight leading (.85–1.18) |
| **Space Grotesk** | `--font-space-grotesk` | 400–700 | Body and UI text |
| **Space Mono** | `--font-space-mono` | 400, 700 | Labels, metadata, dates, data, chips. Almost always uppercase with wide tracking (.04em–.18em) |

Type scale (krant page, exact):

| Role | Font | Size / weight / spacing |
|---|---|---|
| Masthead title | Archivo | 64px / 900 / −.04em, line-height .85 (58px ≤980px, 42px ≤560px) |
| Lead headline | Archivo | 58px / 800 / −.03em, lh 1.0, max 20ch, `text-wrap: balance` (38px ≤980px) |
| Section divider name | Archivo | 42px / 900 / −.03em |
| Featured headline | Archivo | 34px / 800 / −.02em, lh 1.04, max 22ch, balanced (27px ≤980px) |
| Verhaallijn rail title | Archivo | 21px / 800 / −.01em, lh 1.12 |
| Summary-card headline | Archivo | 18px / 700 / −.01em, lh 1.18 |
| Body (articles) | Space Grotesk | 20px / 400, lh 1.62, color `--ink2` (18px ≤560px) |
| Sol paragraph | Space Grotesk | 19px, lh 1.55, white on accent |
| Section summary | Space Grotesk | 16.5px, `--muted`, lh 1.5, max 78ch |
| Card/aside body | Space Grotesk | 13–15.5px, lh ~1.4–1.5 |
| Drop cap (lead only, first paragraph) | Archivo | 78px / 900, float left, lh .72, padding 6px 14px 0 0, color `--ink` |
| Big stat number | Archivo | 24–30px / 900 |
| Section labels (`bh`) | Space Mono | 11px, tracking .14em, `--muted`, uppercase |
| Meta rows | Space Mono | 12px, `--muted` |
| Tiny labels / chips | Space Mono | 9–11px / 700, tracking .08–.18em, uppercase |

## 3. Geometry, spacing, layout

- **Radii:** cards/tiles 16px (`rounded-2xl`); large blocks (Sol, hero image,
  vrail) 18px; small inner cards 10–12px; chips fully rounded (999px).
- **Borders:** 1px `--line` standard; **1.5px `--accent`** marks storyline
  elements (thread ribbon, vrail); **2px `--ink`** is the newspaper rule
  (masthead bottom, section-row separators, brief-list top).
- **Shells:** full-bleed bands and the krant grid max out at **1680px**
  (padding 40px, 18px ≤560px); reading columns at **720px**; the old wrap at
  1200px. Dashboard shell stays full-width (`app/layout.tsx`).
- **Krant row grid (`krow`):** `minmax(0,1fr) 340px 360px`, gap 44px — articles
  | map+cijfers (sticky, top 90px) | verhaallijn rail (sticky, top 90px).
  Collapses to one column ≤1240px (asides unstick).
- **Topzone grid:** `minmax(0,1fr) 400px`, gap 20px; one column ≤1080px.
- **Sticky offsets:** utility bar is `top: 0` (z-20); everything else sticks
  below it at `top: 90px` (sidebars 74px in the 1200px wrap context).
- **Breakpoints:** 1240px (krow collapses), 1080px (topzone stacks), 980px
  (lead/feat grids stack, type steps down), 560px (mobile padding + type).

## 4. Krant page recipes (A2 "Dagblad + Verhaallijn")

Page anatomy, top to bottom:

1. **Utility bar** — sticky, `--util-bg` + blur(12px), border-b `--line`.
   Back link ("Overzicht", arrow slides −4px on hover) · centered wordmark
   MORNING REPORT (Archivo 800, 14px, .04em) · edition date right (Space Mono
   11.5px, `--muted`).
2. **Masthead band** — border-b **2px `--ink`**. H1 "De Krant" (§2) + meta
   block (Space Mono 12px: date bold `--ink`, edition · nr) + spacer +
   **weather bar**: joined tiles in one `--line` border, radius 12px, each
   segment 9px 16px with right border; value Archivo 700 15px over label
   Space Mono 10px `--faint` (temp/place, condition/lo-hi, rain, wind).
3. **Topzone** — grid §3. Left: **Sol block** — `--accent` background, white
   text, radius 18px, padding 30px 34px, radial highlight overlay
   (`radial-gradient(120% 90% at 100% 0, rgba(255,255,255,.12), transparent 55%)`),
   header `✦ SOL · VANDAAG IN HET KORT` (Space Mono 12px/700, .16em), then the
   19px paragraph. Right column (400px): **Markten tile** — header row
   `MARKTEN · INTRADAG | N INDICES`, 2-col grid of index rows (name Space Mono
   12px ellipsized, delta Space Mono 700 12.5px, `--emer-t` up / `--rose`
   down, sign always shown); **Regio tile** — rows `104px 1fr 28px`: name,
   accent bar (h 8px, radius 4px, width % of max, min 8%), count right.
4. **Per-rubriek row (`krow`)** — repeated per section, separated by 2px
   `--ink` rule + 44px padding. Contents:
   - **Main column:** section divider (name 42px + 2px `--ink` line filling +
     count caption Space Mono 12px) → section summary (§2) → articles.
   - **Middle aside (sticky):** map card + cijfers card.
   - **Right rail (sticky):** verhaallijn rail.
5. **Footer** — centered Space Mono 12px `--faint`, border-t `--line`.

### Article recipes

- **Lead** (first rubriek only, above its divider): leadtag row (accent Space
  Mono 12px/700 uppercase: filled chip `HOOFDVERHAAL · NN%` radius 6px +
  section · source) → 58px headline → hero image 520px radius 18px (340px
  ≤980px) → **thread ribbon** → meta row → body with drop cap → ripples.
- **Thread ribbon** (storyline banner inside lead): flex, border 1.5px
  `--accent`, radius 12px; left cell accent bg white text `DEEL` over big
  Archivo 900 22px number; right cell label `VERHAALLIJN` (Space Mono 10px
  accent) over thread title (14px/600).
- **Meta row (`ameta`)**: Space Mono 12px `--muted` — source (700 `--ink`) ·
  4px dot · match% · dot · **rating**: label `JOUW OORDEEL` (10.5px `--faint`)
  + 5 segments 18×6px radius 3px, `--line` idle, hover accent; selected run
  colors `--emer-t` (positive) / `--rose` (negative). Maps to `ItemRating`
  −2…+2.
- **Ripples ("GEVOLGEN · n")**: header Space Mono 11px `--faint` .16em; rows
  `30px 1fr` gap 16px, padding 18px 0, `--line` row borders; index `01`
  accent Space Mono 12px/700; label Archivo 700 16px; text 14.5px `--muted`.
- **Vooruitblik card**: border 1.5px `--line` radius 16px; header bar `--ink`
  bg white text (→ icon, `VOORUITBLIK` Space Mono 12px .14em, date right
  75% white); body 15.5px + **certainty chip** (Space Mono 10.5px/700
  uppercase pill): bevestigd=emerald, verwacht=amber, gerucht=stone (§1.4).
- **Featured article**: image-or-hatch 340px radius 16px → 34px headline →
  meta row → body → optional ripples.
- **Image-or-hatch**: real image `object-cover`; otherwise 135° hatch
  (`repeating-linear-gradient(135deg, var(--hatch), var(--hatch) 13px,
  var(--paper) 13px, var(--paper) 26px)`, border `--line`) with the source as
  a small white-backed label bottom-left. Never an empty gray box.
- **Summary cards**: 2-col grid with 1px `--line` gaps (grid gap trick:
  container bg `--line`, cells `--paper`), radius 16px overall; cell padding
  22px 24px; headline 18px, body 14px `--muted`, source Space Mono 11px
  `--faint` pushed to bottom (`margin-top:auto`).
- **Brief list ("in het kort")**: border-t 2px `--ink`; header uppercase
  Archivo 800 15px + count; 2 CSS columns (1 ≤980px), items `break-inside:
  avoid` with 5px accent dot, 14.5px text, source Space Mono 11px `--faint`;
  "+N meer" link accent Space Mono 12px/700.

### Aside recipes

- **Verhaallijn rail (`vrail`)** — the signature element. Border 1.5px
  `--accent`, radius 18px, `--paper`. **Accent header**: white text on
  `--accent` + radial highlight; label `VERHAALLIJN · RUBRIEK` (Space Mono
  10.5px .18em, 85% opacity), title Archivo 800 21px balanced, stat row of
  big-number/label pairs (Archivo 900 24px over Space Mono 10px .08em
  uppercase 80%): **delen · weken · bronnen**. Body: timeline, padding 20px.
  - **Timeline node**: grid `14px 1fr` gap 14px, 20px bottom padding; 2px
    `--line` connector at left 6px (dashed accent — `repeating-linear-gradient`
    3px on 4px off — from the "now" node down); dot 13px, border 2.5px
    `--line`; **now**: accent-filled dot + 4px `--accent-tint` halo, date
    accent, title 700 `--ink`; **future**: dashed accent border dot, date
    accent. Node content: date (Space Mono 11px/700) + **tag chip** (Space
    Mono 9px/700 pill): `DEEL n`=accent-tint, `UPDATE`=stone, `ANALYSE`=amber,
    `VANDAAG`=solid accent white, `VOORUITBLIK`=emerald → title 14px lh 1.34
    (`--ink2`) → source (Space Mono 10px `--faint`).
  - No storyline in the rubriek → rail shows header only, or is omitted.
- **Map card ("WAAR HET SPEELT")**: `bh` label → `WereldKaart` in a `--map-bg`
  frame (aspect 46/22, border `--line2`, radius 10px, padding 7px,
  display-only: `pointer-events-none`) → geo chips (Space Mono 11px/700
  accent on `--accent-tint` pills).
- **Cijfers card ("RUBRIEK IN CIJFERS")**: `bh` label → stat rows (baseline
  grid: Archivo 900 30px number right-aligned min 52px + 13.5px `--muted`
  description, `--line2` separators). Real counts only: articles in the
  rubriek, distinct sources. **The Tavily row (`+N extra bronnen via Tavily`)
  is the same baseline stat row but accent-colored** (`--accent` on both the
  `+N` number and the description). It renders only when
  `tavilyBronCount(items) > 0` — the count of distinct Tavily grounding-source
  URLs across the rubriek's deep articles (`app/lib/stories.ts`), which is 0
  until `TAVILY_API_KEY` is set and a pipeline runs. Data-gated, never stubbed.
  Below: source chips (Space Mono 10.5px/700 `--muted` on `--stone-b`), max 8,
  with a `Bronnen in deze rubriek` micro-label.

## 5. Dashboard/cover conventions ("Atlas", folded in from design.md)

- Every edition is a bento dashboard of tiles; `/` = today,
  `/editie/[datum]` = any day; reading hierarchy: dashboard → "Lees de
  krant" → `/editie/[datum]/krant` (the §4 page).
- Tile: `rounded-2xl`, border `--line`, surface `--paper` (previously
  stone-200/white — migrate to tokens opportunistically).
- **Hero** ("Dagelijkse briefing"): accent surface, white text — top story +
  Sol intro + stat strip + "Lees de krant" button.
- **Story card**: image or hatch placeholder, category tag, match-%, Archivo
  title, summary, `ItemRating` −2…+2.
- Calendar navigation: `EditionNav` (Today + mini month picker with edition
  dots + Dag/Week/Maand/Jaar), `SwipePager` (swipe/scroll/arrows),
  `EditionOverview` (week/month/year views).
- Implementation: `Edition*` components + `WereldKaart`/`MarktenKaart`.

### 5.1 Settings tab shell (`/instellingen`)

Tabbed settings home (`InstellingenTabs`), the convergence point for the
Finance/Research/Settings PRDs. One route, client-side tab state, WAI-ARIA
"tabs" pattern (roving tabindex, Left/Right/Home/End activate).

- **Tab list**: pill group — `inline-flex rounded-full border border-[var(--line)]
  bg-[var(--paper)] p-1`, `role="tablist"`.
- **Tab button**: Space Mono 12px/700, tracking `.06em`, uppercase, `rounded-full
  px-4 py-2`. Selected = `bg-[var(--accent)] text-white`; idle = `text-[var(--muted)]`
  hover `text-[var(--ink)]`. `role="tab"`, `aria-selected`, `aria-controls`,
  roving `tabIndex` (0 on the selected tab, −1 elsewhere).
- **Panel**: `role="tabpanel"`, `aria-labelledby` the tab, `hidden` when
  inactive; only the active panel's content is mounted (`mt-8` above the
  panel area). Panels are handed to the shell as `ReactNode` props from a
  server-rendered page — the shell component itself owns no data fetching.
- **"Komt binnenkort" empty state** (`InstellingenLeegState`) — for a tab
  whose real content lands in a later phase: `rounded-2xl border
  border-[var(--line)] bg-[var(--paper)] px-6 py-12 text-center`; eyebrow
  `KOMT BINNENKORT` (Space Mono 11px/700, `--accent`, tracking `.14em`,
  uppercase); title (Archivo 19px/800); body (14.5px `--muted`, max 46ch,
  centered); a Space Mono 11px `--faint` line naming the phase that fills it
  in. This is the one place production UI intentionally shows a placeholder —
  it names *why* (a future phase), not a missing-data gap (§9 still applies
  everywhere else).

### 5.2 Finance dashboard tiles (`FinanceDashboardTiles`, cover dashboard)

The cover dashboard's headline finance row (docs/prd/finance.md Phase 6):
Netto waarde, Deze maand over, Beleggingsdoel ETA, Rendement % — reuses the
`/financien` page's own data (`getPortfolio`/`getCashflow`/`getGoals` +
`modules/finance` math via the pure `summarizeFinanceDashboard()`), no new
math. Same stat-tile recipe as §6/§7.

- **Tile**: `rounded-2xl` `--paper` card, border `--line`, `hover:-translate-y-0.5`.
  Label: Space Mono 10.5px `--muted`, uppercase, `.1em` tracking. Value:
  Archivo 900 24px `--ink` (surplus `--rose` when negative; rendement
  `--emer-t` positive / `--rose` negative; ETA `--accent`). Each tile is a
  `Link` to `/financien`.
- **Row placement**: a 4-up grid (`grid-cols-2 sm:grid-cols-4`) directly
  below the hero/weather/agenda/markten bento grid, above "Sol's selectie".
- **Empty state (CijfersCard-style, §9)**: the snapshot is `null` — and the
  whole row renders nothing — when the profile has no finance data at all
  yet (no holdings, no goals, no cashflow). The ETA tile hides on its own
  when there's no investment goal set; the Rendement tile hides on its own
  when there's no cost basis yet (no buys) — same "hide, don't placeholder"
  rule, applied per tile.
- **Today-only (locked decision)**: the snapshot is only fetched/rendered
  when the viewed edition date is today (`app/page.tsx` always is; historical
  `/editie/[datum]` pages pass `null` without fetching) — a past date never
  shows today's net worth/surplus/ETA/rendement under its own label.
- **Shared helpers**: `etaLabel()` and `rendementPct()` live in
  `modules/finance/index.ts` (also used by `FinancienGoals`/`FinancienPortfolio`
  on `/financien`) — one implementation, no drift between the cover tile and
  the full page. The DB/Yahoo fetch is the one impure step, in
  `app/lib/financeDashboard.ts` (`getFinanceDashboardSnapshot`).

## 6. Financiën page (portfolio chart)

The private `/financien` page (docs/prd/finance.md) reuses the same shell,
type scale, and token discipline as the rest of the app — no new fonts, no
new hardcoded colors. New recipe introduced here:

- **Stat tiles**: 4-up grid (2-up ≤ mobile), `rounded-2xl` `--paper` cards,
  border `--line`. Label: Space Mono 10.5px `--muted`, uppercase, `.1em`
  tracking. Value: Archivo 900 24px `--ink` (rendement % colored `--emer-t`
  positive / `--rose` negative, `--faint` when undefined). The 4th tile is
  the **DCA-inleg input** — same label style, an inline-editable € figure
  (Archivo 24px, underlined, focus ring `--accent`) instead of a static value.
- **Portfolio chart** (`FinancienChart`, `app/lib/financien.ts`): a single
  `viewBox="0 0 100 100"` SVG with three series sharing one monthly x-axis
  (`buildPortfolioChart`) —
  - **cost basis**: solid line, the `financieel` category amber
    (`categoryColor("financieel")` from `app/lib/stories.ts` — reused, never
    a new hardcoded hex), spans first-buy month → today.
  - **current value**: a single accent-colored dot anchored at "today"
    (token role: `--accent` covers "…, today, storylines" per §1.1) — no
    historical backfill line (locked PRD decision).
  - **projection**: dashed amber (60% opacity), forward from today.
  - Gaps between series are real gaps: `toSegments()` splits a nullable
    value array into contiguous `<polyline>` runs (via `seriesPoints()`,
    §-shared with the krant umbrella chart) so a line never draws back to 0
    across a null stretch.
  - Axis labels: € via `app/lib/geld.ts` `formatEuro` (min/mid/max, Space
    Mono 11px `--faint`); months via `Intl` short month/2-digit-year, the
    "today" label colored `--accent`.
  - Legend row: 3px amber dash = kostenbasis, accent dot = huidige waarde,
    dashed amber = verwachte groei (Space Mono 11px `--muted`).
- **Holdings list**: flat rows (border-t `--line2` between), symbol chip
  (Space Mono, `--stone-b`/`--stone-t`, matching the existing source-chip
  style), inline edit-in-place (no modal), `--rose` text for destructive
  (verwijderen) actions, `--amber-t` uppercase micro-labels for data flags
  ("koers onbekend" / "wisselkoers onbekend") — never a silently-wrong
  number.
- **Forms**: copy `CaptureFormulier.tsx`'s shape exactly — inline flex-wrap
  fields, `--line` borders, `--accent` submit button, `--rose` error text.
- **Goals & progress bars** (`FinancienGoals`, docs/prd/finance.md Phase 5):
  a flat `h-2 rounded-full` track in `--stone-b`, filled `--accent`, width =
  `goalProgressPct()` clamped `[0, 100]` — never a hardcoded gradient. One
  **investment goal** card (name, progress line `€ huidig / € doel · pct`,
  and a bold `--accent` **ETA** line — `"~N jaar M mnd"` or, per the locked
  600-month cap, `"buiten bereik"`/`"doel al bereikt"`) plus N **savings
  goal** rows in the same flat-row-with-border-t list pattern as Holdings;
  each row's `saved_eur` is inline-editable (no modal, `bijwerken` →
  numeric input + Opslaan, same shape as the holding edit-in-place). The
  **expected-return control** sits top-right of the section card: a small
  Space Mono uppercase label + a narrow right-aligned number input + inline
  Opslaan button, writing `finance_settings.expected_return_pct` (the same
  figure the Phase-3 chart's projection and this section's ETA both read).

## 7. Pipeline-rapport tab (`/instellingen`)

The Pipeline-rapport settings tab (`InstellingenPipelineTab`,
docs/prd/settings-tabs.md Phase 2): today's edition detail + 7/30-day trends,
read-only, server-rendered (no client state — the tab itself never mounts
`"use client"`).

- **Stat-tile row**: same recipe as §6's finance tiles (`rounded-2xl`
  `--paper`/`--line` cards, Space Mono 10.5px uppercase label, Archivo 900 24px
  value) but a 5-up row (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`) for
  kosten/artikelen/bronnen/Sol-artikelen/deep-research. Values render
  `--faint` (not hidden) when today's edition hasn't run yet — a note above
  the grid names why.
- **Category breakdown**: a flat list of horizontal bars, one per category
  with articles today — label (Space Grotesk), a `--line2` track filled to
  the busiest category's share in `categoryColor(slug)`, and the raw count
  (Space Mono, right-aligned). Hidden entirely when there are no articles yet
  (§9 "hide, don't placeholder" still applies here — this is real absence,
  unlike the tab-level "komt binnenkort" state).
- **Step-duration list**: flat rows (`divide-y --line2`) of step kind
  (Dutch label) → average duration (`4,0s`) or `loopt nog` when unfinished,
  plus a `· N×` suffix when a kind ran more than once today.
- **Trend sparklines**: `TrendCard` — a `--paper`/`--line` card per metric
  (kosten, artikelen), each holding two compact sparklines (7 dagen / 30
  dagen) built via `seriesPoints()` (shared with the krant umbrella chart,
  §5) over a single `<polyline>`, no axis chrome — this is a glance metric,
  not the Financiën portfolio chart's full read. Kosten uses the `financieel`
  category color (`categoryColor("financieel")`); artikelen uses `--accent`.
  An empty series (no editions yet) renders a one-line `--faint` message
  instead of a flat/misleading zero line.

## 8. Interaction & motion

- Transitions are small and fast: 0.12–0.15s on hover (color, transform).
  Back-arrow slides; rating segments recolor; no large animations.
- Sticky asides only ≥1240px; below that everything flows in one column.
- The world map in asides is informational: suppress navigation
  (`pointer-events-none` on the container), reuse `WereldKaart` — never build
  a second map.
- Ratings, follows, selection: always accent-colored feedback.

## 9. Do's & don'ts

- **Do** reuse these recipes verbatim; extend the brandbook when a new
  pattern is genuinely new.
- **Do** hide a component when its data is empty (no map without geography,
  no timeline with <2 instalments — show the compact label variant, no
  weather bar without a snapshot). Never render placeholders for missing
  data in production UI.
- **Don't** hardcode hex colors, `stone-*`/`blue-*` Tailwind palette classes
  in *new* code — tokens only. (Existing dashboard components migrate
  opportunistically.)
- **Don't** introduce new fonts, radii, or border weights.
- **Don't** use lorem ipsum; UI copy is Dutch.
- **Don't** add component libraries; small client components only where
  interaction demands it, the rest server components.

## 10. Change log

- **22 July 2026** — Added §7 "Pipeline-rapport tab": stat-tile row, category
  breakdown bars, step-duration list, and `TrendCard` sparklines (via the
  shared `seriesPoints()`), from the `/instellingen` Phase 2 build (MOR-16).
  Renumbered §7-9 → §8-10.
- **22 July 2026** — Added the "Goals & progress bars" recipe to §6: the
  flat progress-bar track, the investment-goal ETA card, savings-goal rows,
  and the expected-return control, from the `/financien` Phase 5 goals
  build (MOR-8).
- **21 July 2026** — Added §5.1 "Settings tab shell": `InstellingenTabs`
  (pill tablist, WAI-ARIA tabs pattern) + `InstellingenLeegState` ("komt
  binnenkort" placeholder recipe), from the `/instellingen` Phase 1 rebuild
  (MOR-15).
- **6 July 2026** — Brandbook created from the "A2 · Dagblad + Verhaallijn"
  reference. Scheme system (24 schemes on CSS variables) replaces the 4
  fixed themes; `mr_thema` migrated to `mr_scheme`. Krant page rebuilt to
  the per-rubriek row layout (articles | map+cijfers | verhaallijn rail).
- **21 July 2026** — Added §6 "Financiën page (portfolio chart)": the 3-line
  SVG portfolio chart recipe (stat tiles, chart, holdings list, forms) for
  `/financien` (docs/prd/finance.md, Phase 3). Old §6/§7 (Interaction &
  motion / Do's & don'ts) renumbered to §7/§8.
