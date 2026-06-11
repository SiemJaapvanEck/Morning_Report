# HANDOFF — stand van zaken

> Laatst bijgewerkt: 11 juni 2026 (nacht), sessie op account Siem.
> Lees dit eerst bij het oppakken van het project; werkafspraken staan in CLAUDE.md.

## Waar we staan

**De eerste editie is live gegenereerd. 🎉** De volledige pipeline draait
end-to-end: 212 items binnengehaald, gescand, geselecteerd, samengevat,
Sol-intro geschreven, voorpagina samengesteld. Kosten: **±€0,03 per editie**
(plafond €0,30). Alle pipeline-stappen blijven onder de 10s dankzij het
vervolgstap-patroon (`requeue` in `modules/pipeline/steps.ts`).

**AI-provider is "voor nu" Grok (xAI)** via de provider-router in
`modules/shared/ai.ts` (`askAI()`/`askAIJson()`). Modellen:
`grok-4.20-0309-non-reasoning` (scan) en `grok-4.3` (deep/Sol), beide
$1,25/$2,50 per MTok. Anthropic/Claude blijft ingebouwd: schakel om met
`AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` in `.env.local`.

**Supabase staat live én beveiligd**: project "Morning Report."
(`iqhyndhrlhjfdrwjvmjv`, eu-west-1). Drie migraties toegepast (schema,
starterset, RLS aan op alle 18 tabellen — geen policies nodig, alleen
service-role-toegang). Profiel "Siem" bestaat; Jesse kan via de UI worden
aangemaakt. `.env.local` is compleet (Supabase-keys + xAI-key + geheimen).

## Wat nu nog openstaat

1. **Vercel: gekoppeld ✓** — repo geïmporteerd, env-vars gezet, auto-deploy
   op elke push naar `main` staat aan. (Vercel-URL nog noteren in dit doc
   zodra bekend.)
2. **cron-job.org-scheduler** instellen — dit is de laatste stap. Volledig
   uitgewerkt met exacte velden in `docs/setup.md` §4. Kernpunten:
   - URL: `https://JOUW-VERCEL-URL/api/pipeline/tick`
   - **Request method op POST** (niet de default GET!)
   - Header `Authorization: Bearer <CRON_SECRET>`
   - Schedule: minuten `*/2`, uren `6,7,8`, **timezone Europe/Amsterdam**
   - Er zit bewust **geen** Vercel-cron / `vercel.json` in het project —
     Vercel-cron kan op Hobby alleen 1×/dag en alleen UTC. Zie §4 voor de
     redenering (voor als Jesse zich afvraagt waar de cron is).
3. Daarna draait het rapport elke ochtend vanzelf.

**Endpoint-test (handig vóór/na het instellen van de scheduler):**
`curl -X POST https://JOUW-URL/api/pipeline/tick` hoort 401 te geven;
mét `-H "Authorization: Bearer <CRON_SECRET>"` een 200 + JSON.

## Bekende aandachtspunten

- De xAI-key is in de chat geplakt geweest; hij staat nu in `.env.local`.
  Overweeg rotatie als hij ooit elders rondzwerft.
- Postgres `current_date` is UTC; editie-datums komen uit `todayLocal()`
  (Europe/Amsterdam). Bij handmatige SQL op datums: expliciet de datum
  noemen, niet `current_date` (we liepen hier al eens tegenaan).
- `sources.last_error` in Instellingen toont feed-fouten; de starter-feedlijst
  draait, fase 3 breidt bronnen uit.
- **Git-auth:** een OAuth-token (account SiemJaapvanEck) staat in de
  macOS-keychain; `git push/pull` werkt direct. `gh auth status` zegt
  "niet ingelogd" — dat klopt (token mist de read:org-scope die gh eist),
  maar git zelf werkt. Op een ander account/apparaat: opnieuw device-flow.
- **Oud prototype in historie:** de repo bevatte een eerdere Vite+FastAPI-
  versie; die is via een ours-merge vervangen door dit platform en blijft
  alleen in de git-historie bestaan. Niet hervatten — architectuur is
  vastgelegd in docs/ontwerp.md.

## Volgende bouwfase (als bovenstaande klaar is)

**Fase 3 — volledige ingestie**: alle bronnen uit `docs/ontwerp.md` §5,
subreddits (RSS), query-modus voor vrije onderwerpen (web-search),
capture-verwerking (captures → topics/sources), AI-reclamefilter aanscherpen.
Daarna fase 4 (interessemotor compleet) — zie README voor de volledige roadmap.
