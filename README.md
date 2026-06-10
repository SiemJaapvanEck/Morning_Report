# Morning Report

Een persoonlijk ochtendrapport dat elke dag rond 08:00 klaarstaat als
installeerbare web-app: nieuws, weer en een vooruitkijkende kalender,
gefilterd op jouw interesses, met een eigen redactionele AI-stem (**Sol**).

> 📐 Het volledige ontwerp staat in [docs/ontwerp.md](docs/ontwerp.md) —
> het levende ontwerpdocument. Setup-instructies: [docs/setup.md](docs/setup.md).

## Snelstart

```bash
cp .env.example .env.local   # invullen: Supabase, Anthropic, geheimen
npm install
npm run dev                  # app op localhost:3000
npm run pipeline             # genereer de editie van vandaag
npm test                     # unit-tests van de pure modules
```

## Architectuur in één oogopslag

```
morning-report/
├── app/                  # Next.js App Router — de PWA (alleen aanroepers)
│   ├── api/pipeline/tick #   scheduler-endpoint: één stap per tick, <10s
│   ├── api/capture       #   iOS Shortcut + web-invoer
│   ├── api/feedback      #   ratings & volg-markeringen
│   ├── editie/[datum]    #   archief-weergave
│   └── instellingen      #   interesses, scores, bronnen
├── modules/              # de kern — framework-agnostisch TypeScript
│   ├── shared/           #   types, config, db, claude-client, budget-guard, feeds
│   ├── pipeline/         #   stappenmachine: plan → weer → ingest → scan →
│   │                     #   select → generate → sol → finalize
│   ├── ingest/           #   feeds binnenhalen, reclamefilter, dedupe-hash
│   ├── rank/             #   interessemotor, belang-ranking, kostenpoort
│   ├── generate/         #   samenvattingen & deep-dives (budget-bewust)
│   ├── sol/              #   karakter (prompts/ als config), intro, geheugen
│   ├── archive/          #   dedupe, editie-historie
│   ├── calendar/         #   eventstore (earnings, releases, events)
│   └── weather/          #   Open-Meteo
├── supabase/migrations/  # schema + starterset
├── scripts/run-pipeline  # lokale runner (zelfde code als het tick-endpoint)
└── docs/                 # ontwerp + setup
```

**Drie principes** (uitgebreid in het ontwerp):

1. **Modules zijn puur.** `modules/` kent geen Next.js; de app en de pipeline
   zijn slechts aanroepers. Alles wat erop gebouwd wordt, bouwt áán — niet om.
2. **De pipeline is een stappenmachine.** Stappen staan in de database, elke
   scheduler-tick voert er één of enkele uit (ruim binnen Vercel's 10s-limiet)
   en is idempotent. Valt iets om, dan gaat de volgende tick verder.
3. **De budget-guard is echt.** Elke Claude-call wordt per stap gelogd
   (`usage_log`); nadert een editie het plafond (~€0,30) dan schakelt de
   generatie automatisch terug in plaats van stilletjes door te branden.

## Status & roadmap

Gebouwd (fase 1-2 — fundament + eerste verticale plak):
schema, stappenmachine, budget-guard, weer, RSS-ingestie met reclamefilter,
AI-scan & ranking, samenvattingen & deep-dives, Sol's intro, voorpagina,
archief, instellingen, feedback-API, capture (web + Shortcut), PWA-shell.

Volgende fases (zie docs/ontwerp.md §7 voor de open punten):

3. Volledige ingestie — alle bronnen, subreddits, query-modus
4. Interessemotor compleet — escalaties, waarom-tags, hiërarchie-tuning
5. Archief — cross-refs, secties doorzoeken, export
6. Sol volledig — geheugencompactie, notitiebelletjes, karakterevolutie
7. Kalender + portfolio — finance-API's, roadmap-weergave
8. Ontdekkingsblok, trivia, vervolg-tracking, on-this-day, PWA-afwerking
