# Tijdlijn

Chronologisch logboek van het project. Eén regel (of kort blok) per
werksessie of mijlpaal — details horen in HANDOFF.md en git-history.

- **21 July 2026 — Dispatched: MOR-6 + MOR-7 (Finance Phase 3+4 — `/financien` page).**
  Holdings/buys CRUD + 3-line portfolio chart (cost basis / today marker /
  compound projection, `app/lib/financien.ts` + `FinancienChart.tsx`) and
  the income/expense monthly report wired as the chart's DCA-contribution
  default. Brandbook §6 recipe added. Gate green (412 tests, +32 new).
  Branch `MOR-6-finance-ui-2026-07-21`, commits `d2cce64`/`54e4124`. Both
  `needs-siem` — not merged, awaiting Siem's live review.
- **21 July 2026 — Dispatched: MOR-15 (Settings P1 — tabbed settings shell).**
  `/instellingen` restructured to a client tab shell (`InstellingenTabs`,
  WAI-ARIA tabs pattern, scheme tokens only): Account · Financiën ·
  Pipeline-rapport. Pre-existing preferences content (incl. `VoorkeurenKiezer`,
  unchanged) relocated into the Account tab (`InstellingenAccountTab`); the
  other two tabs show a "komt binnenkort" placeholder (`InstellingenLeegState`)
  pending MOR-17/MOR-16. Brandbook §5.1 added. Gate green (394 tests). Branch
  `MOR-15-settings-shell-2026-07-21`, commits `8f9b14e`/`d05b1a9`, PR #4 open —
  needs-siem, awaiting live review before merge.
- **21 July 2026 — Merged `MOR-4-finance-foundation-2026-07-21` → main.**
  MOR-4 + MOR-5 (Finance foundation + math core + keyless Yahoo quotes/FX),
  reviewer-approved (incl. the FX judgment call), rebased over the Research
  merge, double gate green (380 tests). Migration `0019` file only — Siem applies.
- **21 July 2026 — Merged `MOR-10-research-foundation-2026-07-21` → main.**
  MOR-10 + MOR-11 (Research Tracking foundation + extraction core),
  reviewer-approved, double gate green (352 tests). Migration `0020` file only —
  Siem applies.
- **21 July 2026 — Dispatched: MOR-10 + MOR-11 (Research Tracking Phase 1+2).**
  `supabase/migrations/0020_user_research.sql` (file only) + `UserResearch`
  type; `modules/research/index.ts` (`buildExtractionPrompt`/`parseExtraction`/
  `extractResearch`, defensive `askAI` scan-tier call, tavily-pattern) + 14
  new tests. Gate green (352 tests). Branch
  `MOR-10-research-foundation-2026-07-21`, commits `7d2eb2e`/`614c9ed`. Stopped
  before MOR-12 (needs-siem) per plan.
- **21 July 2026 — Planned 3 initiatives + dispatched Wave 1.** Wrote & approved
  3 PRDs (`docs/prd/finance.md`, `research-tracking.md`, `settings-tabs.md`) and
  planned them into the single Morning Report Linear project as MOR-4…MOR-18
  (initiative-prefixed sprint milestones; cross-issue blocks MOR-17←MOR-8,
  MOR-18←MOR-13). Dispatched Wave 1: MOR-4 (Finance foundation) + MOR-10
  (Research foundation), both auto-ok, separate worktree sessions.
- **21 July 2026 — Merged `MOR-3-tavily-citation-ui-2026-07-21` → main.**
  Reviewer-approved (all criteria met), double gate green. First real board
  issue landed.
- **21 July 2026 — MOR-3: Tavily citation UI (built).** First real board
  issue. Tavily grounding sources were fed into the prompt then discarded; now
  persisted on `DeepArticle.groundingSources` (JSONB, no migration) via
  `deepArticle`/`generateThreadUpdate` + pure `groundingSourcesFrom`, aggregated
  per rubriek by `tavilyBronCount`, and rendered as the "+N extra bronnen via
  Tavily" accent row in RUBRIEK IN CIJFERS (hidden until `TAVILY_API_KEY` is set).
  Commit `89b80a8`, gate green, 8 new tests. Backlog investigation this session
  found the umbrella-viz D3→E arc + entity-typing F5 already shipped (docs stale).
- **21 July 2026 — Merged `idle-work/2026-07-02-krant-a3` → main.** Siem
  live-reviewed the krant "A2 · Dagblad + Verhaallijn" rebuild on localhost
  and approved. Lands together: orchestrator workflow v2 (skills/agents/
  rules/gate + Linear integration, labels created, TIJDLIJN→TIMELINE, old
  idle skills retired) and the krant A2 rebuild + brandbook (scheme tokens,
  full page rewrite, docs). Double gate green (330 tests).
