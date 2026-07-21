# PRD — <Initiative name>

> **Status:** draft | approved · **Owner:** Siem · **Linear project:** <name>
> A PRD is approved only when no open question could stall an autonomous
> session. Approved PRDs are the autonomy boundary: inside it agents proceed,
> outside it they ask.

## 1. Goal

<What to build and why. What "done" looks like end-to-end, in plain language.>

## 2. Non-goals

<Explicitly out of scope — the scope-creep fence.>

## 3. Verification reality

<What unattended sessions can verify (gate-checkable: code written, tests
pass, gate green, migration files authored) vs what needs Siem live
(migrations applied, visual review, paid pipeline runs). Acceptance criteria
below must respect this split.>

## 4. Phases (one phase = one Linear issue = one session)

### Phase 1 — <name>
- **Goal:** <what this phase delivers>
- **Acceptance criteria:** <gate-checkable, concrete>
- **Files/areas:** <where the work lands>
- **Locked decisions:** <every fork pre-decided: naming, design choices,
  trade-offs, ceilings>
- **Depends on:** <phase(s) or ->
- **Label:** auto-ok | needs-siem

### Phase 2 — <name>
- ...

## 5. Risks & rails

<Phase-specific risks and the standing rails that apply (branch-only,
migration-files-only, budget ceilings, etc.).>

## 6. Decision log

<Dated list of decisions made during PRD writing and mid-flight amendments.
Mid-flight scope changes amend the PRD here first, then the Linear issues.>
