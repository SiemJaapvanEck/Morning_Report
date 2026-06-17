-- News threads — persistent storylines per profile that accumulate state
-- across editions. The morning report "builds on itself": each edition finds
-- what's genuinely new, attaches it to the right thread, and writes an UPDATE
-- that builds on yesterday's stored state instead of a fresh article.
--
-- This is the concrete realization of cross-reference axis B (earlier news →
-- reference) and reuses the slot conceptually reserved by modules/sol.
--
-- Entity extraction rides the existing scan call and is stored on
-- items.scan_meta.entities (existing jsonb column, no schema change there).
-- threads.entities is the denormalized union of a thread's entities, used for
-- free (no-LLM) matching of new items to existing threads.

create table threads (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles(id) on delete cascade,
  -- lane the thread lives in (best-matching topic/category from its items)
  topic_id        uuid references topics(id) on delete set null,
  category_id     uuid references categories(id) on delete set null,
  -- news-specific headline; rewritten by the thread-aware generation step
  title           text not null,
  -- the accumulated storyline prose the next edition builds on
  state           text,
  -- normalized entity set for free overlap matching
  entities        text[] not null default '{}',
  status          text not null default 'active' check (status in ('active', 'dormant', 'closed')),
  last_edition_id uuid references editions(id) on delete set null,
  -- when the thread last received an update (drives dormant/closed lifecycle)
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index threads_profile_status_idx on threads (profile_id, status);
create index threads_topic_idx on threads (topic_id);

-- Which items fed which thread in which edition. The unique (thread_id,
-- item_id) constraint is the idempotency backbone: re-running an edition never
-- double-feeds a thread.
create table thread_items (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references threads(id) on delete cascade,
  item_id     uuid not null references items(id) on delete cascade,
  edition_id  uuid references editions(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (thread_id, item_id)
);

create index thread_items_thread_idx on thread_items (thread_id);
create index thread_items_edition_idx on thread_items (edition_id);

-- RLS aan, zonder policies — zelfde keuze als 0003_rls.sql: alle toegang loopt
-- server-side via de service-role-key.
alter table public.threads      enable row level security;
alter table public.thread_items enable row level security;