- **21 July 2026 — Cowork session:** Installed orchestrator workflow v2 (skills/agents/rules/gate + Linear integration, labels created, TIJDLIJN→TIMELINE). Old idle skills retired.
- **3 July 2026 — Idle-run: Krant A3 Phase 3 — Impact map "WAAR HET SPEELT".**
  Pure helper `storyGeography(regio, placeEntities)` added to `app/lib/stories.ts`:
  maps item regio to `counts` (weight 1 for the world map dot intensity) and builds
  de-duped title-cased `chips` from place-typed entity canonical names (cap 6).
  9 new tests (total 315). `StorylineRef` gains `places: string[]`; `getEdition` in
  `queries.ts` extended: threads select now pulls `entities`, one targeted `entities`
  table select (filtered to `type='place'`) resolves canonical names per thread.
  `ImpactMapCard` component added to `EditieWeergave.tsx`: reuses `WereldKaart`
  (pointer-events-none for display-only in aside), shows `WAAR HET SPEELT` label +
  map + geo-chip badges. Slots into `VerhaallijnAside` below the TimelineCard.
  Hides cleanly when story has no geography. Gate green. Not yet live-verified.
  A3 redesign arc complete — all three phases done.

- **2 July 2026 — Idle-run: Krant A3 Phase 2 — Verhaallijn timeline.**
  Pure builder `buildStorylineTimeline` in `app/lib/stories.ts` (10 new tests; total 306):
  deduplicates links per edition, orders ascending, numbers deel 1…N, marks latest `isNow`,
  appends optional `kind:"future"` node from the thread's prediction. `TimelineNode`
  discriminated union added to `modules/shared/types.ts`. `getEdition` in `queries.ts`
  enriched: `partLinks` select extended to pull `item_id + items(title, sources(name))`
  in one select (no extra round-trips); `rawLinksByThread` map feeds `buildStorylineTimeline`
  so each `StorylineRef` now carries a full `timeline: TimelineNode[]`. New `TimelineCard`
  component in `EditieWeergave.tsx`: vertical timeline with blue VANDAAG dot, past nodes
  (date + deel N + headline + source), dashed future node (date + certainty chip + prediction
  text). `VerhaallijnAside` shows `TimelineCard` when ≥2 past instalments, falls back to
  compact `VerhaallijnLabel + Vooruitblik` for 1-instalment stories. Gate green.
  Not yet live-verified.

- **2 July 2026 — Idle-run: Krant A3 Phase 1 — A3 shell + topzone + card restyle.**
  Rewrote `EditieWeergave.tsx` to the A3 "Dagblad + Verhaallijn" layout:
  masthead band (title + long Dutch date + ochtendeditie + nr. derived as day-of-year),
  horizontal weather bar, topzone (Sol blue block + Markten tile with signed delta in
  emerald/rose + Regio tile with scaled progress bars), image-or-hatch placeholder on
  each lead/featured card (135° diagonal hatch when `image_url` is null), reserved aside
  slot (VerhaallijnAside with VerhaallijnLabel + Vooruitblik in P1; P2 timeline + P3 map
  inject here without container changes), summary cards and brief list restyled to
  `rounded-2xl border` cards, Space Grotesk added as body font. Pure helpers in
  `app/lib/krant-a3.ts` + 15 tests (DST-safe `dayOfYear` via `Date.UTC`). Every current
  feature preserved. Gate green: 296 tests, lint + tsc + build all green. Not yet live-verified.

- **2 July 2026 (later) — Scan-cost tuning + script cleanup (parked items cleared).**
  Post-F3 housekeeping session, no schema change. Made the scan emit
  `type`/`confidence` only for entities NOT already in the registry (known ones
  send `name` only — we reuse the registry type), turning the F2 overshoot's
  "trends cheaper as the registry matures" hope into an actual mechanism.
  Extracted the write-back mapping into a pure, tested `buildEntityMaps()` helper
  in `modules/rank/index.ts` with `other`/`low` floors; verified safe
  (`mergeRegistryEntry` blocks any ai_low downgrade). Deleted the 6 read-only
  phase-verify one-off scripts, kept the 4 DB-mutation helpers for F4. Gate green,
  **259 tests** (+6). Saving not yet measured live — spot-check `usage_log` next
  edition.

