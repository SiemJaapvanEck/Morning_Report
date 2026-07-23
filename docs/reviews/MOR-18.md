# Review: MOR-18 — Account tab: voorkeuren + Mijn onderzoek samen

**Where:** staging preview → https://morning-report-git-staging-siemjaapvanecks-projects.vercel.app/instellingen

## What's new

The Account tab on `/instellingen` is now complete: your existing
preferences (unchanged) plus the "Mijn onderzoek" section from MOR-13 —
which has **moved into the tab**. The temporary section that sat below the
tabs is gone.

## How to test

1. Open `/instellingen` on the staging link. Expected: **nothing** below the
   three tabs anymore — Mijn onderzoek now lives inside the **Account** tab.
2. Open the Account tab. Expected: your preferences look and behave exactly
   as before, and below them sits the Mijn onderzoek section (add / list /
   archive — same behavior as described in `docs/reviews/MOR-13.md`).
3. Quick sanity: switch to the other two tabs and back. Expected: tab
   switching unchanged, no double rendering of the research section
   anywhere.

## What to pay attention to

- Preferences must be untouched — same options, same saving behavior.
- The research section should follow your color scheme and read naturally
  as part of the tab (not as a bolted-on block).

## Known limitations

- None specific to this change; the MOR-13 notes (extraction anchor
  quality, real-DB caveat) apply to the research section itself.
