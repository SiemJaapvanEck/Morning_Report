# HANDOFF — current state

> Last updated: 27 June 2026, session on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

Big session: we **re-imagined the daily paper** and built the engine + layout to
make it real. The whole stack below is in `main` and green
(lint/tsc/**133 tests**/build). Two new migrations are applied to the live DB
(`0013`, `0014`).

The pipeline is unchanged in shape (scan → select → threads → agenda → generate
→ daily_paper → finalize); the work was in **depth of generation** and **shape of
the output**, not the step machine.

### The overarching direction (decided this session)

- **Plan A — re-architect the app layer into "block-slices", keep the pure engine.**
  We do NOT rewrite `modules/` / the pipeline / the schema. We reshape `app/`.
  A "block" = a pure module (its data/context + logic) **+** an app feature folder
  (its React UI + its own page). Each block gets its own **PRD**. We started the
  **Daily Paper PRD** (boundary = the `/editie/[datum]/krant` reading surface) but
  pivoted mid-PRD to first deepen the engine that feeds it. PRD work is paused,
  not abandoned. (Memory: `block-slice-architecture`.)

### Shipped this session (in `main`)

1. **Deep-research "full story" — two layers.** A thread update is no longer a flat
   paragraph but `{ lead, ripples:[{ subhead, text }] }`:
   - **`lead`** = source-grounded facts (strict no-invention).
   - **`ripples`** = ≤3 *reasoned* consequences (the "doorwerking"), each with its
     own fitting news-specific subtitle (e.g. *"Hoe Tesla een deel van de klap
     opving"*). Analysis is allowed; fabricating specific facts is not; only
     ripples it can ground; fewer/none when the day is thin.
   - **Phase 2 (richer input):** the RSS parser already pulled `content:encoded`
     but ingest discarded it. We now strip it to text (`htmlToText`) and store it
     on `items.content` (migration `0013`); deep research feeds a **bounded
     ~1500-char body excerpt** (`excerptForPrompt`) instead of a 200-char snippet.
     No HTTP fetching (dodges the 403-feed wall).
   - **Phase 1 (two-layer output):** `THREAD_UPDATE_SCHEMA` + prompt rewritten;
     `ThreadUpdate`/`DailyPaperArticle` now extend `DeepArticle`; the structured
     article is persisted to `edition_items.article` jsonb (migration `0014`),
     with the flat text still in `summary_text` for the dashboard + old editions.
     Pure helpers `cleanArticle` / `flattenArticle` / `excerptForPrompt` (tested).
   - **Budget:** ceiling €0.10 → **€0.15**; deep `maxTokens` 1000 → 1500;
     new `config.generate.itemExcerptChars`.

2. **Account switcher** (`AccountWisselaar`, in the header) — switch profiles
   (Siem / Jesse) without clearing cookies; reuses `POST /api/profiel`. The root
   layout now fetches profiles + the current cookie server-side (fails safe).

3. **Daily Paper re-imagination — Phase 0 + A.** The krant is now a **full-width
   sectioned newspaper** (was a thin "deep articles + roundup" list):
   - **Phase 0 (Sol's section text):** `composeSectionIntros` (`modules/redactie`,
     one budget-aware AI call) writes a **one-sentence caption + a small 2-3
     sentence summary per section**; persisted as `front_page.dp_sections` via the
     daily_paper → finalize steps. Pure `cleanSectionIntros` (tested).
   - **Phase A (layout):** `EditieWeergave.tsx` rebuilt — masthead → Sol's
     *"vandaag in het kort"* synthesis → a **Hoofdverhaal** (the best-matching deep
     story, lead + ripples) → **sections** (title + caption + summary + a depth
     mix: featured deep articles, summary cards, an "Ook in het nieuws" brief
     list). `getEdition` now carries the structured `article` per item.

**Verified on a live run.** A full pipeline run built today's editions
(2026-06-27) for both profiles; the krant renders end-to-end on **Jesse's**
edition (8 sections, real captions/summaries, the NASA medical-drone lead shows a
ripple). Run on localhost: `npm run dev`, switch to **Jesse**, "Lees de krant".

## What's open

The re-imagined paper has a roadmap (order **C → B → D**, then deep-research 3/4):

- **Phase C — Broaden + rank the selection (the real fix for "more articles than
  paper").** Today the funnel caps hard: ~1,281 items/day are ingested but the
  paper surfaces only a handful as full articles. Loosen the caps so sections fill
  from the pool, ranked/featured by **profile + threads + reviews**. Converges with
  the deferred "scale the count" + "broaden the mega net" work.
- **Phase B — Storyline links + restore Vooruitblik.** Surface explicit
  *"Verhaallijn · deel N"* links per article, and reconnect thread data so the
  **prediction box returns** (it was dropped from the krant in the Phase A reshape
  — see known issues). Also: followed-section-first ordering.
- **Phase D — Reviews steer the paper.** Make the −2…+2 ratings + follows actively
  promote/demote what's selected and featured.
- **Deep-research Phase 3/4 (deferred):** two-pass research per topic if a single
  rich call breaches the ~7s tick wall; scale to 6–12 deep topics/edition.
- **Daily Paper PRD** — finish it (paused mid-grilling).

## Known issues / things to keep in mind

- **Inline "Vooruitblik" (prediction) was removed from the krant** in the Phase A
  reshape — the new layout renders from section items, which don't carry the
  thread prediction. It returns in Phase B. The data is intact (threads,
  `calendar_events`, dashboard agenda, archive).
- **Siem's own profile is thin today** — its edition got 0 deep-thread articles
  (thin news on his tracked topics), so view **Jesse's** profile to see the paper.
  Phase C addresses why so little reaches the paper.
- **`content` only flows forward** — the ~8,600 pre-existing items have
  `content = null`; full bodies + ripples appear on items ingested *after* this
  session's change. Old editions fall back gracefully (lead = old summary_text, no
  ripples).
- **Today's editions (2026-06-27) are real, regenerated data** on both profiles.
  Jesse's daily_paper + finalize were re-run once to backfill `dp_sections`.
- **Dev server / preview:** the dev server runs on `localhost:3000`. A port
  conflict came up at the end (a stray `npm run dev` held 3000); the
  `.claude/launch.json` has a `dev` config on port 3000. Siem checks localhost
  himself — don't screenshot.
- **Throwaway dev scripts** (untracked, NOT committed): `scripts/verify-{threads,
  phase4,phase5a}.ts`, `scripts/backfill-threads.ts`. `.claude/` + `Morning Report
  design/` stay untracked; `CLAUDE.md` is gitignored.
- **403 feeds**, **Open-Meteo** flaky, **Postgres `current_date` is UTC** (use
  `todayLocal()`) — unchanged, non-blocking.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live
  + RLS (service-role only). Vercel auto-deploys on push to `main`.
