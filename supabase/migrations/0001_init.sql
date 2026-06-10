-- Morning Report — initieel schema
-- Draaien via Supabase SQL Editor of `supabase db push`.

-- ============================================================
-- Profielen & interesses
-- ============================================================

create table profiles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  -- instellingen die per persoon verschillen (taal, locatie voor weer, etc.)
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  position    int not null default 0
);

create table topics (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  slug        text not null unique,
  name        text not null,
  -- cadans: hoe vaak dit onderwerp in het rapport hoort
  cadence     text not null default 'altijd' check (cadence in ('altijd', 'wekelijks', 'groot_nieuws')),
  -- query-modus: vrije onderwerpen zonder feed worden via web-search opgehaald
  query_mode  boolean not null default false,
  query_text  text,
  created_at  timestamptz not null default now()
);

create table sources (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name        text not null,
  kind        text not null default 'rss' check (kind in ('rss', 'api', 'query')),
  url         text,
  active      boolean not null default true,
  -- bron-multiplier voor de interessemotor (1.0 = neutraal)
  weight      real not null default 1.0,
  last_fetched_at timestamptz,
  last_error  text,
  created_at  timestamptz not null default now()
);

-- Hiërarchische interessescores: expliciete feedback per niveau,
-- overerving (item ← topic ← categorie) gebeurt in code.
create table topic_scores (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('topic', 'category', 'source')),
  target_id   uuid not null,
  score       real not null default 0,  -- -1.0 .. 1.0, 0 = neutraal
  updated_at  timestamptz not null default now(),
  unique (profile_id, target_type, target_id)
);

-- ============================================================
-- Items & ingestie
-- ============================================================

create table items (
  id           uuid primary key default gen_random_uuid(),
  source_id    uuid references sources(id) on delete set null,
  category_id  uuid references categories(id) on delete set null,
  topic_id     uuid references topics(id) on delete set null,
  guid         text,               -- uniek per bron (RSS guid of url)
  url          text,
  title        text not null,
  raw_summary  text,               -- feed-beschrijving, ongefilterd
  published_at timestamptz,
  fetched_at   timestamptz not null default now(),
  content_hash text,               -- voor cross-source dedupe
  is_ad        boolean not null default false,
  importance   real,               -- 0..1, gezet door scan-stap
  scan_meta    jsonb,              -- ruwe classificatie-output
  unique (source_id, guid)
);

create index items_published_idx on items (published_at desc);
create index items_hash_idx on items (content_hash);

-- ============================================================
-- Edities & pipeline (de stappenmachine)
-- ============================================================

create table editions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  date        date not null,
  status      text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
  -- voorpagina-payload: top-N, Sol-intro, weer-snapshot
  front_page  jsonb,
  created_at  timestamptz not null default now(),
  finished_at timestamptz,
  unique (profile_id, date)
);

create table pipeline_steps (
  id          uuid primary key default gen_random_uuid(),
  edition_id  uuid not null references editions(id) on delete cascade,
  kind        text not null,            -- bv. 'plan', 'weather', 'ingest', 'scan_rank', ...
  payload     jsonb not null default '{}'::jsonb,
  position    int not null default 0,   -- volgorde binnen de editie
  status      text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed', 'skipped')),
  attempts    int not null default 0,
  result      jsonb,
  error       text,
  started_at  timestamptz,
  finished_at timestamptz,
  created_at  timestamptz not null default now()
);

create index pipeline_steps_claim_idx on pipeline_steps (edition_id, status, position);

-- Atomair de volgende openstaande stap claimen.
-- Pakt pending-stappen, of failed-stappen onder de retry-limiet,
-- of running-stappen die >2 min vastzitten (stale recovery).
create or replace function claim_next_step(max_attempts int default 3)
returns setof pipeline_steps
language plpgsql
as $$
declare
  claimed pipeline_steps;
