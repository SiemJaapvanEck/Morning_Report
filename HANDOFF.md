# HANDOFF — Krant A3 "Dagblad + Verhaallijn" (Phases 1–3)

> **Last updated:** 2 July 2026 (idle run — Phase 1 done) — `idle-work/2026-07-02-krant-a3`
> **Sprint board:** `docs/krant-a3-plan.md`.

## What this arc is

A wholesale redesign of the krant reading page (`app/components/EditieWeergave.tsx`)
to the **A3 "Dagblad + Verhaallijn"** layout, keeping every current feature.
The signature of A3 is the **Verhaallijn aside** on each deep story — a vertical
timeline of the storyline's instalments (P2) plus an impact map (P3).

Three phases — **Phase 1 now done, Phases 2 + 3 open:**

- **Phase 1** ✅ — A3 shell, masthead band, topzone tiles, image-or-hatch cards, aside slot.
- **Phase 2** ☐ — Verhaallijn timeline (pure builder + query extension + TimelineCard).
- **Phase 3** ☐ — Impact map "WAAR HET SPEELT" (geo helper + ImpactMapCard).

---

## Where we stand (after Phase 1)

`EditieWeergave.tsx` is fully rewritten into the A3 layout. **Gate green**
(lint ✓ · tsc ✓ · 296 tests ✓ · build ✓). Not yet live-verified — Siem reviews
in the morning.

### What Phase 1 shipped

- **`app/lib/krant-a3.ts`** — three pure helpers:
  - `dayOfYear(dateStr)` — 1-based day-of-year via `Date.UTC` (DST-safe; the naive
    `new Date(year, 0, 0)` approach gives 182 instead of 183 for Jul 2 because the
    European DST spring-forward subtracts an hour from the diff).
  - `formatMarktDelta(d)` — signed "+1.23%" formatting.
  - `regioBarData(regios)` — sorted bar rows scaled to the max count.
- **`app/lib/krant-a3.test.ts`** — 15 vitest tests for the above.
- **`app/components/EditieWeergave.tsx`** — full A3 rewrite:
  - **Masthead band:** `Morning Report` + long Dutch date + `ochtendeditie` + `nr. <dayOfYear>`
    in a 2-row header band, terminated by the horizontal **weather bar**.
  - **Topzone:** Sol blue block (`dp_summary`) + **Markten tile** (each `markten.indices` row:
    `naam` + signed delta, emerald up / rose down) + **Regio tile** (each `regios` entry:
    Dutch name + 1px blue progress bar scaled to max + count). Tiles individually conditional.
    On desktop: Sol takes flex-1, tiles stack in a 200px column on the right.
  - **Image-or-hatch placeholder:** every lead + featured article gets a banner — `<img>` when
    `image_url` is set, 135° stone diagonal hatch (`repeating-linear-gradient`) when null.
  - **Lead article card:** `overflow-hidden rounded-2xl border` wrapping banner + body in a
    2-col grid (`1fr 260px`) when the item has a storyline or prediction, single-col otherwise.
    The right column is the **aside slot** (`VerhaallijnAside`).
  - **Featured articles:** same pattern, narrower aside (`1fr 220px`).
  - **Summary cards:** individually `rounded-2xl border bg-white` in a `sm:grid-cols-2` grid.
  - **"Ook in het nieuws" brief list:** `rounded-2xl border bg-stone-50` (styling unchanged).
  - **`VerhaallijnAside`** component: renders VerhaallijnLabel + Vooruitblik in P1.
    P2 adds `TimelineCard` here; P3 adds `ImpactMapCard` here. Returns `null` when a
    story has neither, so the grid collapses cleanly.
  - **`Space_Grotesk`** added as body font (alongside Archivo headings + Space Mono labels).
  - Every preserved feature: `ItemRating` on lead+featured, `orderSectionsFollowedFirst`,
    ripples, Vooruitblik + certainty chip (emerald/amber/stone), source + match%,
    `VerhaallijnLabel`, empty-section/brief hiding, light+dark modes.
- **`docs/krant-a3-plan.md`** — Phase 1 box ticked.

### Assumption made unattended

The aside grid is conditional on `item.storyline || item.prediction`. A story with no
thread data renders full-width without a visible empty column — cleaner for P1. P2/P3 won't
need to restructure the container because any story with a Verhaallijn will also get a timeline
(the condition naturally expands with the new data).

---

