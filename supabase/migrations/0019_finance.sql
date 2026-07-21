-- Personal Finance module (PRD docs/prd/finance.md, Phase 1 — foundation).
--
-- The whole finance data model in one migration so Siem applies it once.
-- Six profile-scoped tables feed one coherent loop: manually entered
-- holdings + buys (priced live via the free keyless Yahoo endpoint,
-- multi-currency → EUR) give a portfolio value; manual incomes/expenses
-- give a monthly surplus (the DCA contribution); finance_goals tracks one
-- investment goal (ETA-driven) plus named savings goals; finance_settings
-- holds the per-profile knobs (expected return, contribution override,
-- base currency) that later phases (Settings Financiën tab, PRD #3) write.
--
-- Design decisions:
-- - Every table is profile-scoped (profile_id -> profiles, cascade delete)
--   and RLS-enabled with NO policies, per the project convention (0003):
--   all access goes server-side through the service-role key; the anon key
--   stays fully locked out until an explicit policy is added.
-- - Money is stored as `numeric`, always in EUR except where a holding's
--   *native* price is recorded (holdings.currency / holding_buys.currency +
--   price_native) — buys also carry a fee_eur so cost basis is exact.
-- - The legacy `portfolio_instruments` table (0001) is superseded by
--   `holdings` and is left untouched — not migrated, not dropped.
-- - No policies, no seed data — this migration is storage only. Phase 2+
--   build the pure math and the UI on top.

-- ============================================================
-- holdings — one row per manually-entered instrument (Yahoo ticker).
-- ============================================================
create table holdings (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  symbol      text not null,
  name        text,
  kind        text not null default 'aandeel' check (kind in ('aandeel', 'etf', 'crypto', 'overig')),
  -- native pricing currency, e.g. 'USD'/'EUR' — buys and live quotes are in this currency
  currency    text not null,
  created_at  timestamptz not null default now(),
  unique (profile_id, symbol)
);

alter table public.holdings enable row level security;

-- ============================================================
-- holding_buys — individual buy lots (DCA history) for a holding.
-- ============================================================
create table holding_buys (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  holding_id    uuid not null references holdings(id) on delete cascade,
  bought_on     date not null,
  quantity      numeric not null,
  -- price in the holding's native currency at time of purchase
  price_native  numeric not null,
  currency      text not null,
  fee_eur       numeric not null default 0,
  created_at    timestamptz not null default now()
);

create index holding_buys_holding_idx on holding_buys (holding_id);
create index holding_buys_bought_on_idx on holding_buys (bought_on);

alter table public.holding_buys enable row level security;

-- ============================================================
-- incomes — manual income entries feeding the monthly surplus.
-- ============================================================
create table incomes (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  received_on  date not null,
  label        text,
  amount_eur   numeric not null,
  recurring    boolean not null default false,
  created_at   timestamptz not null default now()
);

create index incomes_received_on_idx on incomes (received_on);

alter table public.incomes enable row level security;

-- ============================================================
-- expenses — manual categorized expense entries.
-- ============================================================
create table expenses (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  spent_on    date not null,
  category    text not null,
  label       text,
  amount_eur  numeric not null,
  recurring   boolean not null default false,
  created_at  timestamptz not null default now()
);

create index expenses_spent_on_idx on expenses (spent_on);

alter table public.expenses enable row level security;

-- ============================================================
-- finance_goals — exactly one 'investment' goal (DCA-driven ETA) plus many
-- named 'savings' goals (manual saved_eur, no auto-linking to a bank).
-- ============================================================
create table finance_goals (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  kind         text not null check (kind in ('investment', 'savings')),
  name         text not null,
  target_eur   numeric not null,
  target_date  date,
  -- savings only; an investment goal reads its progress off the live portfolio value
  saved_eur    numeric not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.finance_goals enable row level security;

-- ============================================================
-- finance_settings — one row per profile: expected return, optional DCA
-- override, and the display/base currency (always EUR for now).
-- ============================================================
create table finance_settings (
  id                              uuid primary key default gen_random_uuid(),
  profile_id                      uuid not null references profiles(id) on delete cascade,
  expected_return_pct             numeric not null default 7,
  -- nullable: when set, overrides the auto surplus-driven DCA amount
  -- (edited from the Settings Financien tab, PRD #3)
  monthly_contribution_override   numeric,
  base_currency                   text not null default 'EUR',
  updated_at                      timestamptz not null default now(),
  unique (profile_id)
);

alter table public.finance_settings enable row level security;
