# HANDOFF — Krant A3 "Dagblad + Verhaallijn" (Phases 1–3, complete)

> **Last updated:** 3 July 2026 (idle run — Phase 3 done) — `idle-work/2026-07-02-krant-a3`
> **Sprint board:** `docs/krant-a3-plan.md`.

## What this arc is

A wholesale redesign of the krant reading page (`app/components/EditieWeergave.tsx`)
to the **A3 "Dagblad + Verhaallijn"** layout, keeping every current feature.
The signature of A3 is the **Verhaallijn aside** on each deep story — a vertical
timeline of the storyline's instalments (P2) plus an impact map (P3).

Three phases — **all three done:**

- **Phase 1** ✅ — A3 shell, masthead band, topzone tiles, image-or-hatch cards, aside slot.
- **Phase 2** ✅ — Verhaallijn timeline (pure builder + query extension + TimelineCard).
- **Phase 3** ✅ — Impact map "WAAR HET SPEELT" (geo helper + ImpactMapCard).

---

## Where we stand (after Phase 3)

All three phases are committed on `idle-work/2026-07-02-krant-a3`.
**Gate green** (lint ✓ · tsc ✓ · 315 tests ✓ · build ✓). Not yet live-verified —
Siem reviews in the morning.

### What Phase 3 shipped

- **`app/lib/stories.ts`** — Added:
  - Import of `isRegioCode` from `modules/shared/regios` (relative import — the `@/`
    alias works for type-only imports but not value imports in vitest).
  - **`storyGeography(regio, placeEntities)`** → `{ counts: Record<string,number>, chips: string[] }`:
    - `counts`: maps the item's `regio` to weight 1 when it's a valid `RegioCode`; `{}` otherwise.
    - `chips`: de-duped, title-cased place-entity canonical names, capped at 6.
    - Empty/null input → `{counts:{}, chips:[]}` (card hides itself).

- **`app/lib/stories.test.ts`** — 9 new tests for `storyGeography`:
  empty input, valid regio→counts, unknown regio graceful, null regio, title-casing,
  case-insensitive dedup, cap-at-6, combined regio+places, empty-string skipping.
  Total: **315 tests**.

- **`app/lib/queries.ts`**:
  - `StorylineRef` gains `places: string[]`.
  - Threads select extended to also pull `entities` (the thread's normalized entity set).
  - After building `threadById`, one targeted select queries `entities` table for only
    the `norm_key` values that appear in any thread's `entities` array, filtered to
    `type = 'place'`. Builds `placeCanonical: Map<norm_key, canonical_name>`.
  - Per-thread `places` list built from canonical names of place-typed entities.
  - `storylineByItem.set(...)` now includes `places: placesByThread.get(thread.id) ?? []`.

- **`app/components/EditieWeergave.tsx`** — Added:
  - Import of `storyGeography` from `@/app/lib/stories`.
  - Import of `WereldKaart` from `./WereldKaart`.
  - **`ImpactMapCard`** component: calls `storyGeography(regio, places)`, hides when both
    `counts` and `chips` are empty. Renders a `WAAR HET SPEELT` label, then `WereldKaart`
    (h-20, `pointer-events-none` so it's display-only in the aside context), then the
    geo-chips as rounded-full badges. Separated from the timeline above by a top border.
  - `VerhaallijnAside` now renders `<ImpactMapCard regio={item.regio} places={item.storyline?.places ?? []} />`
    below the timeline/label block (replaces the `{/* P3: ... */}` placeholder).

### Decisions taken unattended

**`pointer-events-none` on the map container.** `WereldKaart` renders its regions
as anchor tags when they have `n > 0`, which would navigate the reader away from the
krant page. Since the aside map is purely informational (showing where the story
plays out), the container uses `pointer-events-none` to suppress click/hover rather
than modifying `WereldKaart` itself. This satisfies the "reuse `WereldKaart` (do NOT
build a new map)" locked decision.

**Relative import for `isRegioCode`.** The `@/` path alias works for type-only imports
(erased at runtime) but vitest doesn't resolve it for value imports. Changed the import
in `stories.ts` to `../../modules/shared/regios` (relative). TypeScript, lint, and
Next.js all accept this — the relative path resolves to the same module.

**Targeted `entities` table select.** Rather than calling `loadRegistry()` (loads all
entities), the implementation queries `entities` only for the norm_keys actually
present in the relevant threads, filtered to `type = 'place'`. One extra DB round-trip
per edition load; graceful when no threads have entities (the `allNormKeys.length`
guard short-circuits to `[]`).

---

## What's open

**Nothing.** The A3 redesign arc is complete — Phases 1, 2, and 3 are all done and
gate-green. The branch is ready for Siem's morning review and merge decision.

---

## Known issues / gotchas

- **Not yet live-verified.** Siem reviews Phases 1–3 together on localhost in the
  morning. To see Phase 3:
  - Open an edition with a deep story that has a thread with `regio` set **and/or**
    place-typed entities in its entity set.
  - The aside will show the `ImpactMapCard` below the timeline/label block.
  - A story without geography (null/invalid regio, no place entities) shows no map card
    — the aside still shows timeline + prediction, just without the map section.
- **`eslint-disable-next-line @next/next/no-img-element`** in `ImageBanner` — intentional.
- **Aside conditional grid:** single-column when no storyline + no prediction.
- **DST-safe `dayOfYear`:** fixed via `Date.UTC` — see the comment in `krant-a3.ts`.
- **Duplicate-identifier tsc issue (pre-existing):** if `.next/types/… 2.*` files appear,
  run `find .next -name "* 2.*" -delete` and re-run tsc.

## Next actions for Siem

1. **Review Phases 1–3 on localhost** (`npm run dev` → `/editie/[datum]/krant`):
   - Masthead + weather bar + topzone (Sol block + Markten + Regio tiles).
   - Lead/featured articles with image-or-hatch banner.
   - Stories with **≥2 instalments**: aside shows the vertical `TimelineCard`
     (blue VANDAAG dot + past nodes + dashed future node with prediction text).
   - Stories with a thread that has place-typed entities or a non-null `regio`:
     aside shows `WAAR HET SPEELT` section with the dotted world map +
     optional place-name chips.
   - Stories with **1 instalment**: aside shows compact `VerhaallijnLabel + Vooruitblik`.
   - Stories with **no thread**: full-width card, no aside column.
2. **Merge `idle-work/2026-07-02-krant-a3` → main** once confirmed. Use `/merge-idle-to-main`.
   No migration to apply for Phases 1–3.
