-- Allow following a whole storyline (Phase C).
--
-- Threads are entity-anchored since Phase A (anchor_entity, often topic_id NULL),
-- so the topic-keyed thread_tracking table can't express "follow this exact
-- storyline". We reuse follow_marks instead — same RLS + unique constraint — by
-- adding 'thread' as a valid target_type. A row (target_type='thread',
-- target_id=<thread id>, active=true) means the reader follows that storyline,
-- which powers the "Mijn verhalen" filter on the archive.
alter table follow_marks drop constraint if exists follow_marks_target_type_check;
alter table follow_marks
  add constraint follow_marks_target_type_check
  check (target_type in ('item', 'topic', 'category', 'thread'));