- **2 July 2026 — Phase F3: typed threading, the shallow reader fix shipped.**
  Threading now reads the entity registry: products/events can no longer open a
  sibling umbrella next to their actor — they nest as storyline facets. Added
  pure predicates `resolveEntityType` / `canAnchorUmbrella` / `canBeFacet` +
  registry-aware branches on `primaryEntity`/`dominantEntity`/`bigTopicAnchors`/
  `personalAnchors`/`storylineFacets` (all optional-registry, old behaviour
  preserved), and a `loadRegistry()` helper wired into the thread-plan step. No
  schema change. **Lenient policy** (Siem's call): only product/event are blocked
  from anchoring; untyped `other` still may. Dry-run against the live registry
  (313 rows) showed 4 product/event umbrellas that would collapse (incl. the
  `fable 5` double-up). Siem live-verified on localhost ("perfect") and chose to
  leave the 4 pre-F3 threads to age out (no `--apply` rebuild). Gate green, 253
  tests. Next: F4 (relationships + canonicalization), after the
  `idle-work/2026-07-02-after-f3` backup branch.

- **2 July 2026 — Entity typing F1/F2 went live + F3 gate cleared.** Applied
  migration `0017_entities.sql` to the live Supabase project (now the latest
  migration). Dropped the `apply_migration` deny rail from `.claude/settings.json`
  (Siem's call — the block gave no approval prompt; other four Supabase rails
  stay denied). Ran a full `npm run pipeline` (complete edition, all steps green)
  to fire F2's registry write-back: `entities` grew 25 seeds → 313 rows (286
  `ai_high`), with Anthropic=actor / Claude+Fable=product correctly typed and
  seeds preserved. Scan cost €0.1251 — ~25% over the €0.10 target, parked as a
  tuning item. No F3 code yet; that's next. Also commits the `.claude/` hooks +
  push-main/start skills.

- **2 July 2026 — Merged `idle-work/2026-07-02` → main.** Entity typing Phases F1
  and F2: entity registry table + seed migration (`0017_entities.sql`), pure
  `modules/entities/` helpers, scan entity typing with registry write-back.
  Gate green on both source and destination (239 tests). Also ships the
  `/merge-idle-to-main` skill itself. Migration not yet applied — see HANDOFF.

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

- **19 June 2026 — Investment & Foresight Phase B: auto-scheduled agenda.**
  Skipped Phase A (deferred, not abandoned) at Siem's request and built B. The
  empty/unused `calendar_events` table is now filled automatically from article
  text: the cheap scan call also extracts explicitly-dated forward events
  (`ExtractedEvent`: title/date/kind/certainty; no date ⇒ none, never invented;
  no extra AI call), stashed in `scan_meta.events`. New `agenda` pipeline step
  runs after `threads`, scopes to followed/threaded items, validates hard (real
  future date, known kind/certainty), dedupes on (date, lower title), and
  persists per-profile linked to source item + thread; idempotent via
  delete-by-item_id + re-insert. Migration `0011_calendar_event_links`
  (profile_id/item_id/thread_id + indexes). Pure core in `modules/calendar`
  (`buildAgendaRows`, `isValidIsoDate`) + 8 tests (100 → 108). Gate green;
  committed on the green gate (no live tick — no UI surface yet). Next: Phase C
  (per-thread prediction).

- **19 June 2026 (vervolg) — Agenda UI: Phase B made visible.** Siem wanted to
  see Phase B working before continuing. Added an "Op de agenda" tile to the
  dashboard right column (upcoming calendar_events as dated rows: date chip, kind
  label, ↳ storyline, certainty badge) via new getUpcomingAgenda query +
  AgendaEvent type, threaded through EditionScreen + both edition pages. Relocated
  the "Waar het nieuws vandaan komt" world map off the right column into the blue
  briefing hero (small, white-on-blue) — WereldKaart got a tint prop; removed the
  old map tile + "Waar Sol las" fallback. Seeded 8 representative events linked to
  Siem's real storylines (meta.seed=true, removable). Approved on localhost; gate
  green (108 tests). Next: archive dotted projection lines toward agenda events.

- **19 June 2026 (vervolg 2) — Archive dotted projections.** The /archive
  storyline chart (StorylineChart) now reaches forward to upcoming agenda events.
  getThreadArchive attaches each mega's future calendar_events (ArchiveProjection,
  incl. source article title/summary). Chart got a split "nu" axis (history left
  ~60%, projection horizon right ~40%, faint divider), dashed projection lines
  from each storyline's last real point to ◇ date markers with dash density +
  opacity encoding certainty (bevestigd tight → gerucht sparse/faded), and a
  unified dot/projection selection: clicking a marker opens a "Vooruitblik" read
  panel (kind + certainty badges, description, Bron-link; shows the source
  article summary when an item is linked). Copy is an honest placeholder until
  Phase C writes real predictions. Seed enriched (+4 Iran/SpaceX child events) to
  show the full certainty fan. Approved on localhost; gate green (108 tests).
  Next: Phase C — per-thread, source-grounded predictions.

