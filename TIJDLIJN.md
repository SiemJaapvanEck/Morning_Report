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
