# Review: MOR-13 — "Mijn onderzoek" beheren op /instellingen

**Where:** staging preview → https://morning-report-git-staging-siemjaapvanecks-projects.vercel.app/instellingen

## What's new

You can now manage your research notes in the app. At the bottom of
`/instellingen` (below the tabs — it moves *into* the Account tab with
MOR-18) there's a "Mijn onderzoek" section: add a research note (title +
text), see the list of notes you follow with the status of the storyline
each one spawned, jump to that storyline, and archive notes you're done
with. Archiving hides the note but never deletes it.

> ⚠️ Heads-up: the preview talks to your **real database** — a note you add
> here really seeds a research storyline (one cheap AI extraction call per
> note), and the pipeline will start matching news to it tomorrow. Add
> something you genuinely want to follow, or archive it right after testing.

## How to test

1. Open the staging link above and scroll below the three tabs to
   **Mijn onderzoek**.
2. Add a note: a real research subject works best (e.g. a company, market,
   or technology you're tracking) — title + a few sentences. Expected: the
   note appears in the list with a storyline status shortly after.
3. Tap the storyline link on the note. Expected: you land on that
   storyline's detail page in the archive; it's anchored on the subject you
   wrote about.
4. Archive the note (or a test note). Expected: it disappears from the
   list — and the storyline stops being "followed" for future reports.
5. Reload the page. Expected: everything you did survived the reload.

## What to pay attention to

- The extraction quality: does the storyline's anchor match what your note
  was actually about? (Known watch-item: it anchors on the *first*
  extracted entity — a vague opening sentence can pick a weak anchor.)
- Dutch copy, and the section should follow your active color scheme.

## Known limitations

- The section sits below the tabs for now; MOR-18 moves it into the Account
  tab where it belongs.
- Extraction costs one cheap AI call per added note (budget-guarded like
  everything else).
