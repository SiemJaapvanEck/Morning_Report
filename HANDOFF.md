# HANDOFF — stand van zaken

> Laatst bijgewerkt: 11 juni 2026, sessie op account Siem.
> Lees dit eerst bij het oppakken van het project; werkafspraken staan in CLAUDE.md.

## Waar we staan

**Fase 1 + 2 zijn af en geverifieerd** (fundament + eerste verticale plak):
de complete stappenmachine-pipeline, budget-guard, alle modules, lezer-UI,
PWA-shell en 20 unit-tests. Build, lint en typecheck groen.

**Supabase staat live**: project "Morning Report." (`iqhyndhrlhjfdrwjvmjv`,
eu-west-1, org "Siem & Jesse Mega Database"). Beide migraties zijn via de
Supabase-connector toegepast: 18 tabellen + starterset (7 categorieën,
20 topics, 14 RSS-bronnen). Schema-bestanden: `supabase/migrations/`.

## Wat nu nog openstaat (blokkerend voor de eerste editie)

1. **`SUPABASE_SERVICE_ROLE_KEY` invullen in `.env.local`** — ophalen uit het
   Supabase-dashboard: Project Settings → API Keys. De URL staat er al in.
2. **`ANTHROPIC_API_KEY` invullen in `.env.local`** — er is per ongeluk een
   xAI-key (Grok) aangeleverd; we hebben een Anthropic-key nodig
   (`sk-ant-...`, via console.anthropic.com). Zonder die key falen de
   scan/generate/sol-stappen; weer + ingestie werken wel.
3. **Eerste editie proefdraaien**: `npm run dev` (profiel aanmaken op
   localhost:3000) en daarna `npm run pipeline`.
4. **Vercel koppelen** aan de GitHub-repo (auto-detect Next.js, env-vars uit
   `.env.local` overnemen) en daarna de **cron-job.org-scheduler** instellen —
   stappen 3 en 4 van `docs/setup.md`.

## Beveiligingsadvies Supabase (beslissing nodig)

RLS staat uit op alle 18 tabellen. Voor onze architectuur (alléén server-side
toegang via service-role-key, geen anon-gebruik) is RLS aanzetten zonder
policies de juiste afsluiting: anon-toegang wordt dan geblokkeerd en de app
merkt er niets van. Nog niet toegepast — even bevestigen en dan uitvoeren:

```sql
alter table public.<elke tabel> enable row level security;
```

## Bekende aandachtspunten

- De gedeelde xAI-key is in de chat geplakt; als die elders in gebruik is,
  overweeg hem te roteren.
- `sources.last_error` in Instellingen toont feed-fouten; de starter-feedlijst
  is nog niet in productie getest (fase 3 breidt bronnen sowieso uit).
- GitHub-auth liep via device-flow (gh CLI); check `gh auth status` aan het
  begin van een sessie.

## Volgende bouwfase (als bovenstaande klaar is)

**Fase 3 — volledige ingestie**: alle bronnen uit `docs/ontwerp.md` §5,
subreddits (RSS), query-modus voor vrije onderwerpen (web-search),
capture-verwerking (captures → topics/sources), AI-reclamefilter aanscherpen.
Daarna fase 4 (interessemotor compleet) — zie README voor de volledige roadmap.
