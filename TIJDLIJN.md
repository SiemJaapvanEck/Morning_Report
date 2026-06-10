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
