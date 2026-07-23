# Review: MOR-17 — Financiën tab op /instellingen

**Where:** staging preview → https://morning-report-git-staging-siemjaapvanecks-projects.vercel.app/instellingen (Financiën tab)

## What's new

The Financiën tab is no longer a placeholder. It shows your headline numbers
(netto waarde, ETA op je beleggingsdoel — both linking to `/financien`), a
**"snel bijwerken"** card for the two knobs you change most often
(maandelijkse inleg + verwacht rendement %), and the same goal-editing and
holdings forms you know from `/financien`, mounted unchanged.

With this landing all three settings tabs are real: Account · Financiën ·
Pipeline-rapport.

## How to test

1. Open `/instellingen` → **Financiën** tab. Expected: headline stats match
   `/financien` exactly (same netto waarde, same ETA).
2. In "snel bijwerken", change **only** the maandelijkse inleg and save.
   Then go to `/financien` and check the verwacht rendement % there —
   Expected: it kept its old value (saving one field must never wipe the
   other).
3. Now change **only** the rendement % (on either page) and save. Expected:
   the inleg override survives, and the ETA + projection update everywhere.
4. Edit a goal / add a test holding from within the tab. Expected: identical
   behavior to `/financien` — it's the same component.

## What to pay attention to

- Step 2 is the important one: the two quick-edit fields must be independent.
- Numbers must never disagree between the tab and `/financien`.

## Known limitations

- The tab fetches live Yahoo quotes like `/financien` does — a Yahoo hiccup
  affects both equally.
