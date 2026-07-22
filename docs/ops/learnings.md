# Learnings (curated, max 20 — gates append lessons caught twice; planner + implementers read at dispatch)

- Build cache: a file-sync tool clones files with a " 2" suffix (e.g. `.next/**/* 2.ts`); phantom duplicate-identifier errors in tsc → `rm -rf .next` before the gate.
- Fresh worktrees have no `node_modules` — every dispatched session runs `npm install` first.
- Finance FX: never guess a missing FX rate — a non-EUR buy without a rate contributes €0 by design; flag, don't invent.
- `modules/research` `CATEGORY_SLUGS` is a static mirror of the seeded `categories` table — update it whenever a migration changes the catalog.
- Tavily citation row renders only when `TAVILY_API_KEY` is set AND a pipeline has run — absence is not a bug.
