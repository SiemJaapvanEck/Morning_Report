-- Per-thread generation idempotency guard (Phase D3 — thread-aware generation
-- per storyline).
--
-- Before storylines, generation used the per-item edition_items.summary_text flag
-- as its idempotency guard: a thread's deep item still blank ⇒ that thread still
-- needs its update. Under the storyline model items are MULTI-LINKED (one item can
-- feed several storylines), so a per-item flag no longer tracks per-thread work:
-- once a shared item's body is written, every other storyline sharing it looks
-- "done" and never advances its own threads.state.
--
-- This column records the edition whose update produced the thread's current
-- state. nextThreadUpdateJob advances a thread only when state_edition_id differs
-- from the current edition, so each storyline (and the umbrella's general bucket)
-- advances its state exactly once per edition. NULL = never generated yet.

alter table threads add column state_edition_id uuid references editions(id);
