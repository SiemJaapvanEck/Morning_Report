---
name: start-idle
description: Unattended coding-sprint kickoff for one phase of an idle work run on Morning Report. The idle twin of /start. Use at the start of every scheduled idle session. Checks out the idle-work branch, reads continuity state, then IMPLEMENTS the phase whose spec was injected into this session's scheduling prompt — writing real code — and proceeds WITHOUT waiting for input.
---

# /start-idle — unattended coding sprint (one phase) (Morning Report)

The idle twin of `/start`, run at the top of every scheduled idle session. **This
is a build session, not a status check** — the point is to *write the code* for
one phase and land it green. No human is watching, so orient briefly and then
**implement on your own**. Pairs with `/push-idle-branche` (the close) and
`/setup-idle-work` (which scheduled you and injected your phase spec).

## Your sprint is in the prompt
`/setup-idle-work` injected **this phase's full spec** into the scheduling prompt
that launched you — its goal, acceptance criteria, the files it touches, and the
locked decisions. That injected spec is your source of truth for *what to build*.
You do not need to hunt through docs to find your task; build what the prompt
handed you. The plan doc (`docs/<subject>-plan.md`) is context/continuity only.

## 1. Get onto the idle branch
The scheduled session may boot on `main`. Move to the idle branch first:

```bash
git fetch origin
git checkout <idle-work/YYYY-MM-DD>   # from the prompt; -b --track origin/<branch> if local is absent
git pull --ff-only
```

If you cannot resolve the idle branch named in the prompt, **stop and report** —
never fall back to main.

## 2. Read continuity state (so you build on, not over, prior sprints)
- `HANDOFF.md` on this branch — what earlier sprints already landed.
- `git log -8 --oneline` — the code already committed.
- The sprint board in the plan doc — to confirm your injected phase isn't already
  done. **If it is** (a prior sprint overran and completed it), implement the
  first still-unchecked phase instead. Everything is idempotent — re-entering a
  phase converges.

## 3. Implement the phase — write the code
This is the sprint. Build the injected phase to its acceptance criteria:
- Real, committed code in the house style — pure `modules/`, idempotent ~7s
  steps, every AI call via `askAI()`, extend never rewrite (CLAUDE.md).
- Pure functions in `modules/` get vitest tests, matching the existing `*.test.ts`.
- **Schema changes = author the numbered `.sql` migration FILE only.** Never
  apply it to live Supabase — Siem applies in the morning.
- Address the user as **Siem** in anything you write.

## 4. Standing autonomy rules (hold the whole sprint)
- **Idle branch only.** Never `git push` main. (Branch pushes don't deploy Vercel;
  the push-main guard only guards main.)
- **Bug-backup rule.** Before a risky/uncertain fix, commit + push a restore
  point first: `git commit -am "checkpoint: before <fix>" && git push`, then
  attempt the fix and carry on.
- **Gate before close.** The phase is done only when
  `npm run lint && npx tsc --noEmit && npm test && npm run build` is green.
- **When truly blocked** (can't reach green after honest effort): checkpoint the
  WIP, write an honest HANDOFF of exactly where it broke and what you tried, leave
  the board box unchecked, and hand to `/push-idle-branche`. Never fake green,
  never push main for "help".

## 5. Close the sprint
Code done + gate green — or blocked — close with **`/push-idle-branche`**.
