# Review: MOR-9 — Finance tiles on the cover dashboard

**Where:** staging preview → https://morning-report-git-staging-siemjaapvanecks-projects.vercel.app/

## What's new

The cover page (the Atlas bento dashboard) now shows your headline finance
numbers as four tiles: **Netto waarde** (portfolio + savings), **Deze maand
over** (this month's surplus), **Beleggingsdoel ETA**, and **Rendement %**.
Each tile links straight to `/financien`. The top navigation also got a
quiet visual clean-up (same look, now driven by the color-scheme tokens).

This is the rebuilt version of the overnight work — the reviewer's fix from
that session is included: the tiles only appear on **today's** edition.
Browsing an older date will never show today's net worth by mistake (and
does not trigger a live price fetch).

## How to test

1. Open the staging link above (onboarding first if the page looks
   logged-out). On the cover you should see the four finance tiles, using
   your real portfolio/cashflow/goal data.
2. Tap a tile. Expected: you land on `/financien`.
3. Compare numbers: the tiles must **match** what `/financien` itself shows —
   same net worth, same surplus, same ETA, same rendement. Any disagreement
   is a bug.
4. Open a **past** edition via the archive (`/editie/<older date>`).
   Expected: **no** finance tiles at all on historical dates.
5. Switch color scheme and dark mode. Expected: tiles and nav follow the
   scheme; nothing stays stuck in old gray tones.

## What to pay attention to

- If you have no goal set (or no holdings), the corresponding tile should
  simply not render — no "€ 0" or "NaN" placeholders.
- Rendement % should be plausible against your cost basis.

## Known limitations

- Tiles use the same live Yahoo quotes as `/financien` — a Yahoo hiccup
  shows stale/absent values on both, consistently.
- The non-EUR FX caveat from MOR-6 applies here too (today's FX rate for
  historical cost basis).
