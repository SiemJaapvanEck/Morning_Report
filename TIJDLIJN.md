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
- **15 June 2026 — Working language → English; halved edition cost; removed editorial
  personas.** (1) Flipped all dev-facing work to English (CLAUDE.md + `/start`//`push-main`
  skills; `CLAUDE.md` is now gitignored as a per-contributor file). (2) Lever A — scan cost:
  pre-scan gate in `modules/rank` (`source_weight × recency × interest`, no LLM) +
  media intake cap, so scan_rank only LLM-scans the top ~280 of ~600 items;
  scan_rank ~€0.119 → ~€0.05, verified live on same-day data. (3) Lever B — removed the
  5 editor personas + Sol's character, replaced `desks`/`sol_daily_paper`/`sol_intro`
  with one neutral, topic-driven cross-reference synthesis ("De rode draad"); deep
  research kept. Edition ~€0,156 → ~€0,077. Gates green (52 tests); verified live + pushed.
- **17 June 2026 — News Threads kicked off (Phases 0–1).** Designed a major shift:
  the report should *build forth on itself* — persistent storylines (threads) per
  profile that accumulate state across editions, where each day finds what's new,
  matches it to a thread, and writes an UPDATE on top of yesterday's state. Full
  plan + sprint board in `docs/threads-plan.md`; run one phase per sprint, pause
  after each (Siem's cadence). **Phase 0:** budget cap €0,30 → €0,10 (aim lower),
  `scan.maxRounds` 7 → 4 to fund deeper research. **Phase 1:** migration
  `0008_threads` applied live (`threads` + `thread_items`, unique(thread_id,item_id));
  added `Thread`/`ThreadItem`/`DestepLens`/`DailyPaperArticle` types + `FrontPage.dp_*`;
  new pure `modules/threads` (entity-overlap matching, delta, DESTEP lens selection)
  with 22 tests. Also added `docs/pipeline.md` (step catalog). Gate green (74 tests);
  pipeline behaviour unchanged until Phase 3. Next: Phase 2 (entity extraction on the
  scan call).
- **17 June 2026 (continued) — News Threads Phase 2: entity extraction.** Piggybacked
  2–5 key entities per item onto the existing `scanBatch` LLM call (no new call):
  `entities` added to `SCAN_SCHEMA` + scan prompt + `ScanVerdict`/`ScanUitslag`, merged
  into `items.scan_meta.entities` next to `regio`. Entities stored in **display form**
  (for the future archive UI) via a new pure `dedupeEntities()` helper in
  `modules/threads` (+4 tests, 78 total). Seeded 4 followed niche topics for Siem
  (Tuinieren/Plantenindustrie/Landbouw/Tibet, `query_mode=true`) to prove specific-topic
  tracking. Verified live on a full local edition (both profiles): 640 scanned, 613 with
  entities, display form preserved, €0.057/edition (under the €0.10 cap); Landbouw caught
  3 items, Tuinieren 1. Gate green; pushed. Next: Phase 3 (the threads match/link step).
  Note: morning cron produced empty edition shells — worth a look later.
- **18 June 2026 — News Threads Phases 3 + 4.** **Phase 3:** the `threads`
  pipeline step (match/link/state-merge, no AI), inserted after `select`.
  Thread-creation gate refined with Siem to **followed + `deep` band**, or a
  **big cross-source cluster** (≥5 items) — the first cut ("every followed item")
  exploded to 52 threads since Siem follows ~all 25 topics. `planThreadActions`
  is a pure fixed-point (idempotent: 54 items → 9 threads, stable on re-run);
  `clusterByEntities` does connected-component coverage clustering. **Phase 4:**
  `generateThreadUpdate` (deep tier) writes an UPDATE that builds on the thread's
  stored `state`, using only the relevant DESTEP lenses + an `archivePrimer`
  (reader's ≥4-rated titles); `generateStep` rewritten to one work-unit/tick,
  thread updates first (one per thread). Dropped `computeDelta` (no-op under
  `unique(thread_id,item_id)`). Verified live: 9 updates, coherent state +
  headlines, idempotent, €0.013. 89 tests green. Phase 5 split into 5a (assembly,
  backend) + 5b (UI) at Siem's request. Pushed Phases 3 + 4 as one commit (shared
  files can't be split without interactive staging).
- **18 June 2026 (vervolg) — News Threads Phase 5a + 5b: Daily Paper.** **5a
  (backend):** new `composeDailyPaper` in `modules/redactie` → structured
  `{summary, intro, generalHeadline, generalBody}` (one deep call; `writeDailyDigest`
  kept intact). `dailyPaperStep` assembles `dp_articles` = the edition's thread
  updates (reused from Phase 4, ordered, lens-tagged, imaged) + a general roundup;
  `finalizeStep` writes `dp_summary/dp_intro/dp_articles` into `front_page`.
  Verified: 10 articles, €0.0028. **5b (UI):** the "Lees de krant" page
  (`EditieWeergave`) now renders Summary → Introduction → thread article cards
  (GEVOLGD / VERHAALLIJN / DESTEP-lens chips, Archivo headlines, images), falling
  back to the old rode draad for pre-thread editions; the front-page block shows
  `dp_summary`. Verified on localhost (no console errors). 89 tests green. Pushed
  5a + 5b as one commit. Phase 5 split into 5a/5b/5c at Siem's request; next is
  **5c — Archive with threads** (front-page Archive button + split weather; a
  news-volume line with thread/saved-article dots per category, plus a graph per
  thread).
- **18 June 2026 (vervolg 3) — News Threads Phase 5c-3: archive multi-line chart.**
  Replaced the per-mega `ThreadTimeline` cards on `/archive` with a single full-width
  `StorylineChart`: every mega-thread as one sector-colored line (DESTEP palette),
  shared X/Y axes, dots on all lines (sector color; hollow = selected), article panel
  at Daily Paper width underneath (col-span-7). Added `dominantLens()` pure helper +
  3 tests (96 total). Lens accuracy fixed: `getThreadArchive` now joins
  topics/categories so `selectLenses` gets real context. Gate green; pushed.

- **18 June 2026 (vervolg 2) — News Threads Phase 5c-1 + 5c-2: mega-threads +
  archive.** **5c-1:** migration `0009` (`threads.parent_thread_id` +
  `anchor_entity`); `threadsStep` now anchors big recurring stories into
  mega-threads — `detectAnchors` (entity on ≥3 distinct days) +
  `assignMegaThreads` (each child to its single biggest anchor, keep ≥3 children)
  + orphan cleanup; mega-threads excluded from item matching. Verified: Iran
  (5 children, 5-day dot timeline) + SpaceX. Backfilled June 13–17 (re-scanned the
  pre-Phase-2 days for entities). **5c-2:** front-page Archive/Storylines tile
  (weather tile split in half) + `/archive` page rendering per-mega
  `ThreadTimeline` cards (volume line + clickable dots + swapping article panel);
  `getThreadArchive()` query. 93 tests green; verified on localhost. Pushed 5c-1 +
  5c-2 together. **Next: 5c-3** — rework `/archive` into ONE big full-width chart
  with every mega-thread as a sector-colored line (one line per storyline, primary
  DESTEP lens = colour), click a line → that storyline. Full spec in HANDOFF.

- **18 June 2026 (vervolg 4) — Planning: "Investment & Foresight" roadmap.**
  No code. Siem proposed a new direction; gathered context across the threads,
  redactie, calendar, and StorylineChart modules, asked four scoping questions,
  and agreed a four-phase plan recorded in HANDOFF.md (replacing old Phase 6).
  The loop: curated free finance RSS → threads → source-grounded,
  confidence-tagged predictions with a target date → auto-scheduled
  `calendar_events` → a dotted projection line on each topic's own 52-week graph
  in the new standard Daily Paper layout. Phase A = investment block + finance
  source seed; B = agenda extraction; C = per-thread prediction; D = 52-week
  graphs + dotted line. One phase per sprint. Next session starts at Phase A.

- **18 June 2026 (vervolg 5) — Track-as-thread + custom RSS source: landed.**
  Picked up a complete, green, uncommitted feature the planning handoff didn't
  mention (its migration was already live in the DB) — verified and committed it.
  (1) Per-profile "track as thread" selection: migration `0010_thread_tracking`,
  `applyThreadTracking()`, `trackedTopicIds` threaded through `assembleUserContext`
  → `threadsStep` → `planThreadActions` (new `"tracked"` thread-birth reason — any
  item on a tracked topic opens/joins a thread, no deep/follow needed), and a
  "✦ Verhaallijn" toggle in `VoorkeurenKiezer`. (2) Add-your-own RSS feed:
  `createUserSource()` + `validateFeedUrl()` (parses the feed before insert),
  `POST /api/bronnen`, and a validate-&-add form in the preferences UI. +4 tests
  (96 → 100). Gate green; verified on localhost; pushed. Next: Phase A.
