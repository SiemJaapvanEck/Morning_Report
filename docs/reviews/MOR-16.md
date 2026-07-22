# Review: MOR-16 — Pipeline-rapport tab in Settings

**Where:** staging preview → https://morning-report-git-staging-siemjaapvanecks-projects.vercel.app/instellingen

## What's new

The third tab in Settings ("Pipeline-rapport"), until now a "komt binnenkort"
placeholder, is real: it shows what this morning's pipeline run did — cost in
euros, article counts, sources, Sol's articles, deep-research pieces, how
long each pipeline step took — plus small cost and article-count trend charts
over the last 7 and 30 editions.

## How to test

1. Open the staging link above and go to **Instellingen**.
2. Click the **Pipeline-rapport** tab. Expected: five stat tiles on top
   (kosten, artikelen, bronnen, Sol-artikelen, deep-research).
3. If today's pipeline has already run: the tiles show real numbers — do
   they roughly match what you'd expect from this morning's paper?
4. If it hasn't run yet: the tiles should appear dimmed with zeros — not an
   error, not a crash.
5. Below the tiles: a category breakdown (bars, busiest category first) and
   a list of pipeline steps with their average duration in seconds.
6. At the bottom: two trend cards (kosten and artikelen), each with a 7- and
   30-edition sparkline. With your ~3 weeks of editions both should draw.
7. Switch to another tab and back — no flicker or reload weirdness.

## What to pay attention to

- **Sanity-check the numbers against a real edition** — the math is
  unit-tested on hand-built examples but this tab has never seen your real
  data before today. Cost per day and article counts are the ones to eyeball.
- A pipeline step that was retried counts each attempt in its average
  duration — so a bumpy morning can show a higher average. Expected.

## Known limitations

- Read-only by design: no settings live here yet.
- The tab's data is fetched on every Settings page load (same pattern as the
  other tabs) — a handful of small queries, no AI calls.

## Decisions needed

None — approve or leave feedback on the Linear issue.
