# HANDOFF — current state

> Last updated: 19 June 2026, session on Siem's account.
> Read this first when picking up the project; working agreements live in CLAUDE.md.

## Where we stand

**The whole pipeline is green and in `main`** (lint/tsc/**115 tests**/build).
**Current focus: broaden the mega net** (see "What's open" — the old
Investment & Foresight A–D roadmap has been retired now that the agenda +
prediction loop shipped).

Pipeline: scan **(+ event extraction)** → select → **threads** → **agenda** →
**generate (thread-aware + predictions)** → **daily_paper** → finalize.

### Shipped & in `main` — the news→foresight loop

All live and reviewed on localhost. (We deliberately **skipped the finance-section
/ RSS-seed idea** — not abandoned, just not wanted now; the custom-RSS UI already
exists if it's ever picked up. The earlier **"52-week per-thread graph" idea is
off the roadmap** unless reprioritised.)

- **Auto-scheduled agenda.** The scan call also extracts explicitly-dated forward
  events (`ExtractedEvent`; no date ⇒ none, never invented), and an `agenda`
  pipeline step (after `threads`) persists them per-profile, linked to source item
  + thread, scoped to followed/threaded items, hard-validated. Migration `0011`
  (`calendar_events` gains `profile_id`/`item_id`/`thread_id`). Pure core in
  `modules/calendar` (`buildAgendaRows`, `isValidIsoDate`, `persistAgendaRows`).
- **Dashboard agenda tile** (`EditionView.tsx`, `AgendaTegel`): upcoming events as
  dated rows (kind label, ↳ storyline, certainty badge), fed by
  `getUpcomingAgenda` (`AgendaEvent` in `app/lib/queries.ts`). The "Waar het nieuws
  vandaan komt" world map moved into the blue briefing hero (small, white-on-blue;
  `WereldKaart` gained a `tint` prop). Old map tile + "Waar Sol las" fallback removed.
- **Archive dotted projections** (`StorylineChart`): each storyline reaches forward
  to its upcoming events on a split "now" axis (history left ~60%, horizon right
  ~40%, faint "NU" divider); dashed lines + ◇ markers with dash density/opacity =
  certainty; markers selectable → a "Vooruitblik" read panel. `getThreadArchive`
  attaches each mega's events (`ArchiveProjection`).
- **Per-thread, source-grounded predictions.** `generateThreadUpdate` emits a
  `prediction { text, target_date, confidence, source_basis }`, grounded **only**
  in the thread's new items + scheduled events; pure tested `cleanPrediction()`
  (no text / no basis / no valid future date ⇒ none). Migration `0012`
  (`threads.prediction`); `applyThreadUpdate` (now takes `profileId`) writes it +
  mirrors a linked, idempotently-refreshed `calendar_event` so it flows into the
  agenda + archive. Krant "Vooruitblik" block (`EditieWeergave.tsx`).

**Demo data is seeded, not generated.** Predictions + events are seeded on Siem's
Iran/SpaceX storylines (`meta.seed = true`; prediction events also
`meta.prediction = true`), removable with
`delete from calendar_events where meta->>'seed' = 'true'`. The **AI generation
path itself is only proven on a live pipeline run**; schema/prompt/validation are
unit-tested.

### Track-as-thread + custom RSS source (earlier, in `main`)

- **Per-profile "track as thread" selection.** Migration `0010_thread_tracking`
  adds a `thread_tracking` table (presence of a row = tracked; toggle off deletes
  it). `applyThreadTracking()` (`modules/preferences`) diff-replaces the set;
  `assembleUserContext` loads `trackedTopicIds`, threaded through `threadsStep` into
  `planThreadActions`, which gains a third thread-birth reason **`"tracked"`**: a
  tracked topic opens/joins a thread for *any* of its items (no `deep`/follow
  needed). UI: a "✦ Verhaallijn" toggle in `VoorkeurenKiezer`.
- **Add-your-own RSS source.** `createUserSource()` + `validateFeedUrl()` parse the
  feed before inserting; `POST /api/bronnen`; a validate-&-add form in
  `VoorkeurenKiezer`. `isHttpUrl()` pure helper.

### News Threads foundation (earlier, in `main`)
- **0–4**: budget cap; threads schema + pure module; entity extraction;
  `threads` step (match/link, gate = followed+`deep` OR big cluster ≥5);
  `generateThreadUpdate` (deep, builds on stored `state`).
- **5a/5b**: Daily Paper assembly (`composeDailyPaper` → `dp_*` in `front_page`)
  + krant UI (Summary→Intro→article cards).
- **5c**: mega-thread anchoring (migration `0009`: `parent_thread_id` +
  `anchor_entity`) + the `/archive` `StorylineChart` (one sector-colored line per
  mega, child-story dots, article panel). `dominantLens()` + lens-accuracy fix.

## What's open

### ACTIVE FOCUS — Broaden the mega net

**The mechanism today** ([modules/threads/index.ts](modules/threads/index.ts)):
- `detectAnchors` — any entity seen on ≥ N distinct days becomes an *anchor* (a
  candidate mega-thread).
- `assignMegaThreads` — a normal thread joins an anchor's mega **only if its entity
  set contains that exact anchor token** (`ents.has(a.entity)`), going to its
  biggest matching anchor.