## What's open

### Phase 2 — Verhaallijn timeline

The aside slot is ready. Phase 2 puts a vertical **instalment timeline** inside it.

**Spec (from `docs/krant-a3-plan.md`):**
- Pure builder `buildStorylineTimeline(links, today, prediction)` — signature:
  `links = { edition_id, date, title, source, item_id }[]` → ordered `TimelineNode[]`
  (past nodes per distinct edition ascending, latest marked `isNow`, optional `future` node
  from prediction). Tests: ordering, per-edition dedupe, deel numbering, now-marking,
  vooruitblik append, empty input.
- `getEdition` in `app/lib/queries.ts` extended: `partLinks` select extended to pull each
  linked item's `title` + `sources(name)` and join `editionDates`. Expose as
  `item.storyline.timeline: TimelineNode[]`. Add `TimelineNode` to `modules/shared/types.ts`;
  `StorylineRef` gains a `timeline` field.
- `TimelineCard` in `EditieWeergave.tsx`: vertical timeline — past nodes (dot + date +
  `deel N` + headline + source), *vandaag* emphasised in blue, future node with certainty chip.
  Replaces `VerhaallijnLabel` inside `VerhaallijnAside` when timeline has ≥2 nodes (plain label
  stays as compact fallback for 1-node histories).
- **No migration expected.** Gate green.

**Files:** `app/lib/queries.ts`, `modules/shared/types.ts`, `app/lib/stories.ts` or
`modules/threads/`, `app/components/EditieWeergave.tsx`.

### Phase 3 — Impact map "WAAR HET SPEELT"

After Phase 2. Places an impact map below the timeline in the aside.

**Spec (from `docs/krant-a3-plan.md`):**
- Pure helper `storyGeography(regio, placeEntities)` → `{ counts: Record<RegioCode,number>,
  chips: string[] }`. `counts` from `item.scan_meta.regio`; `chips` = de-duped title-cased
  place-typed entities (cap ~6). Empty → `{counts:{}, chips:[]}` (card hides).
- `getEdition` extended: attach place-typed entities of each deep item's storyline thread
  via `modules/entities` `loadRegistry`/`typeOf`, expose as `item.storyline.places`.
- `ImpactMapCard` in `EditieWeergave.tsx`: `WereldKaart` (small, card-fit) with story's
  `counts` + geo-chips below. Slots into `VerhaallijnAside` below `TimelineCard`.
- **No migration expected.** Gate green.

**Files:** `app/lib/queries.ts`, `modules/shared/types.ts`, `modules/entities/` or
`app/lib/stories.ts`, `app/components/EditieWeergave.tsx`, reuse `WereldKaart.tsx`.

---

## Known issues / gotchas

- **Not yet live-verified.** Siem reviews on localhost in the morning. Open the krant on an
  edition that has Markten + Regio data to see the full topzone; use an edition with threads
  and predictions to see the VerhaallijnAside.
- **`eslint-disable-next-line @next/next/no-img-element`** in `ImageBanner` — the `<img>` is
  intentional (article images from third-party RSS; `next/image` would need every source
  domain whitelisted). The lint directive is correct.
- **Aside conditional grid:** when a story has no storyline and no prediction the card is
  single-column. Pre-Phase-B editions will always be full-width, which is fine.
- **DST-safe `dayOfYear`:** fixed via `Date.UTC` — see the comment in `krant-a3.ts`.
- **Duplicate-identifier tsc issue (pre-existing):** if `.next/types/… 2.*` files appear,
  run `find .next -name "* 2.*" -delete` and re-run tsc.
- **Untracked files committed in checkpoint `e9f41d3`:** `Morning Report design/` mockups and
  `scripts/*.ts` DB mutation helpers — they're now tracked on this branch.

## Next actions for Siem

1. **Review Phase 1 on localhost** (`npm run dev` → `/editie/[datum]/krant` on a live edition):
   masthead + weather bar · topzone (Sol block + Markten tile + Regio tile) · lead/featured with
   image-or-hatch banner · aside showing VerhaallijnLabel + Vooruitblik · summary cards · brief list.
2. **If Phase 1 looks good,** decide whether Phase 2 runs next (Verhaallijn timeline) —
   either another idle session or a live session.
3. **Merge `idle-work/2026-07-02-krant-a3` → main** once confirmed. Use `/merge-idle-to-main`.
   No migration to apply for Phase 1.
