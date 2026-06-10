-- Morning Report — starterset
-- Categorieën uit het ontwerp + een curated set bronnen om mee te beginnen.
-- Alles is via Instellingen aan te passen; dit is geen vaste lijst.

insert into categories (slug, name, position) values
  ('tech',        'Tech',         1),
  ('wereld',      'Wereldtoneel', 2),
  ('financieel',  'Financieel',   3),
  ('games',       'Games',        4),
  ('wetenschap',  'Wetenschap',   5),
  ('frontier',    'Frontier',     6),
  ('lokaal',      'Lokaal NL',    7);

-- Starter-topics (subset van het ontwerp; uitbreiden via app of capture)
insert into topics (category_id, slug, name, cadence) values
  ((select id from categories where slug = 'tech'),       'ai-nieuws',          'AI-nieuws',                         'altijd'),
  ((select id from categories where slug = 'tech'),       'cpu-gpu',            'CPU/GPU-releases & prijzen',        'altijd'),
  ((select id from categories where slug = 'tech'),       'big-tech',           'Grote tech-bedrijven',              'altijd'),
  ((select id from categories where slug = 'tech'),       'halfgeleiders',      'Halfgeleiders: TSMC, ASML, export', 'altijd'),
  ((select id from categories where slug = 'tech'),       'cybersecurity',      'Cybersecurity & breaches',          'altijd'),
  ((select id from categories where slug = 'tech'),       'dev-tooling',        'Developer-tooling & frameworks',    'wekelijks'),
  ((select id from categories where slug = 'tech'),       'ruimte-raketten',    'Raketten & ruimte',                 'altijd'),
  ((select id from categories where slug = 'wereld'),     'klimaat',            'Klimaat',                           'altijd'),
  ((select id from categories where slug = 'wereld'),     'conflict',           'Conflict & geopolitiek',            'altijd'),
  ((select id from categories where slug = 'wereld'),     'centrale-banken',    'Centrale banken & macro',           'groot_nieuws'),
  ((select id from categories where slug = 'financieel'), 'markten',            'Markten & sentiment',               'altijd'),
  ((select id from categories where slug = 'financieel'), 'nl-economie',        'Nederlandse economie',              'altijd'),
  ((select id from categories where slug = 'games'),      'game-releases',      'Upcoming releases & reviews',       'altijd'),
  ((select id from categories where slug = 'games'),      'game-industrie',     'Game-industrie & engines',          'wekelijks'),
  ((select id from categories where slug = 'wetenschap'), 'doorbraken',         'Baanbrekend onderzoek',             'altijd'),
  ((select id from categories where slug = 'frontier'),   'fusie-energie',      'Fusie & next-gen energie',          'groot_nieuws'),
  ((select id from categories where slug = 'frontier'),   'quantum',            'Quantumcomputing',                  'groot_nieuws'),
  ((select id from categories where slug = 'frontier'),   'ruimte-frontier',    'Maan-economie & exoplaneten',       'wekelijks'),
  ((select id from categories where slug = 'lokaal'),     'nl-nieuws',          'Nederland algemeen',                'altijd'),
  ((select id from categories where slug = 'lokaal'),     'arnhem',             'Arnhem & Gelderland',               'altijd');

-- Starter-bronnen: bewust klein gehouden (verticale plak).
-- De volledige bronnenlijst uit het ontwerp komt erin bij fase 3 (volledige ingestie).
insert into sources (category_id, name, kind, url) values
  ((select id from categories where slug = 'lokaal'),     'NOS Algemeen',     'rss', 'https://feeds.nos.nl/nosnieuwsalgemeen'),
  ((select id from categories where slug = 'financieel'), 'NOS Economie',     'rss', 'https://feeds.nos.nl/nosnieuwseconomie'),
  ((select id from categories where slug = 'tech'),       'The Verge',        'rss', 'https://www.theverge.com/rss/index.xml'),
  ((select id from categories where slug = 'tech'),       'Ars Technica',     'rss', 'https://feeds.arstechnica.com/arstechnica/index'),
  ((select id from categories where slug = 'tech'),       'TechCrunch',       'rss', 'https://techcrunch.com/feed/'),
  ((select id from categories where slug = 'tech'),       'Tweakers',         'rss', 'https://feeds.feedburner.com/tweakers/mixed'),
  ((select id from categories where slug = 'wereld'),     'BBC World',        'rss', 'https://feeds.bbci.co.uk/news/world/rss.xml'),
  ((select id from categories where slug = 'wereld'),     'The Guardian World', 'rss', 'https://www.theguardian.com/world/rss'),
  ((select id from categories where slug = 'wereld'),     'Al Jazeera',       'rss', 'https://www.aljazeera.com/xml/rss/all.xml'),
  ((select id from categories where slug = 'wetenschap'), 'Quanta Magazine',  'rss', 'https://www.quantamagazine.org/feed/'),
  ((select id from categories where slug = 'wetenschap'), 'Phys.org',         'rss', 'https://phys.org/rss-feed/'),
  ((select id from categories where slug = 'games'),      'Polygon',          'rss', 'https://www.polygon.com/rss/index.xml'),
  ((select id from categories where slug = 'games'),      'GamesIndustry.biz','rss', 'https://www.gamesindustry.biz/feed'),
  ((select id from categories where slug = 'frontier'),   'Space.com',        'rss', 'https://www.space.com/feeds/all');