**The problem:** this exact-string net is precise but leaky. A storyline about the
same real-world event tagged only with *related* proper nouns ("Netanyahu",
"Tehran", "Hezbollah", "IRGC") — and not the literal `"iran"` — is never pulled
into the Iran mega, even though a human would group them.

**Chosen approach: co-occurrence clustering** (no LLM, no migration — set math on
the entities already in `scan_meta.entities`; adaptive; deterministic). Rejected
for now: hand-maintained alias maps (brittle) and embeddings (more infra than
this needs — revisit only if co-occurrence proves too weak). The plan below is
build-ready for the next session.

**The idea:** for each anchor, compute the set of *companion* entities that
strongly imply it across the window's items, forming an **anchor cluster**
(`{ anchor } ∪ companions`). A thread then joins an anchor's mega when its entity
set intersects that cluster — not only when it contains the exact anchor token.
So a thread tagged only "Netanyahu"/"Hezbollah" joins the Iran mega because those
entities strongly co-occur with "iran".

**Concrete steps:**
1. **New pure helper** `buildAnchorClusters(anchors, itemEntityLists, cfg)` in
   `modules/threads/index.ts` → `Map<anchorEntity, Set<clusterEntity>>`.
   - Count co-occurrence over **item-level** entity lists (entities sharing one
     article — finer signal than thread-level): for each item, every unordered
     pair of its normalized entities.
   - A companion `b` joins anchor `A`'s cluster iff the **conditional probability
     `P(A | b) = cooccur(A,b) / count(b)` ≥ `clusterMinConditional`** (directional:
     "when b appears, how often is A also there" — catches satellites like IRGC→iran
     without merging on a merely frequent entity) **and** `cooccur(A,b) ≥
     clusterMinCount` (kills single-coincidence links).
   - The cluster always contains the anchor itself.
2. **Extend `assignMegaThreads`** to take the clusters: a thread's matched anchors
   = anchors whose cluster **intersects** the thread's entity set (replacing
   `ents.has(a.entity)`). Keep the existing "biggest anchor wins, alphabetical
   tie-break, ≥ minChildren survive" logic unchanged.
3. **Loader:** the threads step already reads the window's `edition_items →
   items.scan_meta.entities` for `loadEntityDays`; reuse those same rows to also
   produce `itemEntityLists` (one entity array per item) for the co-occurrence
   count — ideally fold both out of one query.
4. **Config** (`config.threads`): `clusterMinConditional` (start ~0.6),
   `clusterMinCount` (start ~2), and optionally `clusterMaxSize`. Tunable so the
   guardrail can be dialed without code changes.

**Guardrails against over-merging (the core risk — broader recall must not sweep
unrelated stories into one mega):**
- Directional conditional-prob threshold (above), not raw co-occurrence.
- A companion that is **itself an anchor is never absorbed** into another anchor's
  cluster (two big stories never merge).
- Minimum co-occurrence count floor.
- Optional: a companion joins **only its single strongest** anchor cluster, so it
  can't bridge two megas.

**Verify before trusting it:** log/inspect each anchor's computed cluster on Siem's
real data (does the Iran cluster pick up Netanyahu/Hezbollah/Tehran *without*
pulling in unrelated entities?) — a small dry-run script or a temporary step
result field. Then confirm a Netanyahu-only thread actually joins the Iran mega.

**Open decisions for that session:** the two thresholds (tune on real data);
whether to surface the cluster in the UI (e.g. "ook: Netanyahu, Hezbollah" on the
mega — optional, later). **No schema change, no AI call.** Touches:
`modules/threads` (new helper + `assignMegaThreads` + the loader), `threadsStep`
wiring, `config.threads`, vitest.

### Later / carried over
- **og:image fallback + embeddings** — optional; embeddings may merge with the
  mega-net work above.
- **2099 test fixtures** — safe to delete.
- **Colleague design coordination** (Atlas vs. Dispatch resolved on Siem's side;
  collega-side still open).
- **Dutch→English comment retro-translation** — do opportunistically.

## Known issues / things to keep in mind
- **Throwaway dev scripts** (untracked, NOT committed): `scripts/verify-{threads,
  phase4,phase5a}.ts` and `scripts/backfill-threads.ts` (hardcoded Siem profile +
  June dates).
- **Demo data mutated:** Siem's profile has real mega-threads (Iran/SpaceX), June
  13–17 editions are entity'd + threaded, and `calendar_events` holds seeded events
  + predictions (`meta.seed = true`, removable — see above).
- **English UI exception:** the archive uses English labels ("Archive",
  "Storylines") at Siem's request — deliberate exception to CLAUDE.md "UI copy
  stays Dutch". The nav's Dutch "Archief" (calendar) stays.
- **Existing editions** keep their old step list; threads/daily-paper/mega/agenda
  changes only apply going forward. Old editions fall back gracefully.
- **`.claude/` + `Morning Report design/` untracked**; **`CLAUDE.md` gitignored**.
- **403 feeds**, **Open-Meteo** flaky, **Postgres `current_date` is UTC** (use
  `todayLocal()`) — unchanged, non-blocking.
- **AI provider = Grok (xAI)** via `askAI()`; Anthropic switchable. Supabase live
  + RLS (service-role only). Vercel auto-deploys on push to `main`.
