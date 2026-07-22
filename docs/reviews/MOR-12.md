# Review: MOR-12 — Research note → followed storyline

**Where:** staging preview → https://morning-report-git-staging-siemjaapvanecks-projects.vercel.app

## What's new

When you save a research note, the system now automatically opens a followed
storyline for it. From then on the daily pipeline matches news to that
storyline like any other one you follow, and the **first** update it writes
opens with a reference to your research ("sinds jouw onderzoek …") instead of
starting cold.

## How to test

Honest note first: **this phase has no screen of its own yet.** The page for
creating and managing research notes is the next issue (MOR-13, "Mijn
onderzoek"). What was built here is the machinery underneath. That means a
click-path test isn't really possible today; you have two options:

1. **Wait for MOR-13** (recommended) — once it lands you'll create a note
   through the UI and everything in this issue gets exercised on the way.
2. **Test it now anyway** — say the word and I'll walk you through one
   copy-paste command that creates a test note; after that you can check:
   - The archive shows a new followed storyline named after your note.
   - After the next morning's pipeline run, if news matched it, its first
     update starts with the "sinds jouw onderzoek" framing.

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
