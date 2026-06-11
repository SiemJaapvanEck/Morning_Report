-- Topic ↔ bron-koppeling (optioneel). Is een topic aan een bron gekoppeld,
-- dan krijgen items uit die bron het topic direct bij de ingestie (geen
-- AI-gok). Zonder koppeling geldt de normale weg: AI-topic-toewijzing in de
-- scan-stap over alle feeds (en later de query-zoekweg, fase 3).

alter table topics add column if not exists source_id uuid references sources(id) on delete set null;
