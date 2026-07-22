# Review: MOR-12 — Research note → followed storyline

**Where:** staging preview → https://morning-report-git-staging-siemjaapvanecks-projects.vercel.app

## What's new

When you save a research note, the system now automatically opens a followed
storyline for it. From then on the daily pipeline matches news to that
storyline like any other one you follow, and the **first** update it writes
opens with a reference to your research ("sinds jouw onderzoek …") instead of
starting cold.

## How to test

This phase has no screen of its own (the create/manage page is MOR-13), so
on 22 July the create path was exercised for real instead: **four research
notes were created through the exact code the future UI will call**, one per
market you follow — S&P 500, Stoxx Europe 600, iShares Emerging Markets, and
a European industrials ETF. The AI extraction ran live and produced sensible
anchors for each (Federal Reserve, ECB, China/TSMC, Siemens/ABB…).

What you can check now:

1. Open the archive ("Alle verhalen") on the staging preview. Expected:
   four new followed storylines named "S&P 500", "Stoxx Europe 600",
   "iShares Emerging Markets" and "Europese industrie-ETF", with no updates
   yet — that's normal, they were just born.
2. After the next morning's pipeline run: any of them that matched news
   should show its first update, and that update should open with the
   "sinds jouw onderzoek" framing. Finance news matches these almost every
   day, so this shouldn't take long to prove itself.

## What to pay attention to

- Nothing about the existing pipeline should look different — matching for
  research storylines reuses the exact same engine as normal storylines.

## Known limitations

- No create/manage UI yet (MOR-13) and no "Uit jouw onderzoek" label in the
  paper yet (MOR-14) — both are separate issues, unblocked by this one.
- A research note whose text produces no recognizable entities still creates
  a storyline, but it can't match news until curated — by design, no error.
- If a note's main entity is a weak anchor, its storyline may match less
  news than expected — flagged by the builder as a thing to watch, not a bug.

## Decisions needed

None — this one mostly proves itself over the coming mornings.
