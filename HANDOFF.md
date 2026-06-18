# HANDOFF — current state

> Last updated: 18 June 2026, session on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

**News Threads** makes the morning report **build forth on itself**: persistent
storylines (threads) per profile that accumulate `state` across editions and get
a daily **update that builds on yesterday's state**. The Daily Paper is now
thread-aware and **reader-visible**.

Plan + board: **`docs/threads-plan.md`**. One phase per sprint, pause for review.
**Phases 0–5b are done and green** (lint/tsc/89 tests/build). **Phase 5c
(Archive with threads) is next** — Siem split the old Phase 5 into 5a/5b/5c.

Pipeline: scan → select → **threads (match/link)** → **generate (thread-aware)**
→ **daily_paper (assembly)** → finalize. The Daily Paper now renders the thread
updates as articles.

### Phases 0–4 (in `main`)
- **0** budget cap €0.10. **1** schema + pure `modules/threads`. **2** entity
  extraction on the scan call. **3** the `threads` step (match/link, no AI;
  gate = followed+`deep` OR big cross-source cluster ≥5; fixed-point idempotent).
  **4** `generateThreadUpdate` (deep tier) writes an UPDATE on the stored `state`,
  DESTEP lenses + `archivePrimer`; `generateStep` = one work-unit/tick, thread
  updates first.

### Phase 5a — Daily Paper assembly (this session)
- `modules/redactie/index.ts`: new **`composeDailyPaper`** → `{summary, intro,
  generalHeadline, generalBody}` (one `deep` call; `writeDailyDigest` left intact
  — extend, not rewrite).
- `dailyPaperStep`: builds **`dp_articles`** = the edition's thread updates
  (reused from Phase 4, ordered by `orderThreads`, lens via `selectLenses`,
  image from the deep item) **+** the general roundup; returns `dp_summary/
  dp_intro/dp_articles` (+ `daily_paper`/`intro` back-compat).
- `finalizeStep`: writes `dp_summary/dp_intro/dp_articles` into `front_page`.
- Verified live (June 17): 10 articles (9 thread + general), front_page OK, €0.0028.

### Phase 5b — Daily Paper UI (this session)
- `app/components/EditieWeergave.tsx` (the "Lees de krant" page): replaced the
  single "rode draad" block with **Summary → Introduction → article cards**
  (chips: GEVOLGD / VERHAALLIJN / DESTEP-lens; Archivo headline; image when
  present; body). Falls back to old `daily_paper` prose when no `dp_articles`.
  Atlas fonts re-imported + scoped to the page.
- `app/components/EditionView.tsx`: front-page block prefers `dp_summary`
  (fallback `intro`).
- Verified on localhost (screenshots): both render correctly, no console errors.

## What's open

### Phase 5c — Archive with threads (NEXT) — Siem's spec
- **Front page:** a new **"Archive"** button/tile. To make room, **split the
  weather block in half** (weather left, Archive entry right) in `EditionView`.
- **Archive page** (coexists with the calendar `/archief`; the calendar stays =
  "saved Daily Papers by date"; this new view = storylines, organized by **news
  category/topic**):
  - A **news-volume line** — X = date, Y = how much news there was — with **dots
    on the line marking threads and saved articles** (NOT every article). Per
    category/sector. Click a dot → that thread / saved piece.
  - **A graph per thread** — each storyline visualized over its own life.
- "Saved articles" = `follow_marks` with `target_type='item'` (the same manual-
  save hook; Siem already has 2). This is also trigger-2 "manual select" from
  Phase 3 — it surfaces here.
- Data is all present: editions have dates, `edition_items`→items→category,
  `thread_items` tie threads to editions/dates. **No heavy chart libs** (Atlas
  rule) — build custom lightweight SVG.
- Open sub-questions to confirm at 5c kickoff: exact dot styling/interaction; how
  per-category vs per-thread graphs are laid out on the page.

### Later
- **Phase 6** — optional og:image fallback + embeddings.
- **Carried over:** 2099 test fixtures in the DB (safe to delete); design
  coordination with the colleague; retro-translation of remaining Dutch comments.

## Known issues / things to keep in mind
- **Throwaway verify scripts** `scripts/verify-{threads,phase4,phase5a}.ts` are
  **untracked dev tools** (hardcoded Siem profile + June 17 date). NOT committed.
- **Verification mutated June 17 data:** Siem's profile has 9 threads with
  `state`/`title`/bodies; June 17's `front_page` has the structured Daily Paper
  and its deep items show the thread-update prose. Correct demo data — it's what
  future editions build on. Today's June 18 edition is the usual **empty cron
  shell** (cron fires 03:02 UTC before ingest populates — pre-existing).
- **Niche topics** (Tuinieren/Plantenindustrie/Landbouw/Tibet) are followed in
  the DB but won't surface news until the forced-search phase (`query_mode` read
  by nothing yet).
- **Existing editions** keep their old step list; threads/daily-paper changes
  only apply to editions planned after each phase landed. Old editions fall back
  to the rode-draad UI.
- **`.claude/` + `Morning Report design/` stay untracked**; **`CLAUDE.md` is
  gitignored** (per-contributor).
- **403 feeds**, **Open-Meteo** flaky, **Postgres `current_date` is UTC** (use
  `todayLocal()`) — unchanged, non-blocking.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live
  + RLS (service-role only). Vercel auto-deploys on push to `main`.
