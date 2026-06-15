# HANDOFF — stand van zaken

> Laatst bijgewerkt: 14 juni 2026, sessie op account Siem.
> Lees dit eerst bij het oppakken van het project; werkafspraken staan in CLAUDE.md.

## Waar we staan

De pipeline is **opgeschaald** (16 → 71 bronnen, incl. podcast/video-media) en de
**editie is herontworpen als een kalender**: elke dag is hetzelfde Atlas-dashboard,
met Dag/Week/Maand/Jaar-navigatie en veeg-bladeren. **Nieuw deze sessie: de
AI-redactie (slice 1)** — vijf vakredacteuren schrijven beat-samenvattingen en
**Sol stelt als hoofdredacteur de Daily Paper samen**. Een editie kost nu ±€0,16
(plafond €0,30). Alle poorten groen (lint/tsc/test/build) en **gepusht naar
`main`** (Vercel-deploy loopt; zie ook de design-resolutie hieronder).

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

### Designsysteem = Atlas (Dispatch overschreven, 14 juni)
Tijdens het pushen bleek `main` gedivergeerd: een collega had het **"Dispatch"-
designsysteem** gepusht (commit `f0ed210`): nieuwe `docs/design.md`, CLAUDE.md-
designsectie omgezet naar verplichte tokens/`mr-*`-klassen, en `ItemRating`/
`ProfielKiezer`/`CaptureFormulier`/manifest herstyled — maar **zonder de tokens in
`app/globals.css`** (die ontbreken), dus die klassen waren ongedefinieerd. Op verzoek
van Siem is **Atlas geforceerd als de vaste stijl**: CLAUDE.md-designsectie en
`docs/design.md` herschreven naar Atlas, en de vier Dispatch-bestanden teruggezet naar
hun pre-Dispatch (Atlas) versie. **Dispatch blijft in de git-history** (`f0ed210`).
**Nog te coördineren met de collega** over de definitieve richting.

### Redactie (Daily Paper) — slice 1 gebouwd
Een klein AI-redactieteam als **persona-prompts + stappen (GEEN agent-runtime)**.
- **`modules/redactie`**: vijf redacteuren met persona-prompts in
  `modules/redactie/prompts/*.md` — Tech & Wetenschap, Politiek & Wereld,
  Financieel, Algemeen (journalist) en **Voor jou** (de persoonlijke, gebruiker-
  specifieke desk). De desk→categorie-map is config. `writeDeskSummary()` +
  `assembleUserContext()` (cross-ref axis A: markeert gevolgde onderwerpen met ★).
- **Pipeline**: nieuwe stap `desks` (één desk per tick, requeue, idempotent) +
  `sol_daily_paper`. `modules/sol` kreeg `writeDailyPaper()` (Sol = hoofdredacteur).
  `finalize` zet de beat-samenvattingen + de Daily Paper in `front_page`
  (`FrontPage.desks` + `daily_paper`). Volgorde: … generate → desks →
  sol_daily_paper → sol_intro → finalize.
- **UI**: de Daily Paper (Sol's hoofdartikel + de 5 beat-samenvattingen) rendert
  bovenaan de "Lees de krant"-pagina (`EditieWeergave`).
- **Geverifieerd** op preview-editie `2099-01-02`: 5 desks + Daily Paper, €0,156,
  geen console-fouten, alle poorten groen.
- **Volgende slices** (zie `project-scale-pipeline-goal` + plan): entity-extractie +
  story-clustering (de rijke cross-ref-sleutel), per-desk deep-research-briefs,
  cross-ref axis B (eerder nieuws → "verwijzing") en C (portefeuille-hook),
  Sol-geheugen schrijven/compacteren, en een eigen depth-2 Daily-Paper-route.

### Onveranderd, nog steeds geldig
- **AI-provider = Grok (xAI)** via `modules/shared/ai.ts` (`askAI()`): `grok-4.20…` (scan)
  + `grok-4.3` (deep/Sol). Anthropic omschakelbaar (`AI_PROVIDER=anthropic`).
- **Supabase live + RLS**: project "Morning Report." (`iqhyndhrlhjfdrwjvmjv`, eu-west-1),
  alleen service-role. Migratie 0007 is **al toegepast** op de live DB.
- **Vercel**: auto-deploy op elke push naar `main`. Vaste URL:
  `morning-report-siemjaapvanecks-projects.vercel.app`. Deployment Protection uit.
- Accountvoorkeuren/onboarding, developer-modus + thema's, weer + markten-kaart: ongewijzigd.

## Wat nu nog openstaat
1. **Designrichting afstemmen met de collega.** Atlas is nu geforceerd (zie
   "Designsysteem = Atlas"); Dispatch (`f0ed210`) staat in de history. Beslis samen wat
   de vaste richting wordt voordat er meer UI-werk gebeurt.
2. **Redactie afmaken** (volgende slices, zie boven): entity-extractie + clustering,
   per-desk deep-research-briefs, cross-ref B/C, Sol-geheugen, depth-2 Daily-Paper-route.
3. **Restant masterplan** (zie `project-scale-pipeline-goal`): story-clustering, deep-research
   6–12 topics, Sol per-categorie/per-continent, select-caps → ~160 zichtbare items, budget→€0,50.
4. **Eerder openstaand:** retro-vertaling NL → Engels van bestaande code; bevestigen dat de
   cron-job.org-job daadwerkelijk loopt (`docs/setup.md` §4).

## Bekende aandachtspunten
- **Preview-edities `2099-01-01` en `2099-01-02`** staan nog in de DB (testfixtures;
  `2099-01-02` draagt de redactie/Daily Paper; mogen weg).
- **`.claude/`-tooling untracked**: de `push-main`/`start`-skills, de `guard-push-main`-hook
  en `settings.json` staan lokaal (niet in git, net als `launch.json`). Bewust gelaten;
  commit ze als je ze tussen accounts wilt delen.
- **Media-backcatalog is groot** (~725 items): podcast-feeds leveren honderden oude afleveringen
  doordat media de versheidsgrens overslaat. Prima voor de latere catch-up-bibliotheek; eventueel
  later per media-feed cappen.
- **403-feeds** (Reddit-subreddits, BleepingComputer): blokkeren datacenter-requests, geven ⚠ in
  Instellingen, niet-blokkerend.
- **Open-Meteo** (weer) wisselvallig: 4 retries, niet-blokkerend.
- **Postgres `current_date` is UTC**; editie-datums via `todayLocal()` (Europe/Amsterdam).
- **Git-auth**: OAuth-token (SiemJaapvanEck) in de macOS-keychain; `git push/pull` werkt.
  `gh auth status` zegt "niet ingelogd" (token mist read:org) — dat klopt, git zelf werkt.
