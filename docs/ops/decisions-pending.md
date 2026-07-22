# Decisions pending — Siem

- **Review queue (3 items, over WIP limit):** MOR-8 (finance goals + ETA),
  MOR-12 (research seed & track), MOR-16 (pipeline-rapport tab) are built and
  awaiting your review. Clearing one re-opens the pipeline for new work.
- **Visual spot-check owed:** MOR-6, MOR-7, MOR-15 merged to main with
  `needs-siem` flags still open — check /financien and /instellingen look
  right in the live app.
- **Live-review item (from HANDOFF):** non-EUR holdings use today's FX rate
  for historical cost basis; a non-EUR buy without a rate contributes €0.
  Watch real non-EUR positions and decide if per-buy FX entry is worth a bet.
- **staging → GitHub:** the `staging` branch is created locally; the first
  agent session with network access must `git push -u origin staging`.
