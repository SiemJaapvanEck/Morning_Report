-- Full article body per item (deep-research depth, Phase 2 / Tier 1).
--
-- The RSS parser already pulls `content:encoded` (the full article HTML) but
-- ingest used to discard it, keeping only the short `raw_summary` snippet. That
-- snippet is too thin to write a "full story" deep-research article from (the
-- science, the economic/political ripple, the stakeholders). We now strip the
-- feed body to plain text and store it here; the deep-research call feeds a
-- bounded excerpt of it. NULL = the feed gave no usable body (snippet-only feed).
--
-- Additive + nullable: existing rows keep working, old editions are unaffected.

alter table items add column if not exists content text;
