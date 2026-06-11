-- Voorpagina-dashboard (schets 2026-06-11): artikelkaarten met afbeelding en
-- Sol's match-percentage.
--
-- items.image_url        — artikelafbeelding uit de feed (enclosure/media:content/inline img)
-- edition_items.match_score — Sol's voorspelling (0..1) hoe goed het artikel bij de
--                             lezer past; de UI toont dit als percentage en rangschikt erop.

alter table items add column if not exists image_url text;

alter table edition_items add column if not exists match_score real;
