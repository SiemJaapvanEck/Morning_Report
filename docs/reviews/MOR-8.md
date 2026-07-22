# Review: MOR-8 — Financial goals with ETA (`/financien`)

**Where:** staging preview → https://morning-report-git-staging-siemjaapvanecks-projects.vercel.app/financien

## What's new

You can now set one investment goal (a target amount for your portfolio) and
any number of named savings goals. The investment goal shows a progress bar
and an estimate of *when* you'll reach it, based on your current portfolio,
your monthly surplus, and an expected-return percentage you can adjust
yourself.

> ⚠️ Heads-up: the preview talks to your **real database** — goals you
> create or delete here are real. That's fine (it's your data, and goals are
> easy to delete), just don't be surprised tomorrow.

## How to test

1. Open the staging link above. If the page looks empty or logged-out,
   complete the short onboarding first — same as on the live site.
2. Scroll to the goals section. You should see a form to create an
   investment goal. Enter a target amount → a card appears with a progress
   bar, "€ current / € target", and a bold ETA line like "~4 jaar 2 mnd".
3. Try to create a **second** investment goal. Expected: a friendly refusal —
   there can only be one; edit the existing one instead.
4. Add a savings goal (name + target). Expected: a row with its own progress
   bar. Update its saved amount → the bar moves. Delete it → the row is gone.
5. Change the expected-return percentage and press **Opslaan**. Expected: the
   ETA on the goal card updates, **and** the projection line in the portfolio
   chart higher up on the page bends to match the new percentage.
6. Edge cases worth one look: a target you've already reached should say
   "doel al bereikt"; an absurdly high target should say "buiten bereik".

## What to pay attention to

- Does the ETA feel plausible given your real numbers?
- The progress bars should never overshoot 100% or glitch at 0%.
- After saving a new return %, chart and goal card must agree with each other.

## Known limitations

- The monthly contribution override lives in the Settings → Financiën tab
  (MOR-17, not built yet) — here the ETA always uses your computed monthly
  surplus.
- Known issue carried from earlier: non-EUR holdings are converted at
  today's exchange rate, not the buy-date rate.

## Decisions needed

None — approve or leave feedback on the Linear issue.
