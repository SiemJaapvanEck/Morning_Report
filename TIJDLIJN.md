# Tijdlijn

Chronologisch logboek van het project. Eén regel (of kort blok) per
werksessie of mijlpaal — details horen in HANDOFF.md en git-history.

- **6 juni 2026** — Ontwerpfase afgerond op claude.ai: levend ontwerpdocument
  met architectuur (Vercel + Supabase + externe scheduler), onderwerpen,
  bronnen, interessemotor, Sol, budget-plafond ~€0,30/editie.
  Stack bevestigd: Next.js App Router + TypeScript.
- **10 juni 2026** — Fundament + eerste verticale plak gebouwd (fase 1+2):
  repo-scaffold (Next.js 16, Tailwind 4), Supabase-schema (18 tabellen,
  claim_next_step RPC), stappenmachine-pipeline, budget-guard, modules
  (ingest/rank/generate/sol/archive/calendar/weather), lezer-UI, PWA-shell,
  20 unit-tests. Build/lint/test groen. Commit 4bcaacf.
- **11 juni 2026** — Supabase-project live gekoppeld via connector: migraties
  toegepast (init + starterset). `.env.local` opgezet (service-role-key en
  Anthropic-key nog in te vullen). GitHub CLI geïnstalleerd + device-flow-auth.
  CLAUDE.md (werkafspraken), HANDOFF.md en TIJDLIJN.md ingericht voor
  sessie-overdracht tussen accounts. `.claude/launch.json` toegevoegd voor
  het Launch-voorbeeldpaneel.
- **11 juni 2026 (vervolg)** — Eerste push naar GitHub
  (SiemJaapvanEck/Morning_Report). De repo bevatte een ouder Vite+FastAPI-
  prototype; via ours-merge vervangen door het Next.js-platform (prototype
  blijft in de historie). Git-token in macOS-keychain.
- **11 juni 2026 (nacht)** — 🎉 **Eerste editie end-to-end gegenereerd.**
  Provider-router gebouwd (`askAI()`): Grok/xAI actief, Claude omschakelbaar.
  RLS aan op alle tabellen (migratie 0003). Vervolgstap-patroon toegevoegd
  zodat scan_rank en generate zichzelf opdelen — alle stappen <10s
  (Vercel-klaar). Kosten per editie: ±€0,03. Nog te doen: Vercel + scheduler.
- **11 juni 2026 (vervolg 2)** — Vercel-import gedaan (auto-deploy op push aan).
  Scheduler-sectie in `docs/setup.md` §4 volledig uitgewerkt met exacte
  cron-job.org-velden + uitleg waarom geen Vercel-cron.
- **11 juni 2026 (vervolg 3)** — Vercel Deployment Protection uitgezet
  (login-loos ontwerp). Productie-endpoint live geverifieerd: 401 zonder
  geheim, 200 + JSON mét. Vaste productie-URL vastgelegd in docs/handoff:
  `morning-report-siemjaapvanecks-projects.vercel.app`.
- **11 juni 2026 (vervolg 4)** — Cron end-to-end getest tegen productie:
  editie verwijderd en via 23 tikken op de productie-URL volledig herbouwd
  (status done, €0,048, alle stappen <12s). Open-Meteo bleek wisselvallig →
  weermodule kreeg 4 interne retries (build groen). Laatste open stap blijft:
  cron-job.org-job aanmaken.
- **11 juni 2026 (vervolg 5)** — Voorpagina omgebouwd naar het dashboard van
  de whiteboard-schets: weer/stats-kopstrook, puntenrij van edities, Daily
  paper-kaart en "Sol's selectie" (artikelkaarten met afbeelding, categorie,
  match-% en rating −2…+2). Migratie 0004 (items.image_url +
  edition_items.match_score) toegepast; feedparser haalt afbeeldingen uit
  feeds; select-stap schrijft match_score. Editie van vandaag gebackfilld
  (55 scores, 32 afbeeldingen). Alle poorten groen.
