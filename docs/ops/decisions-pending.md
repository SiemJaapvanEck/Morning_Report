# Decisions pending — Siem

- **Scheduler degraded since ~7 Jul (parked by Siem, 22 Jul):** the
  cron-job.org tick job fires ~once a day (05:02) instead of every ~2
  minutes — editions are created daily but their steps never run. Siem knows
  and fixes it when he gets to it; xAI billing is already fixed (22 Jul).
- **Edition backlog (~7-21 Jul, 3 profiles ≈ 45 editions of open steps):**
  DECISION NEEDED —
  **A (recommended):** park the backlog (mark pre-today steps skipped, one
  script, reversible) and run only today's editions; costs one normal day.
  **B:** let the pipeline chew through the whole backlog; multiplies AI
  cost by the number of missed days and yesterday's papers are of little
  value.
- **Visual spot-check owed:** MOR-6, MOR-7, MOR-15 — and now MOR-8, MOR-12,
  MOR-16 (promoted 22 Jul) — are live on production with `needs-siem` visual
  checks never done in the live app: /financien and /instellingen.
- **Live-review item (from HANDOFF):** non-EUR holdings use today's FX rate
  for historical cost basis; a non-EUR buy without a rate contributes €0.
  Watch real non-EUR positions and decide if per-buy FX entry is worth a bet.
