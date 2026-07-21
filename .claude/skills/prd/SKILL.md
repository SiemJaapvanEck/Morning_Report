---
name: prd
description: Write a PRD together with Siem for a new initiative — the multi-round interview that makes unattended work possible. Use when Siem wants to start something new, "plan a feature", or an idea needs turning into a buildable spec. Output is docs/prd/<subject>.md, ready for /plan.
---

# /prd — write the PRD together

The PRD is the autonomy boundary: every question answered here is a question
no session ever has to ask. **The bar: when this skill finishes, no open
question could stall an autonomous coding session.**

## 1. Interview Siem — multiple rounds

Use `AskUserQuestion` for decisions, prose for exploration. Keep going until
the bar is met. Cover at least:

- **Goal & done** — what to build; what "done" looks like end-to-end.
- **Non-goals** — the scope fence, explicit.
- **Phases as sprints** — one phase = one issue = one buildable session. Per
  phase: goal, concrete acceptance criteria, files/areas, dependencies.
- **Pre-decide the mid-flight forks** — every design choice, naming call,
  trade-off, or ceiling a session might pause on: decide it NOW, record it as
  a locked decision on the phase.
- **Verification reality** — split gate-checkable (code, tests, gate,
  migration files) from needs-Siem (applied migrations, visual review, paid
  runs). Acceptance criteria must be gate-checkable for `auto-ok` phases.
- **Labels** — per phase: `auto-ok` (unattended-safe) or `needs-siem`.
- **Risks & rails** — anything beyond the standing rails in workflow.md.

Do not shortcut the interview. A thin PRD is the main way autonomous work
goes wrong.

## 2. Write the doc

`docs/prd/<subject>.md`, using `docs/prd/_template.md`. Each phase block must
stand alone — it becomes a Linear issue body verbatim in /plan.

## 3. Confirm

Walk Siem through the finished PRD (summary, not recital). On his approval,
mark it `approved` and offer to run **/plan** immediately.
