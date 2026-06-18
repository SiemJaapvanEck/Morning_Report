-- Per-profile "track as thread" selection over the shared topic catalog.
--
-- The catalog (categories/topics/sources) stays global and shared; what is
-- per-profile is the *selection*: which followed topics the reader wants the
-- report to maintain as a persistent storyline (a thread), regardless of any
-- single item's significance. This sits alongside follow_marks/topic_scores as
-- another personal layer over the shared item pool — no schema changes to the
-- catalog, no change to the scan-once classification.
--
-- Presence of a row = tracked. Toggling off deletes the row. The threads step
-- reads this set: a tracked topic opens/joins a thread for any of its items,
-- whereas the default gate still needs a followed + significant (deep) item.

create table thread_tracking (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  topic_id    uuid not null references topics(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (profile_id, topic_id)
);

create index thread_tracking_profile_idx on thread_tracking (profile_id);

-- RLS on, no policies — same choice as 0003_rls.sql/0008_threads.sql: all access
-- runs server-side via the service-role key.
alter table public.thread_tracking enable row level security;
