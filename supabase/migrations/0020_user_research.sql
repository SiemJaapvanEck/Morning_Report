-- User research tracking (Research Tracking PRD, Phase 1 — foundation).
--
-- Lets Siem paste/write his own research on a topic and have the app keep it
-- up to date. This migration only lays the data model: a research note
-- belongs to a profile, and can be linked to the followed storyline (thread)
-- the extraction step (Phase 2) and the seeding step (Phase 3) spawn for it.
--
-- Design notes:
-- - thread_id is the ONLY link between a research note and its thread — no
--   column is added to `threads`. A "research thread" is detected by joining
--   back through this column (locked decision, docs/prd/research-tracking.md).
--   on delete set null so removing a thread never orphans (deletes) the note.
-- - entities is populated by the Phase 2 extraction (askAI, scan tier) run on
--   submit; defaults to '{}' until that step writes it.
-- - category_id is best-effort classification, nullable (extraction may not
--   find a confident match) — on delete set null, same as threads.category_id.
-- - status is the per-note lifecycle Siem manages in "Mijn onderzoek":
--   nieuw (just added, not yet seeded/matched) → gevolgd (actively tracked,
--   thread seeded) → gearchiveerd (archived, history kept — no hard delete).

create table user_research (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  title       text not null,
  body        text not null,
  -- extracted anchor entities (Phase 2), for thread-matching overlap
  entities    text[] not null default '{}',
  category_id uuid references categories(id) on delete set null,
  -- the followed storyline seeded from this research (Phase 3); null until seeded
  thread_id   uuid references threads(id) on delete set null,
  status      text not null default 'nieuw' check (status in ('nieuw', 'gevolgd', 'gearchiveerd')),
  created_at  timestamptz not null default now()
);

create index user_research_profile_idx on user_research (profile_id);
create index user_research_thread_idx  on user_research (thread_id);

-- RLS aan, zonder policies — zelfde keuze als 0003_rls.sql/0008_threads.sql:
-- alle toegang loopt server-side via de service-role-key.
alter table public.user_research enable row level security;
