-- Entity relationships (Phase F4 — entity typing, deep layer).
--
-- F1–F3 gave every entity a *type* (actor / product / event / …) and taught the
-- threading logic that actors anchor umbrellas while products/events become
-- facets. F4 adds the missing edge: *which actor a product belongs to*.
--
-- Claude belongs to Anthropic; Fable belongs to Anthropic. Recording that link
-- lets an item that names only "Claude" still route to the Anthropic umbrella —
-- the connective tissue the reader (F4) and Sol's actor-level cross-reference
-- (F5) build on, instead of leaning purely on co-occurrence heuristics.
--
-- Design notes:
-- - parent_entity_id is nullable and self-referential: a product points at its
--   actor row; actors/persons/places leave it null. on delete set null so
--   removing an actor never orphans (deletes) its products.
-- - The registry stays a *prior*: the scan may infer a parent for a new product
--   (Phase F4 write-back), but a link once set is not nulled by a later scan
--   that omits it (mergeRegistryEntry keeps the existing parent).
-- - Variant canonicalization stays a reviewed dry-run script (Siem, 2 Jul 2026)
--   — no live auto-merge in the hot path.

alter table entities
  add column parent_entity_id uuid references entities(id) on delete set null;

comment on column entities.parent_entity_id is
  'The actor entity this product/event belongs to (product→actor). Null for actors, persons, places.';

-- Lookup path: given a product row, find its actor (and reverse: an actor''s products).
create index entities_parent_idx on entities (parent_entity_id);

-- ============================================================
-- Seed the two known product→actor links (the F1 seed products).
-- Subquery by norm_key so this is id-agnostic and idempotent.
-- ============================================================
update entities
   set parent_entity_id = (select id from entities where norm_key = 'anthropic'),
       updated_at = now()
 where norm_key in ('claude', 'fable')
   and parent_entity_id is null;
