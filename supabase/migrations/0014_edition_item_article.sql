-- Structured "full story" deep-research article per edition_item (Phase 1).
--
-- A thread update is no longer a flat paragraph but a two-layer article:
--   { lead, ripples: [{ subhead, text }] }
-- where `lead` are the source-grounded facts and each `ripple` is a reasoned
-- consequence with its own fitting subtitle. We keep the flat text in
-- edition_items.summary_text (the dashboard card + pre-Phase-1 editions read
-- that), and store the structured article here so the krant can render the
-- lead + the labelled ripple sections. NULL = a pre-Phase-1 / non-thread item.
alter table edition_items add column if not exists article jsonb;
