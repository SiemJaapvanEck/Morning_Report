---
name: plan
description: Turn an approved PRD into a Linear project + issues (one per phase, each a self-contained spec). Use after /prd, or when Siem says "put this on the board". Presents the board for approval before creating anything in Linear.
---

# /plan — PRD → Linear board

## 0. Preconditions
- The PRD exists in `docs/prd/` and is marked **approved**. Draft → run /prd
  first; never plan from a draft.
- Linear MCP available; team/project config in `.claude/project.json`.

## 1. Build the board proposal (nothing created yet)
From the PRD's phase blocks, draft:
- **One Linear project** for the initiative (link the PRD file in its
  description).
- **Sprints as milestones.** Group the phases into sprints: phases that can
  run in parallel (no mutual dependency) share a sprint; dependent phases go
  in later sprints. Create one project **milestone per sprint**
  (`Sprint 1 — <theme>`, `Sprint 2 — <theme>`, …) and assign each issue to
  its sprint. A sprint = one /dispatch fan-out. (If the team has Linear
  cycles enabled, additionally assign sprint issues to cycles; milestones
  remain the source of sprint grouping.)
- **One issue per phase.** Title: `<Phase name>`. Body = the phase's full
  spec block **verbatim** (goal · acceptance criteria · files/areas · locked
  decisions) + a link back to the PRD. A session must be able to build from
  the issue alone — if a phase block can't stand alone, fix the PRD first.
- **Dependencies:** blocked-by relations mirroring the PRD's "Depends on".
- **Labels — every issue gets exactly:**
  - one autonomy label: `auto-ok` or `needs-siem`;
  - one type label: `Feature` / `Bug` / `Improvement` / `test` / `infra`.
  Missing labels on the team → create them first (colors/descriptions per
  the existing taxonomy). Never invent ad-hoc labels beyond the taxonomy
  without telling Siem.
- **Status:** Sprint 1's unblocked issues → the ready status (see
  `project.json`, e.g. `Todo`); everything else → `Backlog`.

## 2. Present for approval
Show Siem the board as a table (sprint, issue, labels, depends-on, status).
**Create nothing until he approves.** Adjustments → update the PRD first
(decision log), then the proposal.

## 3. Create in Linear
Create project → milestones (sprints) → issues (with labels, milestone,
status) → blocked-by relations. Report the created issue IDs back and note
them in the PRD next to each phase.

## 4. Hand off
Tell Siem the board is live: sprints, and which issues are ready. Offer
**/dispatch** for Sprint 1.
