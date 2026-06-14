-- Phase 1 of the scale-up (sessie 2026-06-14): broaden ingestion to the full
-- docs/ontwerp.md §5 source list and lay the plumbing for the catch-up media
-- recommendation.
--
-- Two things happen here:
--   1. `sources.medium` distinguishes plain article feeds from explainer media
--      (podcasts / YouTube). Media items are matched to the day's top-scoring
--      topic by the `catchup` step; they deliberately skip the "no old news"
--      freshness rule in ingestion (an explainer is evergreen).
--   2. A large batch of new RSS feeds + a small curated explainer media set.
--
-- All inserts are idempotent (guarded on url), so re-running is safe.

-- ============================================================
-- 1. medium discriminator on sources
-- ============================================================

alter table sources
  add column if not exists medium text not null default 'article'
  check (medium in ('article', 'podcast', 'video'));

-- ============================================================
-- 2. Article feeds — the wider wire/tech/science/etc. sweep (§5)
-- ============================================================

insert into sources (category_id, name, kind, url, medium)
select c.id, v.name, 'rss', v.url, 'article'
from (values
  -- Wereldtoneel (wire-sweep)
  ('wereld',     'Deutsche Welle World', 'https://rss.dw.com/rdf/rss-en-world'),
  ('wereld',     'France 24',            'https://www.france24.com/en/rss'),
  ('wereld',     'NPR World',            'https://feeds.npr.org/1004/rss.xml'),
  ('wereld',     'CNN World',            'http://rss.cnn.com/rss/edition_world.rss'),
  ('wereld',     'r/worldnews',          'https://www.reddit.com/r/worldnews/top/.rss'),
  -- Tech — breed & hardware
  ('tech',       'Engadget',             'https://www.engadget.com/rss.xml'),
  ('tech',       'Wired',                'https://www.wired.com/feed/rss'),
  ('tech',       'The Register',         'https://www.theregister.com/headlines.atom'),
  ('tech',       'Tom''s Hardware',      'https://www.tomshardware.com/feeds/all'),
  ('tech',       'VideoCardz',           'https://videocardz.com/feed'),
  ('tech',       '9to5Mac',              'https://9to5mac.com/feed/'),
  ('tech',       'MacRumors',            'https://feeds.macrumors.com/MacRumors-All'),
  ('tech',       'Android Central',      'https://www.androidcentral.com/feed'),
  ('tech',       'MIT Technology Review','https://www.technologyreview.com/feed/'),
  ('tech',       'r/technology',         'https://www.reddit.com/r/technology/top/.rss'),
  -- AI
  ('tech',       'MarkTechPost',         'https://www.marktechpost.com/feed/'),
  ('tech',       'Hugging Face Blog',    'https://huggingface.co/blog/feed.xml'),
  ('tech',       'VentureBeat AI',       'https://venturebeat.com/category/ai/feed/'),
  ('tech',       'The Gradient',         'https://thegradient.pub/rss/'),
  -- Cybersecurity
  ('tech',       'BleepingComputer',     'https://www.bleepingcomputer.com/feed/'),
  ('tech',       'Krebs on Security',    'https://krebsonsecurity.com/feed/'),
  ('tech',       'The Hacker News',      'https://feeds.feedburner.com/TheHackersNews'),
  -- Auto/EV & drones
  ('tech',       'Electrek',             'https://electrek.co/feed/'),
  ('tech',       'InsideEVs',            'https://insideevs.com/rss/articles/all/'),
  ('tech',       'DroneDJ',              'https://dronedj.com/feed/'),
  -- Financieel / Portfolio
  ('financieel', 'CNBC Top News',        'https://www.cnbc.com/id/100003114/device/rss/rss.html'),
  ('financieel', 'MarketWatch Top',      'http://feeds.marketwatch.com/marketwatch/topstories/'),
  ('financieel', 'Yahoo Finance',        'https://finance.yahoo.com/news/rssindex'),
  -- Games
  ('games',      'Eurogamer',            'https://www.eurogamer.net/feed'),
  ('games',      'Rock Paper Shotgun',   'https://www.rockpapershotgun.com/feed'),
  ('games',      'Game Developer',       'https://www.gamedeveloper.com/rss.xml'),
  ('games',      'r/Games',              'https://www.reddit.com/r/Games/top/.rss'),
  -- Wetenschap
  ('wetenschap', 'ScienceDaily',         'https://www.sciencedaily.com/rss/all.xml'),
  ('wetenschap', 'New Scientist',        'https://www.newscientist.com/feed/home/'),
  ('wetenschap', 'Nature News',          'https://www.nature.com/nature.rss'),
  ('wetenschap', 'Science (AAAS) News',  'https://www.science.org/rss/news_current.xml'),
  ('wetenschap', 'arXiv cs.AI',          'http://export.arxiv.org/rss/cs.AI'),
  ('wetenschap', 'arXiv quant-ph',       'http://export.arxiv.org/rss/quant-ph'),
  ('wetenschap', 'r/science',            'https://www.reddit.com/r/science/top/.rss'),
  -- Frontier (ruimte e.d.)
  ('frontier',   'SpaceNews',            'https://spacenews.com/feed/'),
  ('frontier',   'NASASpaceflight',      'https://www.nasaspaceflight.com/feed/'),
  ('frontier',   'Universe Today',       'https://www.universetoday.com/feed/'),
  ('frontier',   'r/space',              'https://www.reddit.com/r/space/top/.rss'),
  -- Lokaal NL & NL-tech
  ('lokaal',     'NU.nl Algemeen',       'https://www.nu.nl/rss/Algemeen'),
  ('lokaal',     'NL Times',             'https://nltimes.nl/rss.xml'),
  ('lokaal',     'DutchNews',            'https://www.dutchnews.nl/feed/'),
  ('lokaal',     'Silicon Canals',       'https://siliconcanals.com/feed/')
) as v(cat, name, url)
join categories c on c.slug = v.cat
where not exists (select 1 from sources s where s.url = v.url);