- **19 June 2026 (vervolg 3) — Phase C: per-thread source-grounded predictions.**
  Closed the Investment & Foresight loop. generateThreadUpdate (deep tier) now
  also returns a prediction { text, target_date, confidence, source_basis },
  grounded only in the thread's new items + its scheduled events (fed into the
  prompt); discipline enforced by a pure, tested cleanPrediction() — no text/no
  basis/no valid future date ⇒ no prediction. Migration 0012 adds threads.prediction;
  applyThreadUpdate (now takes profileId) writes it AND mirrors a linked
  calendar_event (kind overig, meta.prediction=true, refreshed/idempotent) so it
  flows into the agenda + archive projections. daily_paper reads prediction onto
  DailyPaperArticle; krant page shows a "Vooruitblik" block (text, confidence
  badge, target date, source basis). +7 tests (108 → 115). Verified by seeding
  predictions on Iran/SpaceX child threads (krant + archive + agenda all green on
  localhost); AI generation path itself proven only on a live run. Gate green.
  Next: Phase D — 52-week per-thread graphs under each Daily Paper article.

- **19 June 2026 (vervolg 4) — Retired the Investment & Foresight roadmap;
  planned "broaden the mega net".** No code. With the agenda + prediction loop
  shipped, removed the A–D phase roadmap from HANDOFF (kept a de-phased factual
  "shipped" record; fixed a duplicated section). Set "broaden the mega net" as the
  active focus and worked it into a build-ready plan: co-occurrence clustering
  (no LLM, no migration) — a pure buildAnchorClusters() that grows each anchor's
  cluster from companion entities with high conditional probability P(anchor|companion)
  + a min co-occurrence count, then assignMegaThreads matches on cluster
  intersection instead of the exact anchor token. Guardrails against over-merging
  (directional threshold, anchors never absorbed, count floor, strongest-cluster-only).
  Siem develops it in a new session.

- **27 June 2026 — Re-imagined the daily paper + built the "full story" engine.**
  Pivoted from the mega-net plan to a bigger goal: the paper should read like a
  real sectioned newspaper, and each deep article should tell the *whole* story.
  Built three things, all green (133 tests) and verified on a live run.
  (1) **Deep-research two-layer "full story":** Phase 2 — stop discarding the
  feed's content:encoded, store it on items.content (migration 0013) and feed a
  bounded body excerpt; Phase 1 — output becomes { lead, ripples } (facts + ≤3
  grounded reasoned consequences, each with its own subtitle), persisted to
  edition_items.article (migration 0014). Budget ceiling €0.10→€0.15.
  (2) **Account switcher** in the header (switch Siem/Jesse without clearing
  cookies). (3) **Daily Paper Phase 0 + A:** Sol writes a one-sentence caption +
  small summary per section (composeSectionIntros → front_page.dp_sections), and
  the krant is rebuilt as a full-width sectioned newspaper (masthead → Sol's
  synthesis → Hoofdverhaal → sections with caption/summary + a depth mix). Open
  next: Phase C (broaden the selection to fill the paper), Phase B (storyline
  links + restore the Vooruitblik), Phase D (reviews steer the paper).

- **28 June 2026 — Phase C: broadened + ranked the selection (the "more articles
  than paper" fix).** Found that the ranking Phase C asked for (profile + threads
  + reviews) was already in priority() + the thread path, so this was purely about
  the funnel caps. Chose a Lean posture: broaden the free headline tail, keep paid
  tiers flat. Added an env-tunable config.select block and wired it into selectStep
  + assignBands — fresh pool 200→400, window 36h→48h, per-category 10→24, summaries
  5→6, deep count unchanged. Live run (both profiles): the free headline tail grew
  18→76 (4.2×), paid tiers stayed flat, cost ~€0.03 vs the €0.15 ceiling, and
  Siem's previously-thin profile now has a full 130-item paper. 135 tests green.
  Next: Phase B (storyline links + restore the Vooruitblik).

- **28 June 2026 — Phase B: storyline links + restored Vooruitblik + followed-first.**
  The Phase A reshape had dropped the storyline connection and the prediction box
  from the krant; the data still existed, so this was a thread-join in getEdition +
  rendering (no schema, no AI). getEdition now attaches per deep article its
  storyline { thread_id, title, deel N } and the thread's prediction (deterministic
  pick: most-established storyline), plus followedCategoryIds. New pure helper
  orderSectionsFollowedFirst (4 tests). EditieWeergave shows a "Verhaallijn · deel N"
  label (links to /archive) and a Vooruitblik box (forecast + target date + certainty)
  on the lead + featured articles, and orders sections followed-first. Verified on
  localhost (every deep article links to a thread; real Iran/SpaceX predictions show).
  139 tests green. Next: Phase D (reviews actively steer the paper).

