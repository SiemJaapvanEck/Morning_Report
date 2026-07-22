# Decisions pending — Siem

- **xAI credits exhausted (22 Jul):** every AI call returns HTTP 403
  "used all available credits or reached monthly spending limit". The
  pipeline cannot produce editions until you top up / raise the limit in
  the xAI console. Billing is yours alone.
- **Scheduler degraded since ~7 Jul:** the cron-job.org tick job appears to
  fire ~once a day (05:02) instead of every ~2 minutes — editions are
  created daily but their steps never run. Check the job's schedule/history
  in your cron-job.org dashboard.
- **Edition backlog (~7-21 Jul, 3 profiles ≈ 45 editions of open steps):**
  once credits are back, DECISION NEEDED —
  **A (recommended):** park the backlog (mark pre-today steps skipped, one
  script, reversible) and run only today's editions; costs one normal day.
  **B:** let the pipeline chew through the whole backlog; multiplies AI
  cost by the number of missed days and yesterday's papers are of little
  value.

- **Review queue (3 items, over WIP limit):** MOR-8 (finance goals + ETA),
  MOR-12 (research seed & track), MOR-16 (pipeline-rapport tab) are on
  `staging` awaiting your review — click-paths in `docs/reviews/`, preview
  https://morning-report-git-staging-siemjaapvanecks-projects.vercel.app.
  Your "approve" promotes staging → main. Clearing one re-opens the
  pipeline for new work.
- **Visual spot-check owed:** MOR-6, MOR-7, MOR-15 merged to main with
  `needs-siem` flags still open — check /financien and /instellingen look
  right in the live app.
- **Live-review item (from HANDOFF):** non-EUR holdings use today's FX rate
  for historical cost basis; a non-EUR buy without a rate contributes €0.
  Watch real non-EUR positions and decide if per-buy FX entry is worth a bet.