- **12 juni 2026** — Accountvoorkeuren gebouwd: onboarding-stap (defaults
  voorgeselecteerd: tech/financieel/wereld/wetenschap/goed-nieuws) +
  bewerkbare Interesses in Instellingen. Relevantie −2…+2 seedt topic_scores
  (×0.3); eigen (hyper-specifieke) topics met evt. nieuwe categorie en
  zoektekst. Migratie 0005 (goed-nieuws + 2 bronnen). Scan-stap wijst nu per
  artikel een topic toe zodat topic-voorkeuren echt in de match-% doorwerken.
- **12 juni 2026 (vervolg)** — Topic ↔ bron-koppeling: eigen onderwerpen
  kunnen optioneel aan één vaste bron hangen (migratie 0006,
  topics.source_id). Ingest zet het topic dan direct; scan respecteert dat.
  Zonder koppeling de normale zoekweg. Bron-dropdown in de voorkeurenkiezer.
- **12 juni 2026 (vervolg 2)** — Developer-modus in Instellingen: quick
  pipeline test met live log, oude test-edities seeden + opruimen
  (modules/dev, /api/dev). 3 oude edities (8–10 juni, 24 artikelen) geseed.
  Kleurthema's Krant/Sepia/Mint/Nacht als stip-knoppen in de koptekst
  (class-based dark, anti-flits-script, localStorage).
- **14 juni 2026 — Fase 1: ingestie-opschaling + media-plumbing.** Bronnen
  16 → 71 (volledige §5-lijst + curated uitleg-media), migratie 0007 met
  nieuwe kolom `sources.medium`. Podcasts/YouTube komen via dezelfde RSS-weg:
  `extractMedia()`/`parseDuration()` in feeds.ts → `items.scan_meta.media`;
  media slaat de 48u-versheidsregel over en de scan merget scan_meta i.p.v.
  overschrijven. scan_rank-cap 6 → 12 rondes. Geverifieerd op een preview-editie
  (67 items, €0,14, ~725 media-items). Poorten groen.
- **14 juni 2026 (vervolg) — Editie-UI herontworpen als kalender.** Gedeelde
  `EditionView` (Atlas-stijl, verving `VoorpaginaAtlas`) voor homepage én
  /editie/[datum]. Nieuw: `EditionNav` (Today/mini-maandkiezer/Dag-Week-Maand-Jaar),
  `SwipePager` (veeg/scroll/pijltjes), `EditionOverview` (week = dagkaarten, maand =
  kaart-kalender, jaar = mini-maanden), `app/lib/dates.ts`, `listEditionSummaries`.
  Lees-hiërarchie: dashboard → volledige krant op `/editie/[datum]/krant`. Lege dag =
  LegeHero (geen 404). Volledig responsief; poorten groen. Volgende track: de Redactie.
- **14 juni 2026 (vervolg 2) — Gepusht; design-divergentie opgelost (Atlas).** Bij het
  pushen bleek `main` gedivergeerd met een collega-commit (`f0ed210`, "Dispatch"-
  designsysteem). Gemerged (kalender-pagina's behouden) en daarna op verzoek van Siem
  **Atlas als vaste stijl geforceerd**: CLAUDE.md-designsectie en `docs/design.md`
  herschreven naar Atlas, Dispatch-componenten (ItemRating/ProfielKiezer/CaptureFormulier
  + manifest) teruggezet naar pre-Dispatch. Dispatch blijft in de history. Nog af te
  stemmen met de collega.
- **14 juni 2026 (vervolg 3) — Redactie slice 1 (Daily Paper).** Nieuwe module
  `modules/redactie` met vijf vakredacteuren als persona-prompts (Tech & Wetenschap,
  Politiek & Wereld, Financieel, Algemeen, en "Voor jou" — de persoonlijke desk) +
  desk→categorie-map. Pipeline-stappen `desks` (per desk, requeue) en `sol_daily_paper`;
  Sol schrijft als hoofdredacteur de Daily Paper uit de beat-samenvattingen. Basale
  cross-referentie (axis A: gevolgde onderwerpen). Daily Paper rendert op de
  "Lees de krant"-pagina. Geverifieerd op preview-editie 2099-01-02 (€0,156); poorten
  groen (41 tests). Volgende: entity-extractie/clustering, deep-research-briefs,
  cross-ref B/C, Sol-geheugen.
