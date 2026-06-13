@AGENTS.md

# Morning Report — werkafspraken voor elke sessie

Dit bestand is de bron van waarheid voor hoe we in dit project werken, op
elk account en in elke sessie. Het staat in git; **wijzig je het lokaal,
commit en push het dan ook.**

## Project in één zin

Persoonlijk ochtendrapport (PWA op Vercel + Supabase + Claude API) met een
idempotente stappenmachine-pipeline, budget-guard en AI-redacteur Sol.
Volledig ontwerp: `docs/ontwerp.md` (levend document). Setup: `docs/setup.md`.

## Sessie-overdracht (verplicht ritueel)

We werken met meerdere accounts aan dit project. Daarom, **aan het einde van
elke taak** (en sowieso aan het einde van elke werksessie):

1. Werk `HANDOFF.md` bij — huidige stand, wat af is, wat open staat, waar je
   gebleven bent, bekende problemen. Schrijf het alsof de lezer niets van
   deze sessie weet.
2. Voeg een regel toe aan `TIJDLIJN.md` — datum + wat er gebeurd is.
3. Commit en push naar GitHub (`main`), inclusief CLAUDE.md als die gewijzigd is.

Begin elke nieuwe sessie met het lezen van `HANDOFF.md`.

## Architectuurrichtlijnen (niet onderhandelbaar)

- **Modules zijn puur.** `modules/` bevat framework-agnostisch TypeScript:
  geen Next.js-imports, geen React. De app (`app/`) en scripts zijn alleen
  aanroepers. Nieuwe functionaliteit = nieuwe module of uitbreiding, nooit
  een herschrijving (geen v2/v3).
- **Pipeline is een stappenmachine.** Stappen leven in `pipeline_steps`
  (database), elke stap is idempotent en klaar binnen ~7s. Nieuwe
  pipeline-functionaliteit wordt een stap-handler in
  `modules/pipeline/steps.ts`, gepland door de plan-stap.
- **Elke AI-call loopt via `askAI()`** (`modules/shared/ai.ts`) zodat tokens
  en kosten in `usage_log` komen. Generatie-stappen vragen vóór hun werk de
  budget-modus op en respecteren `budgetPolicy`. Nooit rechtstreeks een
  AI-SDK of -API aanroepen buiten de provider-implementaties in dat bestand.
- **Databasewijzigingen = migratie.** Nieuw SQL-bestand in
  `supabase/migrations/` (genummerd) én toepassen via de Supabase-connector
  (`apply_migration`). Nooit handmatig schema-drift veroorzaken. Types in
  `modules/shared/types.ts` synchroon houden.
- **Modelkeuze:** goedkoop model voor scan/classificatie (`tier: "scan"`),
  sterker model voor deep-dives en Sol (`tier: "deep"`). Model-ID's en de
  actieve provider staan alleen in `modules/shared/config.ts`.
  Provider is config: **xAI/Grok is "voor nu" actief** (`AI_PROVIDER=xai`);
  Anthropic/Claude blijft ingebouwd en wordt actief via
  `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`. Prijzen per model staan in
  dezelfde config — bijwerken als modellen wijzigen (budget-guard leunt erop).
- **Sol's karakter is config:** `modules/sol/prompts/*.md`, geen code.

## Documentatierichtlijnen

- **Code in het Engels:** comments, identifiers én commit messages. Een
  volledige retro-vertaling van de bestaande Nederlandse code is gepland.
- Gebruikersgerichte **UI-teksten** en **Sol-prompts** blijven Nederlands;
  `docs/` mag Nederlands.
- `docs/ontwerp.md` is het levende ontwerpdocument: nieuwe ontwerpbeslissingen
  daar vastleggen, inclusief het beslissingen-log (§8). Niet forken naar
  losse notities.
- README bijwerken als de structuur of de roadmap-status verandert.

## Designrichtlijnen (UI)

- Rustige, krantachtige leeservaring: Tailwind, `stone`-palet, accenten
  amber (rating/Sol) en sky (volgen), `max-w-3xl`, licht- én donker-modus.
- Nederlandstalige UI-teksten, geen lorem ipsum.
- Geen zware component-libraries; kleine client-componenten alleen waar
  interactie nodig is, de rest server components.
- De definitieve vormgevingsronde (iconen, rating-schaal) staat nog open in
  het ontwerp — tot die tijd functioneel en consistent houden.

## Kwaliteitseisen vóór elke commit

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

Pure functies in `modules/` krijgen vitest-tests (zie bestaande `*.test.ts`).

## Omgevingen & geheimen

- `.env.local` (niet in git) — zie `.env.example` voor de sleutels.
- Supabase-project: "Morning Report." (`iqhyndhrlhjfdrwjvmjv`, eu-west-1),
  org "Siem & Jesse Mega Database". Schema-beheer via de Supabase-connector.
- AI-provider: zie Architectuurrichtlijnen hierboven — xAI actief, Anthropic
  als omschakelbare tweede provider. Beide via `askAI()`, nooit erbuiten om.
- Deploy: GitHub `SiemJaapvanEck/Morning_Report` → Vercel (auto-detect
  Next.js, geen speciale config nodig). `.claude/launch.json` is alleen voor
  het lokale Launch-voorbeeldpaneel, niet voor deploys.
