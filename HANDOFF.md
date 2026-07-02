# HANDOFF — Krant A3 "Dagblad + Verhaallijn" (Phases 1–3)

> **Last updated:** 2 July 2026 (idle run — Phase 2 done) — `idle-work/2026-07-02-krant-a3`
> **Sprint board:** `docs/krant-a3-plan.md`.

## What this arc is

A wholesale redesign of the krant reading page (`app/components/EditieWeergave.tsx`)
to the **A3 "Dagblad + Verhaallijn"** layout, keeping every current feature.
The signature of A3 is the **Verhaallijn aside** on each deep story — a vertical
timeline of the storyline's instalments (P2, now done) plus an impact map (P3, next).

Three phases — **Phases 1 + 2 done, Phase 3 open:**

- **Phase 1** ✅ — A3 shell, masthead band, topzone tiles, image-or-hatch cards, aside slot.
- **Phase 2** ✅ — Verhaallijn timeline (pure builder + query extension + TimelineCard).
- **Phase 3** ☐ — Impact map "WAAR HET SPEELT" (geo helper + ImpactMapCard).

---

## Where we stand (after Phase 2)

Both Phase 1 and Phase 2 are committed on `idle-work/2026-07-02-krant-a3`.
**Gate green** (lint ✓ · tsc ✓ · 306 tests ✓ · build ✓). Not yet live-verified —
Siem reviews in the morning.

### What Phase 2 shipped

- **`modules/shared/types.ts`** — Added `TimelineNode` discriminated union:
  - `{ kind: "past"; date; title; source; deel; isNow }` — one per distinct edition.
  - `{ kind: "future"; date; text; certainty }` — the prediction node.

- **`app/lib/stories.ts`** — Added:
  - `TimelineLink` interface (the raw link shape passed to the builder).
  - `buildStorylineTimeline(links, today, prediction)` — pure builder:
    - Deduplicates by `edition_id` (first link wins per edition).
    - Filters out links after `today`.
    - Sorts ascending by date; numbers `deel` chronologically (1-based).
    - Marks the latest past node `isNow: true`.
    - Appends a `kind: "future"` node from `prediction` when present.
    - Returns `[]` when no links fall on/before `today`.

- **`app/lib/stories.test.ts`** — 10 new tests covering: empty input, single node,
  future-date exclusion, per-edition dedup (first-link-wins), ascending order,
  deel numbering, isNow marking, prediction append, no-prediction path,
  all-future edge case. Total: **306 tests**.

- **`app/lib/queries.ts`**:
  - `StorylineRef` gains `timeline: TimelineNode[]`.
  - `partLinks` select extended to also pull `item_id, items(title, sources(name))`
    (one enriched select, no extra round-trips).
  - `rawLinksByThread` map built from the enriched `partLinks` + `editionDates`.
  - `buildStorylineTimeline` called when building each item's `StorylineRef`,
    passing the thread's raw links + the edition's `date` (as `today`) +
    `thread.prediction` (already fetched for the Vooruitblik).

- **`app/components/EditieWeergave.tsx`** — Added:
  - `formatShortDate(dateStr)` — compact Dutch locale date (e.g. "1 jun.").
  - `PastNode` / `FutureNode` type aliases for narrowing.
  - **`TimelineCard`** component: vertical timeline with the storyline title
    as a link to `/archive`, then per past node: blue dot (highlighted for
    `isNow`) + "VANDAAG" / short date + "deel N" + headline + source. Future node
    has a dashed dot + target date + certainty chip + prediction text.
  - Updated `VerhaallijnAside`: if `pastCount >= 2`, renders `TimelineCard`
    (which includes the future node); otherwise falls back to the P1 compact
    `VerhaallijnLabel + Vooruitblik`. The `{/* P3: ImpactMapCard */}` placeholder
    is still there for Phase 3.

### Decision taken unattended

**TimelineCard includes the full prediction text.** The future node in the card
renders `futureNode.text` (the prediction prose) alongside the date + certainty chip,
so when `showTimeline` is true the `Vooruitblik` component is no longer shown
separately. The P1 `Vooruitblik` (standalone) is still shown for 1-instalment stories.
This is the cleanest reading experience; Siem can adjust if needed on localhost.

**First-link-wins per edition.** When a thread has multiple items in the same edition,
the first link seen from the DB is used for that edition's node title + source. This is
deterministic and good enough — the intent is "which edition did this story appear in",
not "all items in that edition".

---

## What's open

### Phase 3 — Impact map "WAAR HET SPEELT"

The aside slot is ready (the `{/* P3: ImpactMapCard */}` comment sits inside
`VerhaallijnAside` just below the TimelineCard / fallback block).

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

- **Not yet live-verified.** Siem reviews Phase 1 + 2 together on localhost in the
  morning. Open an edition with threads and predictions to see the TimelineCard
  (needs ≥2 past instalments). An edition with a single-instalment storyline will
  show the fallback VerhaallijnLabel + Vooruitblik.
- **`eslint-disable-next-line @next/next/no-img-element`** in `ImageBanner` — intentional.
- **Aside conditional grid:** single-column when no storyline + no prediction.
- **DST-safe `dayOfYear`:** fixed via `Date.UTC` — see the comment in `krant-a3.ts`.
- **Duplicate-identifier tsc issue (pre-existing):** if `.next/types/… 2.*` files appear,
  run `find .next -name "* 2.*" -delete` and re-run tsc.

## Next actions for Siem

1. **Review Phase 1 + 2 on localhost** (`npm run dev` → `/editie/[datum]/krant`):
   - Masthead + weather bar + topzone (Sol block + Markten + Regio tiles).
   - Lead/featured articles with image-or-hatch banner.
   - Stories with **≥2 instalments**: aside shows the vertical `TimelineCard`
     (blue VANDAAG dot + past nodes + dashed future node with prediction text).
   - Stories with **1 instalment**: aside shows compact `VerhaallijnLabel + Vooruitblik`.
   - Stories with **no thread**: full-width card, no aside column.
2. **If Phases 1 + 2 look good,** decide whether Phase 3 runs next (impact map) —
   either another idle session or a live session.
3. **Merge `idle-work/2026-07-02-krant-a3` → main** once confirmed. Use `/merge-idle-to-main`.
   No migration to apply for Phases 1–2.