- **28 June 2026 — Phase D: reviews + follows actively steer the paper (C→B→D done).**
  Two reader signals barely moved the paper; now they bite (no schema, no AI). Item
  ratings count: applyItemFeedback resolves an article's topic (else category) and
  moves its topic_scores — closes the old "fase 4" TODO in the feedback route.
  Follows boost ranking: ScoreContext carries the followed sets and priority()/
  preRankScore() lift a followed topic/category to an interest floor (config.rank.
  followInterestFloor, default 0.6). Featuring tilt: assignBands takes followedIds,
  making followed items deep-eligible below the 0.5 gate (still budget-bounded).
  Verified on real data: a quiet followed category gains a featured article; busy
  ones stay at 2 deep (slots already filled) so the effect there is ordering +
  prioritization. Siem confirmed on localhost. 144 tests green. The C→B→D roadmap
  is complete; deep-research 3/4 + the Daily Paper PRD remain (deferred).

- **28 June 2026 (2nd session) — Deep-research Phase 4 + Phase 5 designed.**
  Phase 4 (commit 4c18da8): scale + deepen deep research. New pure distributeBands
  hands out a GLOBAL deep budget round-robin across categories (cap 10, floor 0.35,
  per-cat 2), replacing the per-section "top-2 above 0.5" gate that starved quiet
  categories. Topic-aware summary floor (match >= 0.90 keeps its own summary).
  Unified the deep path: every deep item now gets the two-layer {lead,ripples}
  article via new deepArticle (shallow deepDive retired). Ripple cap 3->5, longer
  lead, tokens 1500->2200. Verified live: deep 10/8 across 6/8 categories, ~EUR0.03.
  Phase 3 skipped (10-16s ticks are safe under the 60s hard ceiling). KEY FINDING:
  ripples stay near-zero because RSS source text is thin (~350 chars) and the model
  won't fabricate — articles with ripples avg 1091 source chars, without 358. So the
  next lever is source enrichment. Phase 5 designed + de-risked with Siem: ground the
  deep call via the Tavily search API (free tier covers our ~540/mo) feeding snippets
  into the existing cheap call — NOT xAI's agentic web search (spiked: works in one
  call with json_schema, but ~5x our budget). Blocked on adding TAVILY_API_KEY to
  .env.local. 153 tests green.

