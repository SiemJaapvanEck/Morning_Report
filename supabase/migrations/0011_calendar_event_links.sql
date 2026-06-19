-- Provenance + linkage for auto-extracted calendar events (Investment & Foresight, Phase B).
--
-- Until now calendar_events was a global, unlinked store written by nobody. Phase B
-- fills it automatically from real article text: the scan call pulls explicitly-dated
-- forward events ("IPO op 1 juli", "verkiezingen 5 nov") and a new `agenda` pipeline
-- step persists them. That requires knowing whose agenda an event belongs to and where
-- it came from, so we add per-profile + source linkage.
--
-- Idempotency lives in the agenda step (delete-by-item_id + re-insert from scan_meta),
-- so no DB unique constraint is needed; an index on (profile_id, date) backs the
-- per-profile upcoming-events query.

alter table calendar_events
  add column profile_id uuid references profiles(id) on delete cascade,
  add column item_id    uuid references items(id)    on delete set null,
  add column thread_id  uuid references threads(id)  on delete set null;

create index calendar_events_profile_date_idx on calendar_events (profile_id, date);
create index calendar_events_item_idx          on calendar_events (item_id);
