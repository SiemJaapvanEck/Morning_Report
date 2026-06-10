-- RLS aan op alle tabellen, zonder policies.
-- Bewuste keuze: alle toegang loopt server-side via de service-role-key
-- (die RLS passeert); de anon-key wordt nergens gebruikt en is hiermee
-- volledig geblokkeerd. Komt er ooit client-side toegang, dan horen daar
-- expliciete policies bij in een nieuwe migratie.

alter table public.profiles              enable row level security;
alter table public.categories            enable row level security;
alter table public.topics                enable row level security;
alter table public.sources               enable row level security;
alter table public.topic_scores          enable row level security;
alter table public.items                 enable row level security;
alter table public.editions              enable row level security;
alter table public.pipeline_steps        enable row level security;
alter table public.edition_sections      enable row level security;
alter table public.edition_items         enable row level security;
alter table public.feedback_events       enable row level security;
alter table public.follow_marks          enable row level security;
alter table public.sol_memory            enable row level security;
alter table public.sol_notes             enable row level security;
alter table public.calendar_events       enable row level security;
alter table public.portfolio_instruments enable row level security;
alter table public.captures              enable row level security;
alter table public.usage_log             enable row level security;