-- ============================================================
-- 3. Curated explainer media set (medium = 'podcast' / 'video')
-- ============================================================
-- YouTube channels via the keyless channel-RSS endpoint
-- (https://www.youtube.com/feeds/videos.xml?channel_id=<id>). Channel ids are
-- stable; curate/extend this set freely. These feed the catch-up recommendation
-- and are matched to the day's topic, so the AI scan must still topic-label them.

insert into sources (category_id, name, kind, url, medium)
select c.id, v.name, 'rss', v.url, v.medium
from (values
  -- video (YouTube)
  ('wetenschap', 'Kurzgesagt',         'https://www.youtube.com/feeds/videos.xml?channel_id=UCsXVk37bltHxD1rDPwtNM8Q', 'video'),
  ('wetenschap', 'Veritasium',         'https://www.youtube.com/feeds/videos.xml?channel_id=UCHnyfMqiRRG1u-2MsSQLbXA', 'video'),
  ('wereld',     'Vox',                'https://www.youtube.com/feeds/videos.xml?channel_id=UCLXo7UDZvByw2ixzpQCufnA', 'video'),
  ('wereld',     'Wendover Productions','https://www.youtube.com/feeds/videos.xml?channel_id=UC9RM-iSvTu1uPJb8X5yp3EQ', 'video'),
  ('frontier',   'PBS Space Time',     'https://www.youtube.com/feeds/videos.xml?channel_id=UC7_gcs09iThXybpVgjHZ_7g', 'video'),
  ('tech',       'Two Minute Papers',  'https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg', 'video'),
  -- podcast (RSS)
  ('tech',       'Lex Fridman Podcast','https://lexfridman.com/feed/podcast/', 'podcast'),
  ('tech',       'Darknet Diaries',    'https://feeds.megaphone.fm/darknetdiaries', 'podcast')
) as v(cat, name, url, medium)
join categories c on c.slug = v.cat
where not exists (select 1 from sources s where s.url = v.url);