- **28 June 2026 (3rd session) — Deep-research Phase 5 shipped: web grounding.**
  New modules/tavily client (plain fetch, NOT askAI): pure tested helpers buildQuery/
  shapeGrounding/formatGroundingBlock + defensive searchTavily (any failure -> empty
  grounding, pipeline unchanged). Wired into generate: each deep topic queries Tavily
  on its title+entities, snippets feed the existing deepArticle/generateThreadUpdate
  call as attributed source under the no-fabrication rule. Config tavily block, all
  env-tunable (TAVILY_GROUNDING/MAX_RESULTS/SEARCH_DEPTH/SNIPPET_CHARS). No schema
  change, no ceiling change. Verified end-to-end on both profiles via the real
  pipeline: ripples avg 0.2/0.38 -> 1.00 (3-6x lift); rich on stories that warrant
  it, zero on curiosity items (model still won't invent). 164 tests green. Diagnosed
  a scare along the way: the budget guard is cumulative per edition/day, so 3x
  regenerating tripped the throttle (minimaal -> deepDivesPerSectie 0) and starved
  Siem's deep articles — rebuilt Siem-only with BUDGET_EDITION_EUR raised (env-only).
  Also confirmed ripples render only on the krant view; a down dev server was serving
  stale browser cache. Clean edition cost measured ~EUR0.07 (ceiling 0.15).

- **29 June 2026 — Threads re-architected to an entity-anchored, flat model
  (Phase A of a thread/Daily-Paper rework).** Every thread is now one self-
  contained story anchored on a single entity (Ford, PlayStation, Israel); the
  old fuzzy-overlap planner and the mega/parent-child layer are gone. Birth =
  recurring (>=3 days AND >=5 items volume floor) U big same-day cluster
  (instant-on) U followed/tracked; linking = anchor containment, single best
  thread per item. modules/threads rewritten (removed matchThread/
  planThreadActions/assignMegaThreads + mega DB helpers; added primaryEntity/
  dominantEntity/bigTopicAnchors/personalAnchors/mergeAnchors/matchByAnchor/
  resolveThreadMeta; EntityDays gained a count, detectAnchors gained minItems),
  threadsStep rewritten, config tidied. Decisions (Siem): entity-anchored flat,
  conservative + volume floor, filter by the 7 categories, and KEEP entity-only
  despite ~22% item coverage (curated over comprehensive — topic-backbone hybrid
  explicitly declined). 166 tests green; verified read-only on real data, no live
  data mutated. Next: Phase B — live rebuild script + rebuild the /archive page
  into a flat list of story timelines (reference image in HANDOFF).
- **30 June 2026 — Phase B shipped: /archive is the flat "Alle verhalen" list +
  entity dedup, multi-category, recency/category filters.** Replaced the mega
  StorylineChart with `listStories` + `StoriesList` (sort tabs, ≥3-event floor,
  inline timeline bars, row → `[threadId]` detail stub). Threads now fold entity
  variants (`ENTITY_ALIASES`: Trump/Donald Trump, US/U.S./United States,
  Oekraïne/Ukraine…) and drop bare datelines via a geo-guard
  (`DATELINE_STOPLIST`/`isAnchorableEntity`). Category became a derived
  multi-value display tag; the sharp filters are **recency** (Live/Deze
  week/Sluimerend, relative to the newest event) + **category-by-dominant**.
  "Mijn verhalen" (followed) was tried and **dropped** — Siem's 25 topic-follows
  already personalize the whole edition, so it can't discriminate; it returns in
  Phase C via a thread-tracking button. Live threads re-derived from history with
  the throwaway `scripts/rebuild-threads.ts` (89 threads, 27 shown). Also fixed
  dev "blank HTML/no CSS" by unregistering the PWA service worker in development.
  179 tests green. Kicked off the 2026-06-30 live pipeline at end of session (was
  still in the generate phase). Next: Phase C — the single-thread detail page.
- **30 June 2026 (continued) — pipeline run + listStories crash fix.** Ran the
  live pipeline to completion (06-29 + 06-30 editions, 0 errors, ~19 min for both;
  ~8–10 min/edition, generate dominates); today's stories are now the Live set
  (archive shows 35, 26 Live). Verifying surfaced a crash: `listStories` loaded
  ~400 linked items in one `in()` that blew the PostgREST URL limit — fixed with
  `fetchInChunks` (batched thread_items + items lookups). Pushed.
- **30 June 2026 (continued) — Phase C shipped: the single-storyline detail page.**
  `/archive/[threadId]` is now a sticky timeline scrubber + intensity strip on top
  with the full deep article (lead + ripples + Sol note) swapping underneath on
  click, plus a fixed context rail (forecast → agenda → related → sources). Added a
  thread-level **Volg verhaallijn** button (migration `0015`: `follow_marks` now
  allows `target_type='thread'`; `setThreadFollow` + `/api/threads/follow`) that
  powers a sharp **Mijn verhalen** filter on the archive. `getStoryDetail` enriched
  to carry per-event articles, prediction, related threads (entity overlap +
  parent/child), agenda and sources; new pure helpers `timelinePositions`,
  `eventHeat`, `rankRelated` with tests (179 → 188). Form locked first via an
  interactive mockup approved by Siem. Gate green, pushed. Next: dashboard ripples,
  Tavily citation UI, Daily Paper PRD.
- **1 July 2026 — Storyline hierarchy (Phase D1+D2) + Phase E designed.** Threads
  become a two-level model: a **big thread (umbrella, e.g. Anthropic)** branches
  into **storylines (children, e.g. Fable/IPO/Contracts)** anchored on secondary
  facet entities. **D1:** pure `storylineFacets`/`matchStorylines`/`shouldPromote`
  + 9 tests (188 → 197). **D2:** `threadsStep` reworked to promote umbrellas, spawn
  storyline children, and **multi-link** items to the specific storyline(s) they're
  about (many-to-many); `facetMinItems`/`promoteMinFacets` knobs (both default 2);
  suppress rule so a facet that's itself a big anchor stays a sibling umbrella (no
  circular Iran↔Israel nesting); `libanon→lebanon` alias. `scripts/split-storylines.ts`
  applied to live data: **9 umbrellas → 24 storylines**. **Phase E designed** (mockup
  `umbrella_thread_hub_and_spoke_mockup`, approved): umbrella page = hero + a
  hub-and-spoke graph (storylines radiate as nodes, size=activity, color=lens,
  +Algemeen restbak), children keep their own Phase C graph. Gate green; **not yet
  committed/pushed**. Next: D3 (per-storyline generation + naming + umbrella
  aggregation), then Phase E build. Entity typing (actor/product/event) noted as the
  later clean-up for product-version fragmentation. **Phase E graph = a big
  multi-line timeline chart** per umbrella (x=time, one line per storyline,
  color=lens), mockup `umbrella_thread_multiline_timeline_mockup` — a first
  hub-and-spoke mockup was rejected.
