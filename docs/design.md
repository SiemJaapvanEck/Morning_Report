# Designsysteem — "Dispatch"

> Vastgelegd op 11 juni 2026 na de Claude Design-ronde (richting D,
> "Dispatch · Morning Report"). Dit is de **vaste stijl** van de app:
> alle vormgeving loopt via de tokens en klassen in `app/globals.css`.
> Dit document beschrijft het systeem en de regels; de waarden zelf
> staan op één plek, in `app/globals.css`.

## Regels (kort)

1. **Componenten gebruiken uitsluitend tokens** — via Tailwind-utilities
   (`bg-paper`, `bg-card`, `text-ink`, `text-muted`, `text-faint`,
   `border-line`, `text-blue`, `bg-blue-soft`, `text-red`, `text-green`,
   `rounded-card`, `rounded-hero`, `rounded-rail`, `rounded-media`,
   `rounded-tag`) of via de `mr-*`-componentklassen.
2. **Nooit** losse hexwaarden of standaard-Tailwind-paletten
   (stone/amber/sky/emerald/rose) in componenten.
3. **Geen `dark:`-klassen.** Donkere modus werkt automatisch: de tokens
   krijgen donkere waarden via `prefers-color-scheme` in `globals.css`.
   Donker bijstellen = alleen daar.
4. Nieuwe UI eerst tegen dit document houden; past het patroon niet,
   dan het patroon hier (en in `globals.css`) uitbreiden — niet ad hoc
   in een component.

## Palet

| Token | Licht | Rol |
|---|---|---|
| `--paper` | `#f0eee9` | paginadak — warm gebroken wit |
| `--card` | `#ffffff` | kaarten, header, footer |
| `--ink` | `#16140f` | primaire tekst |
| `--muted` | `#6f6a5e` | secundaire tekst (deks, samenvattingen) |
| `--faint` | `#a8a294` | tertiair: timestamps, bijschriften, placeholders |
| `--line` | `#e7e2d6` | randen en scheidingslijnen (standaard-borderkleur) |
| `--blue` | `oklch(0.48 0.17 256)` | **interactie**: links, hover, selectie, volgen, Sol |
| `--blue-soft` | `oklch(0.95 0.03 256)` | zachte vlakken: Sol's intro/notities, banners |
| `--red` | `oklch(0.56 0.19 24)` | **live/nu**, negatief, waarschuwingen |
| `--green` | `oklch(0.55 0.13 150)` | positief (scores, later koersen) |

Kleursemantiek is betekenis, geen smaak: blauw = "kun je aanraken/van Sol",
rood = "nu/live of negatief", groen = "positief". De donkere variant is een
afgeleide van hetzelfde warme palet (zie `globals.css`).

## Typografie

- **Archivo** (`font-sans`, variabel 400–900) — koppen en lopende tekst.
  Koppen: `font-extrabold`/`font-black` met strakke tracking
  (`tracking-tight` of −0.9px bij grote koppen, regelafstand ~1.05).
- **Space Mono** (`font-mono`, 400/700) — alles wat "data" is: kickers,
  tags, timestamps, metadata, cijfers/percentages, statussen.
- Beide geladen in `app/layout.tsx` via `next/font` (variabelen
  `--font-archivo` en `--font-space-mono`).

## Componentklassen (`app/globals.css`)

| Klasse | Patroon |
|---|---|
| `.mr-kicker` | klein mono-label, uppercase, brede tracking (HET WEER, DAILY PAPER) — kleur per geval: `text-faint`/`text-muted`/`text-blue`/`text-red` |
| `.mr-tag` | omrande mono-chip (categorie, status); rand volgt de tekstkleur |
| `.mr-card` | witte kaart met `--line`-rand, radius `--radius-card` |
| `.mr-lift` | klikbare kaart: tilt 2px op met zachte schaduw bij hover |
| `.mr-headlink` | kop die bij hover blauw kleurt |
| `.mr-photo` | foto-placeholder: schuine arcering (135°) in papier-tinten |
| `.mr-btn` | pill-knop (terugknoppen e.d.), hover → blauw |

## Radii

`--radius-card` 16px (kaarten) · `--radius-hero` 18px (weer-hero) ·
`--radius-rail` 14px (accentvlakken zoals Sol's blok) · `--radius-media`
10px (foto's) · `--radius-tag` 2px (mono-chips). Inputs/knoppen:
`rounded-lg`; pills: 20px (`.mr-btn`) of `rounded-full`.

## Layout

- **Shell** (header/main/footer): `max-w-5xl`, `px-5`; sticky witte
  header (60px) met logotype **MORNING REPORT** + rode mono-sublabel
  "● Daily paper" + mono-datum; witte footer met mono-kicker.
- **Leespagina's** (editie, archief, instellingen): binnenkolom
  `max-w-3xl mx-auto` — de krant blijft een rustige leeskolom.
- **Dashboard** (voorpagina): telefoon-eerst; kaartgrids
  `grid-cols-2 md:grid-cols-3`.
- Secties scheiden met `border-b` (kleur is automatisch `--line`),
  sectiekoppen: Archivo extrabold + rechts een `mr-kicker`.

## Vaste patronen

- **Weer-hero**: één dichte witte kaart (`rounded-hero`) — groot getal
  (extrabold, tracking −3px), conditie, mono-metricsgrid met
  `border-t`-scheiding; rechterkolom (border-l) voor "Vandaag in cijfers".
- **Lead-kaart** ("Daily paper"): tags bovenin, grote kop, muted dek,
  blauwe mono-link "Lees de krant →" waarvan de pijl-gap groeit bij hover.
- **Sol**: alles van Sol leeft op `bg-blue-soft` (`rounded-rail`) met
  blauwe kicker en, bij de intro, een blauwe avatar-cirkel "S".
- **Artikelkaarten**: `mr-card` + beeld (`.mr-photo` als placeholder,
  `scale-1.03` bij hover), blauwe categorie-tag, bold kop
  (`mr-headlink`), muted beschrijving, match-% als mono-badge op het
  beeld, rating onderin.
- **Editie-punten**: blauwe rand-stippen op een `--line`-draad; vandaag
  = rood gevuld (semantiek "nu"), hover schaalt op.
- **Rating**: mono-chips −2…+2 — geselecteerd positief groen, negatief
  rood, 0 muted (omrand als tag); volg-markering ◉ blauw.

## Gereserveerd (voor toekomstige modules — zo bouwen we consistent door)

- **Tickerbalk** onder de header (paper-bg, mono, 34px) — voor de
  financiële module: `SYMBOOL waarde +x,x%` met groen/rood.
- **Rails** naast secties (320px-kolom op desktop): commentary-kaart
  (blue-soft, quote + auteur-chip) en markets-kaart (witte kaart, LIVE-dot,
  sparkline) bestaan al als patroon in het ontwerp (richting D).
- **Horizontale tijdlijn** voor onderwerp-detail (nodes op een draad,
  actieve node opgelicht) — voor vervolg-tracking/roadmap.
- **Categorie-hues**: tags kunnen later per categorie een eigen
  `oklch`-tint krijgen (zoals in het ontwerp); tot die beslissing zijn
  alle categorie-tags blauw.

## Herkomst

Claude Design-export (11 juni 2026): richtingen A–D, gekozen richting D
"Dispatch" (long-form ochtendkrant). Referentiewaarden komen uit
`directionD.jsx` van die export; de zip staat lokaal, niet in de repo.
