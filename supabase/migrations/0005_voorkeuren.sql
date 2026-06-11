-- Accountvoorkeuren (sessie 2026-06-12): nieuwe categorie "Goed nieuws" met
-- positieve-nieuws-feeds, als onderdeel van de standaard-voorselectie voor
-- nieuwe profielen (tech, financieel, wereld, wetenschap, goed-nieuws).
-- De voorkeuren zelf leven per profiel in topic_scores + follow_marks;
-- daarvoor is geen schemawijziging nodig.

insert into categories (slug, name, position)
values ('goed-nieuws', 'Goed nieuws', 8)
on conflict (slug) do nothing;

insert into topics (category_id, slug, name, cadence)
values (
  (select id from categories where slug = 'goed-nieuws'),
  'positief-nieuws',
  'Positief nieuws',
  'altijd'
)
on conflict (slug) do nothing;

insert into sources (category_id, name, kind, url, active, weight)
select c.id, s.name, 'rss', s.url, true, 1.0
from categories c,
  (values
    ('Good News Network', 'https://www.goodnewsnetwork.org/feed/'),
    ('Positive News',     'https://www.positive.news/feed/')
  ) as s(name, url)
where c.slug = 'goed-nieuws'
  and not exists (select 1 from sources where url = s.url);