- **1 July 2026 — Storyline generation (Phase D3).** Thread-aware generation went
  per-storyline: each storyline advances its own accumulated `state` each edition,
  framed to its facet ("names each storyline"), bounded by a per-edition budget cap.
  Migration `0016` adds `threads.state_edition_id` (the per-thread idempotency guard
  the per-item `summary_text` flag could no longer provide under multi-link).
  `nextThreadUpdateJob` reworked many-to-many/storyline aware with **primary-wins**
  dedupe on shared item bodies; pure `selectNextThreadJob` (activity priority:
  followed → new-item count → id, cap `GENERATE_MAX_THREAD_UPDATES`=8); pure
  `storylineFraming`; `fillBlankThreadDeepItems` no-AI overflow (runs in every budget
  mode); pure `aggregateUmbrellaState` for the Phase E hero. Tests 197 → 208.
  **Verified live**, which caught + fixed two bugs (wrong `follow_marks` column;
  overflow fill gated behind budget) and one design miss (the planned
  umbrella-before-storyline priority starved storylines — 7 one-item flat threads ate
  the cap, 0 storylines advanced → switched to activity-based; all 3 storylines then
  advanced at the same cost). Clean-run cost ≈ €0.10 (< €0.15 cap). A related-title
  display tweak was considered and dropped. Gate green. Next: Phase E (umbrella
  multi-line timeline UI, consumes `aggregateUmbrellaState`).

- **1 juli 2026 — Phase E: umbrella master–detail reader.** Built the umbrella
  read-side and iterated it live with Siem. E1: pure helpers (`dailyActivitySeries`,
  `seriesPoints`, `lineWeight`, `threadSubject`/`titleCaseEntity`) + `getUmbrella`
  (per-storyline `UmbrellaLine` with facet, series, and a `detail` payload — state,
  per-event articles/Sol notes, sources — reusing `getStoryDetail`'s `edition_items`
  fetch). E2: `/archive/[threadId]` branches umbrella-vs-leaf; `/archive` now lists
  **umbrellas only**. The umbrella page ended as a **master–detail reader**
  (`UmbrellaHero` + `UmbrellaReader`): sticky article panel left (2/3), storyline
  blocks right (1/3); a pressable **event-dot strip** per block (bigger dots, hover
  tooltip = article title) opens that exact moment in the panel. The planned
  multi-line graph and an interim bento-tile grid were built then removed at Siem's
  request. Umbrella titles show as subjects ("Anthropic"); facet eyebrows
  ("Nasdaq 100", "Cursor") derived from entities. Both follow tiers reuse
  `/api/threads/follow` — no schema, no migration, no pipeline change. Verified live
  on the SpaceX/Anthropic umbrellas. Tests 208 → **220**, gate green.

- **2 July 2026 — Idle-run: Phase F2 — Scan entity typing + registry write-back.**
  Overnight autonomous session on `idle-work/2026-07-02`. Scan schema updated:
  entities now returned as `{ name, type, confidence }` objects instead of bare
  strings, constrained to the six-value enum. Added `buildRegistryPriming` to
  `modules/entities/` to inject known types into the scan prompt. `scanBatch` gains
  a `registry` parameter; produces three new `ScanUitslag` fields (`entity_types`,
  `entity_display`, `entity_confidence`). `scan_meta.entity_types` (norm_key → type)
  stored alongside the existing `entities` display strings (back-compat). Registry
  write-back in `scanRankStep`: upserts typed entities to DB via `mergeRegistryEntry`
  after every scan; idempotent on `norm_key`. 4 new vitest tests for `buildRegistryPriming`.
  Gate green, 239 tests. Migration `0017_entities.sql` still needs Siem to apply.

- **2 July 2026 — Idle-run: Phase F1 — Entity registry.** Overnight autonomous
  session on `idle-work/2026-07-02`. Authored migration `0017_entities.sql`
  (entities table + `entity_type`/`entity_confidence` enums, 27 seed rows).
  Added `EntityType`, `EntityConfidence`, `Entity` to `modules/shared/types.ts`.
  New pure module `modules/entities/` with helpers `buildRegistry`, `typeOf`,
  `isUmbrellaType`, `isFacetType`, `resolveCanonical`, `mergeRegistryEntry` + 15
  vitest tests. No behaviour change: migration not yet applied, no pipeline
  wiring. Gate green, 235 tests.

