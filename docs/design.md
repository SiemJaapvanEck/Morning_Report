# Designsysteem — "Atlas"

> **SUPERSEDED (7 July 2026): the visual system now lives in
> [`docs/brandbook.md`](brandbook.md)** — tokens, type scale, component
> recipes and layout grids for the whole app (dashboard + krant). This file
> stays as historical context for the Atlas decision; don't extend it.
>
> Vastgelegd 14 juni 2026. **Overschrijft bewust de eerder voorgestelde
> "Dispatch"-richting** (besluit van Siem). De Dispatch-spec staat nog in de
> git-history (commit `f0ed210`) mochten we later herzien. Atlas is een bold
> bento-dashboard: elke editie is een dashboard van tegels.

## Bron van waarheid
- Referentie-ontwerp: `Morning Report design/atlas-daily.jsx` (untracked map).
- Implementatie: de `Edition*`-componenten in `app/components/`
  (`EditionView`, `EditionNav`, `EditionScreen`, `EditionOverview`,
  `SwipePager`) + `WereldKaart` / `MarktenKaart`.

## Kleur
- Accent **`#2f6df0`** (blauw): interactie, Sol, volgen, selectie en "vandaag".
- Basis: Tailwind **`stone`**-palet; `bg-white` kaarten op een `stone-50`-dak.
- Status: **amber** (`amber-50`/`amber-800`) voor "in de maak"; **emerald/rose**
  voor markt-winst/verlies.
- Donker: **class-based `dark:`-varianten** (anti-flits-script in `layout.tsx`);
  thema's Krant/Sepia/Mint/Nacht via `data-theme` + `localStorage` (`mr_thema`).

## Typografie (via `next/font`, gescoped in de componenten)
- **Archivo** — koppen (extrabold, strakke tracking).
- **Space Grotesk** — lopende tekst.
- **Space Mono** — labels, metadata, datums, percentages/data.

## Bouwstenen
- Tegel: `rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900`.
- **Hero** ("Dagelijkse briefing"): blauw vlak (`bg-[#2f6df0]`, witte tekst) —
  kop = best-passende verhaal, Sol-intro, statstrook, "Lees de krant"-knop naar
  de volledige krant.
- **Verhaalkaart** ("Sol's selectie"): beeld of arcering-placeholder,
  categorie-tag, match-%, titel (Archivo), samenvatting, rating −2…+2 (`ItemRating`).
- Foto-placeholder: 135°-arcering in stone/wit-tinten.

## Layout & navigatie
- Vol-breed shell (`app/layout.tsx`); leespagina's houden een rustige kolom.
- Elke editie = hetzelfde dashboard: `/` = vandaag, `/editie/[datum]` = elke dag.
- **Kalendernavigatie:** `EditionNav` (Today + mini-maandkiezer met editie-stippen
  + Dag/Week/Maand/Jaar), `SwipePager` (veeg / horizontaal scrollen / pijltjes),
  `EditionOverview` (week = dagkaarten, maand = kaart-kalender, jaar = mini-maanden).
- **Lees-hiërarchie (3 lagen):** dashboard (cover) → "Lees de krant" → volledige
  krant op `/editie/[datum]/krant`. (Depth-2 "Daily Paper" volgt met de Redactie.)

## Regels
- UI-teksten Nederlands; geen lorem ipsum.
- Geen zware component-libraries; kleine client-componenten alleen waar interactie
  nodig is, de rest server components.
