# Bets

## Current bets (carried over from Wave 2, enrolled 22 July 2026)

| Bet | Appetite | Issues | Spend so far | State |
|---|---|---|---|---|
| Finance completion | medium | MOR-8 ✅ shipped · MOR-9 on staging | MOR-8 in production (22 Jul) · MOR-9 rebuilt + landed (23 Jul) | fully built — awaiting Siem's staging review |
| Research tracking | medium | MOR-12 ✅ shipped · MOR-13 on staging · MOR-14 | MOR-12 in production (22 Jul) · MOR-13 rebuilt + landed (23 Jul) | MOR-14 unblocked, not yet dispatched |
| Settings convergence | medium | MOR-16 ✅ shipped · MOR-17 + MOR-18 on staging | MOR-16 in production (22 Jul) · MOR-17/18 rebuilt + landed (23 Jul) | fully built — awaiting Siem's staging review |

**Overnight outcome (22→23 Jul):** all four cloud sessions built gate-green
but lost their work to a GitHub 403 on push (cloud credentials read-only).
Rebuilt locally 23 Jul from the Linear-comment specs, 4× reviewer APPROVE,
landed on staging with the double gate. Extra half-day of spend across all
three bets attributable to the push blocker, not the work itself. No
overnight schedule until cloud write access is fixed (decisions-pending).

## Next betting (ideas, not in the pipeline)

- MOR-1 — clickable text → topic references (appetite:small suggested)
- MOR-2 — storyline cards in a responsive grid (appetite:small suggested)
- Per-buy FX entry for non-EUR holdings (pending Siem's live-review verdict)