begin
  select * into claimed
  from pipeline_steps s
  where (
      s.status = 'pending'
      or (s.status = 'failed' and s.attempts < max_attempts)
      or (s.status = 'running' and s.started_at < now() - interval '2 minutes')
    )
    -- stappen draaien strikt in volgorde binnen een editie:
    -- claim alleen als er geen eerdere niet-afgeronde stap is
    and not exists (
      select 1 from pipeline_steps p
      where p.edition_id = s.edition_id
        and p.position < s.position
        and p.status not in ('done', 'skipped')
    )
  order by s.created_at, s.position
  limit 1
  for update skip locked;

  if claimed.id is null then
    return;
  end if;

  update pipeline_steps
  set status = 'running', started_at = now(), attempts = attempts + 1
  where id = claimed.id;

  claimed.status := 'running';
  claimed.attempts := claimed.attempts + 1;
  return next claimed;
end;
$$;

-- ============================================================
-- Editie-inhoud
-- ============================================================

create table edition_sections (
  id          uuid primary key default gen_random_uuid(),
  edition_id  uuid not null references editions(id) on delete cascade,
  kind        text not null check (kind in ('weather', 'category', 'sol', 'discovery', 'trivia', 'calendar', 'on_this_day')),
  category_id uuid references categories(id) on delete set null,
  title       text not null,
  position    int not null default 0,
  payload     jsonb not null default '{}'::jsonb
);

create table edition_items (
  id           uuid primary key default gen_random_uuid(),
  edition_id   uuid not null references editions(id) on delete cascade,
  section_id   uuid references edition_sections(id) on delete cascade,
  item_id      uuid not null references items(id) on delete cascade,
  band         text not null check (band in ('deep', 'summary', 'headline')),
  position     int not null default 0,
  summary_text text,               -- gegenereerde samenvatting / deep-dive
  sol_note     text,               -- Sol's notitie bij dit item (optioneel)
  unique (edition_id, item_id)
);

-- ============================================================
-- Feedback & volg-markeringen
-- ============================================================

create table feedback_events (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('item', 'topic', 'category', 'source')),
  target_id   uuid not null,
  rating      int check (rating between 1 and 5),
  escalation  text check (escalation in ('lager', 'tijdelijk_minder', 'niet_meer')),
  tags        text[] not null default '{}',
  note        text,
  created_at  timestamptz not null default now()
);

create table follow_marks (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('item', 'topic', 'category')),
  target_id   uuid not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (profile_id, target_type, target_id)
);

-- ============================================================
-- Sol
-- ============================================================

create table sol_memory (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  kind        text not null check (kind in ('karakter', 'observatie', 'voorkeur', 'compacted')),
  content     text not null,
  weight      real not null default 1.0,
  compacted   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table sol_notes (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  edition_id  uuid references editions(id) on delete cascade,
  target_type text check (target_type in ('item', 'topic', 'category', 'edition')),
  target_id   uuid,
  content     text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Kalender & portfolio
-- ============================================================

create table calendar_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  kind        text not null check (kind in ('earnings', 'release', 'event', 'dividend', 'ipo', 'verkiezing', 'overig')),
  date        date not null,
  certainty   text not null default 'bevestigd' check (certainty in ('bevestigd', 'verwacht', 'gerucht')),
  topic_id    uuid references topics(id) on delete set null,
  source      text,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index calendar_events_date_idx on calendar_events (date);

create table portfolio_instruments (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  symbol      text not null,
  name        text,
  kind        text not null default 'aandeel' check (kind in ('aandeel', 'etf', 'short', 'crypto', 'overig')),
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (profile_id, symbol)
);

-- ============================================================
-- Invoer (iOS Shortcut + web)
-- ============================================================

create table captures (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references profiles(id) on delete set null,
  text        text not null,
  kind        text not null default 'onderwerp' check (kind in ('onderwerp', 'bron', 'notitie')),
  processed   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Kosten / budget-guard
-- ============================================================

create table usage_log (
  id            uuid primary key default gen_random_uuid(),
  edition_id    uuid references editions(id) on delete cascade,
  step_id       uuid references pipeline_steps(id) on delete set null,
  model         text not null,
  input_tokens  int not null default 0,
  output_tokens int not null default 0,
  cost_eur      numeric(10, 6) not null default 0,
  created_at    timestamptz not null default now()
);

create index usage_log_edition_idx on usage_log (edition_id);

-- Totale kosten per editie, gebruikt door de budget-guard
create or replace function edition_cost_eur(p_edition_id uuid)
returns numeric
language sql stable
as $$
  select coalesce(sum(cost_eur), 0) from usage_log where edition_id = p_edition_id;
$$;
