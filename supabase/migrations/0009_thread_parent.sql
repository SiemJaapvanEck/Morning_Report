-- Mega-threads. A genuinely big, recurring story (an "anchor entity" that
-- appears across multiple days) graduates into a PARENT thread that absorbs the
-- smaller entity-overlap threads about it as children — the children are its
-- timeline dots in the archive. Applied live to project iqhyndhrlhjfdrwjvmjv.
alter table threads add column if not exists parent_thread_id uuid references threads(id) on delete set null;
alter table threads add column if not exists anchor_entity text; -- normalized anchor for a mega-thread; null for normal threads
create index if not exists threads_parent_idx on threads(parent_thread_id);
create index if not exists threads_anchor_idx on threads(profile_id, anchor_entity);
