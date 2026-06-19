-- Per-thread, source-grounded prediction (Investment & Foresight, Phase C).
--
-- Each edition's thread update may carry a short, confidence-tagged forecast with
-- a target date, grounded in that thread's news + scheduled events. We store the
-- current prediction on the thread (one per thread, refreshed each edition) so the
-- daily_paper step can render it; the same prediction is also mirrored into a
-- linked calendar_event (meta.prediction = true) so it flows into the agenda and
-- the archive's dotted projections.
--
-- Shape: { text, target_date (YYYY-MM-DD), confidence (bevestigd|verwacht|gerucht),
--          source_basis }. NULL = no grounded prediction this run.

alter table threads add column prediction jsonb;