- **1 July 2026 — Reader polish, from live use.** Small follow-up session, no
  schema/pipeline changes. Resolved two open calls from the Phase E handoff:
  the `/archive` "▨ verhaallijnen" badge now shows an actual child count
  (added `Story.storylineCount` in `listStories`); the right-side storyline
  list stays single-column (Siem's call, no 2-up grid). Then Siem hit a real
  bug reading the umbrella pages live: `EventDots` gave "has a deep article"
  and "is selected" the same solid fill, so has-article dots looked like
  leftover/auto-selected state when switching dots or storylines. Fixed by
  making has-article-not-selected dots a hollow outline instead of a fill —
  only the truly selected dot fills solid now. Gate green, tests stayed at
  **220** (one fixture updated for the new `storylineCount` field).

- **2 July 2026 (F4) — Entity typing Phase F4: product→actor relationships.**
  Pushed backup branch `idle-work/2026-07-02-after-f3` from HEAD first (Siem's
  standing call), then built the deep layer. Migration `0018_entity_parent`
  (applied live) adds `entities.parent_entity_id` (self-ref, nullable) + seeds
  Claude/Fable → Anthropic. New pure helpers (`parentActorKey`, `buildEntityById`,
  `expandWithParents`) + `mergeRegistryEntry` now preserves a set parent link.
  Scan infers a product's parent actor when explicit (no extra AI call);
  write-back links it once the actor is a known row (convergent). The payoff:
  the thread step expands each item's entities with their parent actor, so a
  "Claude"-only item now routes into the Anthropic umbrella. Canonicalization
  kept to a reviewed dry-run script (`scripts/reparent-entities.ts`, untracked)
  per Siem — ran it: no meaningful history backfill (F4's value is the forward
  path). Gate green, tests **259 → 274**. Awaiting Siem's localhost review.

- **2 July 2026 (F5) — Entity typing Phase F5: actor-level "rode draad".** Siem
  confirmed F4 live (closed), then we built the final phase. New pure helper
  `clusterByActor` (`modules/entities/`) folds the day's threads' entities up to
  their umbrella actor (products/events → parent actor via F4's links), keeping
  only actors that span ≥2 threads — the genuine through-lines. `composeDailyPaper`
  gained an optional `actorClusters` param that adds a "Spelers die vandaag
  terugkeren" block + a clause telling the editor to cross-reference at the actor
  level, not just per topic; `dailyPaperStep` loads the registry and passes the
  clusters in. Pure enrichment of the existing editorial call — no migration, no
  new AI call, no schema change. Scoped to `composeDailyPaper` only (per-section
  intros left) per Siem. Gate green, tests **274 → 281**. The whole F1–F5
  entity-typing arc is now code-complete; awaiting Siem's localhost review of F5.

- **2 July 2026 — Krant A3 idle run: setup.** F1–F5 reviews closed. Siem handed a
  standalone A3 "Dagblad + Verhaallijn" HTML mockup and asked to fold **all** current
  krant functionality into it. Decoded the design (signature = per-story Verhaallijn
  timeline + "WAAR HET SPEELT" impact map on a daily-paper shell), confirmed every
  element is backed by existing data, and wrote `docs/krant-a3-plan.md` — 3 phases
  (shell+topzone restyle · timeline · impact map). Opened `idle-work/2026-07-02-krant-a3`,
  seeded HANDOFF + plan + idle skills. Scheduled locally: P1 20:00, P2 21:30, P3 01:00.

- **7 July 2026 — Krant rebuilt to "A2 · Dagblad + Verhaallijn" + brandbook.**
  Siem rejected the A3 idle-run layout on review and supplied his own Claude
  design (checked in as `Morning Report design/krant-a2-dagblad.html`). Built in
  3 steps on the same branch: (1) scheme token system — `app/lib/schemes.ts`
  with 24 color schemes on CSS variables (generated CSS + anti-flash script,
  `mr_thema` → `mr_scheme` migration) and a grouped scheme picker; plus
  `docs/brandbook.md`, the whole-app visual system that supersedes
  `docs/design.md`. (2) `EditieWeergave.tsx` rewritten to the design:
  per-rubriek rows (articles | sticky map + rubriek-in-cijfers | sticky
  Verhaallijn rail with delen/weken/bronnen stats), lead with drop cap, thread
  ribbon, GEVOLGEN list; new pure helper `storylineStats`. (3) Docs updated
  (ontwerp §8, CLAUDE.md design section). Gate green (330 tests), verified
  against the 2026-07-06 edition in a production render. Also ran the daily
  pipeline (2× runner, 0 failed steps).

- **22 July 2026 — Merged `MOR-6-finance-ui-2026-07-21` → main — MOR-6 + MOR-7
  finance UI.** `/financien` shipped: 3-line portfolio chart (cost basis /
  current value / compound projection), holdings + buys management, income/
  expense report with monthly surplus feeding the chart's DCA default.
  Cookie-gated write routes, pure math in `modules/finance` + `app/lib/financien.ts`
  (all unit-tested). Reviewer-approved; double gate green (412 tests). One
  live-review note carried: non-EUR cost-basis uses today's FX rate.

- **22 July 2026 — Merged `MOR-15-settings-shell-2026-07-21` → main — Settings P1.**
  `/instellingen` three-tab shell (Account · Financiën · Pipeline-rapport),
  prefs relocated unchanged into Account, placeholders for MOR-16/17. Landed
  after the finance merge; conflicts (HANDOFF/TIMELINE/brandbook) resolved
  keeping both. Reviewer-approved; double gate green.
