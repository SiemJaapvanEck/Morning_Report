# Krant A3 — "Dagblad + Verhaallijn" — build plan

> Idle-run plan. Redesign the full krant reading page ([EditieWeergave.tsx](../app/components/EditieWeergave.tsx))
> to the **A3 "Dagblad + Verhaallijn"** design, **keeping every current feature** and
> folding it into A3's visual language. Design source:
> `~/Downloads/Morning Report A3 (standalone).html` (internal `<title>` still says
> "Richting A2" — stale label; the file is A3).

## The A3 concept in one paragraph

A3 is a proper daily paper whose signature is the **Verhaallijn**: every deep
story is shown *as an ongoing storyline over time*. The page is:
**util bar → masthead band** (title + date + edition nr + a horizontal **weather
bar**) → **topzone** (Sol's blue "vandaag in het kort" block + a **Markten ·
intradag** data tile + an **Artikelen per regio** data tile) → per-section:
the lead/featured articles restyled into A3 cards, each paired with an **aside**
carrying (P2) the **Verhaallijn timeline** — the storyline's past instalments
"deel 1..N" → *vandaag* → the **Vooruitblik** forecast — and (P3) an **impact map
"WAAR HET SPEELT"** (WereldKaart highlighting the story's regions + geo-chips) →
summary cards → the **"Ook in het nieuws"** brief list.

## Locked decisions (agreed with Siem, 2 Jul 2026)

- **Full A3, three phases.** Deliver the complete design incl. timeline + map.
- **A3 replaces** the current sectioned-paper layout (rewrite `EditieWeergave.tsx`;
  it is the only "Lees de krant" reading view). No parallel/alt view.
- **Timeline = honest deel-nodes.** Nodes are the real editions the storyline
  appeared in (date + headline + source), then *vandaag*, then the Vooruitblik.
  **No fake UPDATE/ANALYSE tags** (those were design-only). Node typing via AI is
  explicitly out of scope.
- **Impact map = reuse WereldKaart + geo-chips.** Highlight the story's region(s)
  on the existing dotted world map; chips from place-typed entities.
- **Ignore the mockup's "Tweaks / Kleurschema" panel** — a design-tool artifact;
  the app already themes via `ThemaKiezer` (4 themes) + `dark:` classes.
- **Edition "nr."** is derived (day-of-year of `edition.date`) — no schema change.
- **Keep every feature:** ItemRating (−2…+2), follows-first section ordering,
  ripples ("gevolgen"), Vooruitblik + certainty chip (bevestigd/verwacht/gerucht),
  source + match%, image-or-hatch placeholder, empty-list graceful handling,
  Dutch UI copy, light+dark.

## Data map (what A3 needs → where it already is)

| A3 element | Source (already in the app) |
|---|---|
| masthead title/date | static + `edition.date` |
| weather bar | `SectionView.weather` (`WeatherSnapshot`) |
| Sol "vandaag in het kort" | `front_page.dp_summary` |
| section caption + summary | `front_page.dp_sections` (`{title,caption,summary}`) |
| Markten tile | `front_page.markten.indices` (`MarktIndex{regio,symbool,naam,d}`) |
| Regio tile / map counts | `front_page.regios` (`Record<RegioCode,number>`) |
| lead / featured / summary / brief | `EditionView.sections[].items[]` (bands deep/summary/headline) |
| ripples, Vooruitblik, storyline part | `item.article.ripples`, `item.prediction`, `item.storyline` |
| **timeline nodes (P2)** | `thread_items` → `editions.date` + `items(title,sources)` — **query extension, no migration** |
| **impact geo (P3)** | `item.scan_meta.regio` (RegioCode) + place-typed entities (`modules/entities`) |
| WereldKaart / MarktenKaart | `app/components/WereldKaart.tsx`, `MarktenKaart.tsx`, `wereldGrid.ts` |
| regio codes/names | `modules/shared/regios.ts` (`na,sa,eu,af,me,ru,in,ap`) |

---

## Sprint board

- [x] **Phase 1 — A3 shell + topzone + card restyle** (frontend only, no backend)
- [x] **Phase 2 — Verhaallijn timeline** (pure builder + query extension + card)
- [x] **Phase 3 — Impact map "WAAR HET SPEELT"** (pure geo helper + query + card)

Standing rule for every phase: idle branch only, **never push main**, **migration
files only — never applied live** (Siem applies in the morning), budget under the
edition ceiling, bug-backup before risky edits, gate green before close, honest
HANDOFF if blocked (never fake green). Idle "done" = code written, **gate green**
(`npm run lint && npx tsc --noEmit && npm test && npm run build`), migration files
authored — **not** live-verified.

---

## Phase 1 — A3 shell + topzone + card restyle

**Goal.** Rewrite `EditieWeergave.tsx` into the A3 layout using **only data already
in `EditionView` / `front_page`** — no query or type changes. Deliver the masthead
band, the topzone (Sol block + Markten tile + Regio tile), and all article/section
cards in A3's card vocabulary, with a **reserved aside slot** per lead/featured
story where P2's timeline and P3's map will drop in. For P1 that aside renders the
*current* inline `VerhaallijnLabel` + `Vooruitblik` so nothing is lost.

**Acceptance criteria (gate-checkable).**
- `EditieWeergave.tsx` renders, in order: masthead band (`Morning Report` + long
  Dutch date + `ochtendeditie` + derived `nr. <dayOfYear>`) with a horizontal
  **weather bar** (temp · plaats · omschrijving · min/max · neerslag% · wind);
  **topzone** = Sol blue block (`dp_summary`) + **Markten tile** (each
  `markten.indices` row: `naam` + signed `d.toFixed(2)%`, emerald up / rose down)
  + **Regio tile** (each `regios` entry: `REGIO_NAAM` + a bar scaled to the max +
  count). Tiles hide cleanly when their data is absent.
- Lead story, featured articles, summary cards, and the "Ook in het nieuws" brief
  list are all restyled to A3 `rounded-2xl border` cards; **image-or-hatch**
  placeholder treatment added (135° stone diagonal hatch when `image_url` is null).
- **Every current feature preserved:** `ItemRating` on lead+featured, follows-first
  ordering via `orderSectionsFollowedFirst`, ripples, Vooruitblik + certainty chip,
  source + match%, `VerhaallijnLabel`, empty-section/empty-brief graceful hiding.
- Atlas tokens honoured: accent `#2f6df0`, `stone` base, Archivo/Space Grotesk/
  Space Mono, emerald/amber/rose statuses; light + `dark:` both styled.
- Any new **pure** helper (e.g. edition-nr from date, bar-width scaling, market
  row formatting) lives in a pure module (`app/lib/krant.ts` or a new
  `app/lib/krant-a3.ts`) with **vitest tests**. Presentational component code needs
  no test.
- **Gate green.** No new migration, no query change, no `types.ts` change.

**Files.** `app/components/EditieWeergave.tsx` (rewrite); `app/lib/krant.ts` or new
`app/lib/krant-a3.ts` (+ `.test.ts`); reuse `MarktenKaart`/`WereldKaart` only if
convenient (the topzone tiles are list+bar tiles, not necessarily the map).

**Locked decisions.** Replace the old layout wholesale. Derive `nr.` = day-of-year
of `edition.date`. Topzone shows **both** Markten and Regio tiles. Reserve the
aside slot now so P2/P3 are purely additive. Keep all copy Dutch.

---

## Phase 2 — Verhaallijn timeline

**Goal.** Turn the buried inline "deel N" label into A3's **timeline card**: the
storyline's real instalment history as a vertical timeline — one node per past
edition the thread appeared in (date + that edition's headline + source),
highlighting *vandaag*, ending in the **Vooruitblik** node (target date + text +
certainty chip). Depends on Phase 1's aside slot.

**Acceptance criteria (gate-checkable).**
- A **pure, unit-tested** builder assembles timeline nodes from raw links —
  signature roughly `buildStorylineTimeline(links, today, prediction)` where
  `links = { edition_id, date, title, source, item_id }[]` for one thread →
  ordered `TimelineNode[]` = past nodes (one per distinct edition on/before
  `today`, ascending, deduped, each `{date,title,source,deel}`), the latest marked
  `isNow`, plus an optional `future` node from `prediction`
  (`{date,text,certainty}`). Empty/link-less input ⇒ graceful (`[]` / today-only).
  Tests cover: ordering, per-edition dedupe, deel numbering, now-marking,
  vooruitblik append, empty input. Put it in a **pure** module (`app/lib/stories.ts`
  or `modules/threads`) with a `*.test.ts`.
- `getEdition` in `app/lib/queries.ts` is extended so each deep item's `storyline`
  carries a `timeline: TimelineNode[]`. Reuse the **already-fetched** `partLinks`
  (thread_items → edition_id); extend the select to also pull each linked item's
  `title` + `sources(name)` and join `editionDates`. No extra round-trips beyond
  one enriched select. `StorylineRef`/`types.ts` updated in sync.
- A **`TimelineCard`** component renders the vertical timeline in the aside:
  past nodes (dot + date + `deel N` + headline + source), the *vandaag* node
  emphasised, a future node with the amber/emerald/stone certainty chip. Replaces
  the inline `VerhaallijnLabel` inside the lead + featured asides; the plain label
  can stay as the compact fallback when a story has no multi-edition history.
- **No migration expected.** If a covering index is wanted, author the numbered SQL
  **file only** (do not apply). `dp`/budget untouched (no AI call).
- **Gate green.**

**Files.** `app/lib/queries.ts` (extend `getEdition` + `StorylineRef`);
`app/lib/stories.ts` or `modules/threads/*` (pure builder + test);
`app/components/EditieWeergave.tsx` (new `TimelineCard`, wire into aside);
`modules/shared/types.ts` (add `TimelineNode`).

**Locked decisions.** Honest deel-nodes only — **no UPDATE/ANALYSE typing**. One
node per distinct edition (not per item). Timeline is read-only, built at query
time from existing tables. Degrade to the plain label when history = 1 edition.

---

## Phase 3 — Impact map "WAAR HET SPEELT"

**Goal.** Add A3's impact-map card to the aside: the existing dotted `WereldKaart`
highlighting where the story plays out, plus **geo-chips** (the places involved).
Depends on Phase 1's aside (sits under the timeline).

**Acceptance criteria (gate-checkable).**
- A **pure, unit-tested** helper derives a story's geography — signature roughly
  `storyGeography(regio, placeEntities)` → `{ counts: Record<RegioCode,number>,
  chips: string[] }`: `counts` highlights the story's region(s) for the map
  (item `scan_meta.regio` → its `RegioCode`, weight 1; graceful when unknown/null);
  `chips` = de-duped, title-cased place names (cap ~6). Empty input ⇒
  `{counts:{}, chips:[]}` (card hides). Tests cover: regio→code mapping, unknown
  regio, chip dedupe/cap, empty. Pure module + `*.test.ts`.
- `getEdition` attaches per deep item the **place-typed entities** of its storyline
  thread: load the thread's entities + registry (reuse `modules/entities`
  `loadRegistry`/`typeOf`), filter to `place` type, expose as `item.storyline.places`
  (or similar). Graceful when the registry is empty or a thread has no place
  entities (⇒ no chips; map falls back to `item.regio`).
- A **`ImpactMapCard`** component renders `WereldKaart` (small, card-fit, an
  appropriate `tint`) with the story's `counts` + `selectedRegio`, and the geo-chips
  below (`WAAR HET SPEELT` label). Slots into the aside beneath the `TimelineCard`.
  Hides cleanly when a story has no geography.
- **No migration expected** (place typing already shipped in F1–F5). If any SQL is
  needed, **file only**. No AI call; budget untouched.
- **Gate green.**

**Files.** `app/lib/queries.ts` (attach place entities to `storyline`);
`app/lib/stories.ts` or `modules/entities` (pure `storyGeography` + test);
`app/components/EditieWeergave.tsx` (new `ImpactMapCard`, wire into aside);
reuse `app/components/WereldKaart.tsx`, `modules/shared/regios.ts`,
`modules/entities/*`.

**Locked decisions.** Reuse `WereldKaart` (don't build a new map). Chips from
`place`-typed entities only; map highlight from `item.regio`. Cap chips at ~6.
Everything degrades to "no map" gracefully — a story without geography must not
break the aside.

---

## Morning review (Siem)

After the run: apply any authored migration files (expected: none), `npm run dev`,
open **Jesse** profile → "Lees de krant" on the 28 June-style edition, and check:
masthead+weather+topzone tiles render; each lead/featured story shows the
Verhaallijn timeline (deel 1..N → vandaag → Vooruitblik) and the impact map; every
old feature (ratings, follows-first, ripples, Vooruitblik chip) still works. Then
decide on merging `idle-work/<date>` → `main`.
