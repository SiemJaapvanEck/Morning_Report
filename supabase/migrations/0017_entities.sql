-- Entity registry (Phase F1 — entity typing).
--
-- Entities today are flat strings on items.scan_meta.entities; this table
-- attaches a *type* to every recurring entity so the threading logic can
-- distinguish actors (Anthropic — anchors umbrellas) from products (Claude —
-- becomes a facet/storyline) from events, places, and persons.
--
-- Design decisions:
-- - type vocabulary is fixed: the six values of entity_type.
-- - registry is a *prior*, not gospel: seed rows are the trusted core;
--   ai_high / ai_low rows are correctable by updating the row.
-- - write-back (Phase F2) upserts on norm_key — idempotent re-runs converge.
-- - first_seen_edition is null for seeds (they pre-date this migration).
--
-- Behaviour changes come in F2 (scan gets types) and F3 (threading uses them).
-- This migration is storage only — no existing code path touches this table.

create type entity_type as enum ('actor', 'person', 'product', 'event', 'place', 'other');
create type entity_confidence as enum ('seed', 'ai_high', 'ai_low');

create table entities (
  id                 uuid primary key default gen_random_uuid(),
  -- human-readable display form, e.g. "Anthropic", "Claude"
  canonical_name     text not null,
  -- unique lookup key: output of normalizeEntity() — lowercase, no diacritics,
  -- punctuation folded to spaces. The upsert key for registry write-back.
  norm_key           text not null unique,
  type               entity_type not null default 'other',
  -- pre-normalized alias strings that also resolve to this canonical entry
  aliases            text[] not null default '{}',
  confidence         entity_confidence not null default 'seed',
  -- the first edition that produced this entity (null for seeded rows)
  first_seen_edition uuid references editions(id) on delete set null,
  created_at         timestamptz not null default now(),
  -- set by the application upsert on every write-back
  updated_at         timestamptz not null default now()
);

-- Primary lookup path: norm_key → type (used by every scan item).
create index entities_norm_key_idx on entities (norm_key);

alter table public.entities enable row level security;

-- ============================================================
-- Seed: DATELINE_STOPLIST → place
-- These are the generic country/city datelines from modules/threads/index.ts
-- that never anchor a thread today (isAnchorableEntity returns false for them).
-- Under the typed model, place entities likewise never anchor umbrellas.
-- ============================================================
insert into entities (canonical_name, norm_key, type, aliases, confidence) values
  ('US',          'us',          'place', array['united states', 'united states of america', 'u s', 'u s a', 'verenigde staten'], 'seed'),
  ('UK',          'uk',          'place', array['united kingdom', 'verenigd koninkrijk'], 'seed'),
  ('EU',          'eu',          'place', array['european union', 'europese unie'], 'seed'),
  ('France',      'france',      'place', '{}', 'seed'),
  ('Germany',     'germany',     'place', '{}', 'seed'),
  ('China',       'china',       'place', '{}', 'seed'),
  ('Kyiv',        'kyiv',        'place', '{}', 'seed'),
  ('Moscow',      'moscow',      'place', '{}', 'seed'),
  ('Washington',  'washington',  'place', '{}', 'seed'),
  ('Brussels',    'brussels',    'place', '{}', 'seed'),
  ('Nederland',   'nederland',   'place', '{}', 'seed'),
  ('Netherlands', 'netherlands', 'place', '{}', 'seed'),
  ('Europe',      'europe',      'place', '{}', 'seed');

-- ============================================================
-- Seed: alias-map canonical targets that are place entities
-- These resolve from the ENTITY_ALIASES map in modules/threads/index.ts.
-- ============================================================
insert into entities (canonical_name, norm_key, type, aliases, confidence) values
  ('Ukraine', 'ukraine', 'place', array['oekraine'],  'seed'),
  ('Russia',  'russia',  'place', array['rusland'],   'seed'),
  ('Lebanon', 'lebanon', 'place', array['libanon'],   'seed');

-- ============================================================
-- Seed: persons
-- ============================================================
insert into entities (canonical_name, norm_key, type, aliases, confidence) values
  ('Trump', 'trump', 'person', array['donald trump', 'trump administration'], 'seed');

-- ============================================================
-- Seed: institutional actors
-- (Federal Reserve and Warner Bros from the alias map; the four hand-curated
-- recurring tech actors from the spec.)
-- ============================================================
insert into entities (canonical_name, norm_key, type, aliases, confidence) values
  ('Federal Reserve', 'federal reserve', 'actor', array['us federal reserve', 'u s federal reserve', 'the federal reserve', 'fed'], 'seed'),
  ('Warner Bros',     'warner bros',     'actor', array['warner bros discovery'],                                                   'seed'),
  ('Anthropic',       'anthropic',       'actor', '{}',                                                                             'seed'),
  ('OpenAI',          'openai',          'actor', '{}',                                                                             'seed'),
  ('SpaceX',          'spacex',          'actor', '{}',                                                                             'seed'),
  ('NASA',            'nasa',            'actor', '{}',                                                                             'seed');

-- ============================================================
-- Seed: AI products — the key fragmentation sources from the spec.
-- claude* aliases group the version variants seen in scan output.
-- fable aliases absorb the "Claude Fable N" full-name forms.
-- ============================================================
insert into entities (canonical_name, norm_key, type, aliases, confidence) values
  ('Claude', 'claude', 'product',
    array['claude science', 'claude sonnet 5', 'claude opus', 'claude haiku',
          'claude sonnet', 'claude sonnet 4', 'claude opus 4', 'claude haiku 4'],
    'seed'),
  ('Fable',  'fable',  'product',
    array['claude fable 5', 'claude fable', 'fable 5'],
    'seed');
