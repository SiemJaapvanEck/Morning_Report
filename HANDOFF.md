# HANDOFF — stand van zaken

> Laatst bijgewerkt: 14 juni 2026, sessie op account Siem.
> Lees dit eerst bij het oppakken van het project; werkafspraken staan in CLAUDE.md.

## Waar we staan

De pipeline is **opgeschaald** (16 → 71 bronnen, incl. podcast/video-media) en de
**editie is herontworpen als een kalender**: elke dag is hetzelfde Atlas-dashboard,
met Dag/Week/Maand/Jaar-navigatie en veeg-bladeren. Een editie kost nu ±€0,14
(plafond €0,30). Alle poorten groen (lint/tsc/test/build). **Deze sessie is nog
NIET naar GitHub gepusht** — zie "Wat nu openstaat".

### Fase 1 — ingestie-opschaling + media-plumbing (migratie 0007)
- **71 actieve bronnen** (was 16): de volledige §5-lijst uit `docs/ontwerp.md`
  (wire/tech/AI/wetenschap/games/finance/NL-lokaal/subreddits) + een curated set
  **uitleg-media**. Migratie `0007_sources_expand.sql` (idempotent, geguard op url).
- **Media als bron** via een nieuwe kolom `sources.medium` (`article`/`podcast`/`video`).
  Podcasts (RSS-enclosure) en YouTube-kanalen (`feeds/videos.xml?channel_id=…`, keyless)
  komen via dezelfde `fetchFeed`. `modules/shared/feeds.ts` kreeg `extractMedia()` +
  `parseDuration()` (+ `itunes:duration`-veld); de afspeel-URL/duur landt in
  `items.scan_meta.media` (`MediaMeta` in types.ts).
- **Media slaat de 48u-versheidsregel over** (uitleg is evergreen) — `modules/ingest`.
  De scan-stap **merget** nu `scan_meta` i.p.v. overschrijven, zodat media bewaard blijft.
- **scan_rank-cap 6 → 12 rondes** (~600 items/dag) voor de bredere bronnenlijst.
- Geverifieerd: 6/6 YouTube-channel-id's geldig, ~725 media-items opgehaald
  (vooral podcast-backcatalogs). **Bekend:** Reddit + BleepingComputer geven 403 aan
  bots (niet-blokkerend, bewust gelaten); 1 media-item lekt nu nog in een gewone sectie
  (routing eruit = latere fase).

### Editie-UI = kalender (homepage én /editie/[datum] zijn hetzelfde scherm)
- **`EditionView`** (`app/components/EditionView.tsx`) is de gedeelde Atlas-dashboard­weergave
  van één editie (verving en verwijderde `VoorpaginaAtlas`). Datum-gebaseerd; de
  "Lees de krant"-knop wijst naar de volledige krant. `WereldKaart` kreeg een `basePath`
  zodat de regio-klik op een datumpagina op die pagina blijft.
- **`EditionNav`** (client): `‹ Today ›` (springt naar de dichtstbijzijnde dag mét editie),
  een **mini-maandkiezer** met stippen op dagen die een editie hebben, en een
  **Dag/Week/Maand/Jaar**-schakelaar. URL-gedreven (`?view=`), deelbaar.
- **`SwipePager`** (client): veeg / horizontaal scrollen / pijltjes ←→ bladert tussen
  edities (prefetcht buren).
- **`EditionOverview`**: Week = horizontale dagkaarten (7-op-desktop → 2-op-mobiel),
  Maand = kaart-kalender (kop op sm+, dag+stip op mobiel), Jaar = 12 mini-maanden.
- **Lees-hiërarchie (3 lagen):** cover = dashboard → "Lees de krant" → **volledige krant**
  op **`/editie/[datum]/krant`** (`EditieWeergave`, hierheen verplaatst). Een datum zonder
  editie toont `LegeHero` (geen 404), zodat je vrij kunt bladeren.
- Nieuw: `app/lib/dates.ts` (datumhelpers), `listEditionSummaries` in `app/lib/queries.ts`
  (voedt de stippen/overzichten), `EditionScreen` (nav + dag/overzicht). ESLint negeert nu
  de untracked map `Morning Report design/`.

### Volgende track: de "Redactie" (afgesproken, nog te bouwen)
Een klein AI-redactieteam als **persona-prompts + stappen (GEEN agent-runtime)**:
Tech-, Politiek-, Financieel-expert + Journalist (generalist), met **Sol als
hoofdredacteur** die de **Daily Paper** schrijft (de "bigger summary" achter de
Sol-knop = depth-2 in de lees-hiërarchie). Dit is fase 4–5 van het masterplan,
omgezet naar genoemde desks. Tot die er is, linkt de "Lees de krant"-knop naar de
volledige krant.

### Onveranderd, nog steeds geldig
- **AI-provider = Grok (xAI)** via `modules/shared/ai.ts` (`askAI()`): `grok-4.20…` (scan)
  + `grok-4.3` (deep/Sol). Anthropic omschakelbaar (`AI_PROVIDER=anthropic`).
- **Supabase live + RLS**: project "Morning Report." (`iqhyndhrlhjfdrwjvmjv`, eu-west-1),
  alleen service-role. Migratie 0007 is **al toegepast** op de live DB.
- **Vercel**: auto-deploy op elke push naar `main`. Vaste URL:
  `morning-report-siemjaapvanecks-projects.vercel.app`. Deployment Protection uit.
- Accountvoorkeuren/onboarding, developer-modus + thema's, weer + markten-kaart: ongewijzigd.

## Wat nu nog openstaat
1. **Pushen naar `main` / Vercel-deploy.** Deze commit staat lokaal; productie draait nog
   de oude code tegen de nieuwe DB. Migratie 0007 is puur additief (oude code negeert
   `sources.medium`), dus veilig — maar de nieuwe UI + bredere ingestie zijn pas live ná
   een push. Wachten op groen licht van Siem.
2. **Redactie-track bouwen** (zie boven) — eerstvolgende functionele klus.
3. **Restant masterplan** (zie `project-scale-pipeline-goal`): story-clustering, deep-research
   6–12 topics, Sol per-categorie/per-continent, select-caps → ~160 zichtbare items, budget→€0,50.
4. **Eerder openstaand:** retro-vertaling NL → Engels van bestaande code; bevestigen dat de
   cron-job.org-job daadwerkelijk loopt (`docs/setup.md` §4).

## Bekende aandachtspunten
- **Preview-editie `2099-01-01`** staat nog in de DB (handige niet-vandaag-testfixture; mag weg).
- **Media-backcatalog is groot** (~725 items): podcast-feeds leveren honderden oude afleveringen
  doordat media de versheidsgrens overslaat. Prima voor de latere catch-up-bibliotheek; eventueel
  later per media-feed cappen.
- **403-feeds** (Reddit-subreddits, BleepingComputer): blokkeren datacenter-requests, geven ⚠ in
  Instellingen, niet-blokkerend.
- **Open-Meteo** (weer) wisselvallig: 4 retries, niet-blokkerend.
- **Postgres `current_date` is UTC**; editie-datums via `todayLocal()` (Europe/Amsterdam).
- **Git-auth**: OAuth-token (SiemJaapvanEck) in de macOS-keychain; `git push/pull` werkt.
  `gh auth status` zegt "niet ingelogd" (token mist read:org) — dat klopt, git zelf werkt.
