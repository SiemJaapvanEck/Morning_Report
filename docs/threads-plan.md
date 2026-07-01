# News Threads — sprint board & implementation plan

> **How we run this:** one phase = one sprint. Implement a phase, pass the full
> gate, **pause for Siem's review before starting the next**. A new session
> picks up at the first unchecked box below.

## Sprint board

- [x] **Phase 0** — Budget cap €0.10 + scan reclaim *(done, in `main` after this push)*
- [x] **Phase 1** — `threads`/`thread_items` schema + pure `modules/threads` + 22 tests *(done)*
- [x] **Phase 2** — Entity extraction piggybacked on the scan call *(done; display-form entities + `dedupeEntities`, 78 tests, verified live €0.057/edition)*
- [x] **Phase 3** — `threads` pipeline step (match + link + state-merge, no AI) *(done; followed+deep / big-topic gate, fixed-point idempotency, verified live)*
- [x] **Phase 4** — Thread-aware generation *(done; `generateThreadUpdate` builds on stored state, DESTEP lenses + archive primer, 9 updates €0.013, idempotent)*
- [x] **Phase 5a** — Daily Paper assembly *(done; `composeDailyPaper` → `dp_summary/dp_intro/dp_articles` in `front_page`, €0.0028, verified)*
- [x] **Phase 5b** — Daily Paper UI *(done; krant page renders Summary → Introduction → thread article cards with lens chips; front-page block shows `dp_summary`; verified on localhost)*
- [x] **Phase 5c-1** — Mega-threads *(done; `parent_thread_id`/`anchor_entity` schema 0009, anchor-entity detection + best-anchor absorption, `minChildren=3`, orphan cleanup. Iran (5 children, 5-day timeline) + SpaceX verified)*
- [x] **Phase 5c-2** — Archive UI v1 *(done; front-page Archive tile + split weather; `/archive` with per-mega `ThreadTimeline` cards — volume line + clickable dots + article panel. Verified on localhost)*
- [ ] **Phase 5c-3** — Archive rework: ONE big multi-line chart ← **next sprint** (see HANDOFF "What's open")
- [ ] **Phase 6** — Optional: og:image fallback + embeddings upgrade

### Phase D — Storyline hierarchy (big thread → storylines)

Turn today's flat, single-entity thread into a **two-level model**: a **big
thread** (umbrella, anchored on a recurring entity like *Anthropic*, `parent_thread_id
= null`) that branches into **storylines** — child threads (`parent_thread_id →
big thread`) each anchored on a *secondary facet* entity (*Fable*, *IPO*,
*Contracts*). Storylines **are threads**, so `thread_items` + `parent_thread_id`
(0009, live) carry the whole model — no new tables.

Linking is **per-storyline and many-to-many**: an item links to a storyline when
it carries the big anchor **and** that storyline's facet. `{anthropic, fable, ipo}`
→ Fable **and** IPO; `{anthropic, fable}` → only Fable. This relaxes today's
"one item → at most one thread" ([matchByAnchor]) to multi-link at the child level.
A thread only **promotes** (splits) once ≥2 recurring facets emerge under it;
below that it stays a single flat storyline, so today's behaviour is preserved.

Decisions (Siem, 1 Jul 2026): **hybrid** split (free secondary-entity clustering
forms storylines, the generate call names them); daily-paper krant redesign is
**parked** — Phase D only makes the hierarchy visible in the archive. Facet floor
is **low** (storylines appear fast); auto-archive/delete of stale storylines is a
**later** concern. Ship a **rebuild script** (dry-run + `--apply`) to re-derive
storylines from history.

- [x] **Phase D1** — Foundation: pure `storylineFacets` / `matchStorylines` /
  `shouldPromote` + 8 vitest cases (188 → 196). No pipeline wiring, no migration
  (reuse `parent_thread_id`). Gate green. *(done)*
- [x] **Phase D2** — Pipeline: `threadsStep` promotes big threads, spawns
  storyline children, **multi-links** items to their facets (general-bucket
  fallback on the umbrella). `THREADS_FACET_MIN_ITEMS`=2 / `THREADS_PROMOTE_MIN_FACETS`=2
  knobs. **Suppress rule:** a facet that is itself a big anchor stays a sibling
  umbrella (no circular nesting) — Siem's actor-model. `Libanon→Lebanon` alias.
  `scripts/split-storylines.ts` (dry-run + `--apply`, additive). Applied live: 9
  umbrellas → 24 storylines, 48 items moved. Gate green (197 tests). *(done)*
  **Known gap → entity typing (next):** recurring *products* that independently
  threaded (Mythos) get suppressed as siblings; product-version forms still
  fragment (Fable vs Claude Fable 5). Fix = tag entities actor/product/event in
  the scan so umbrellas=actors, storylines=product/event facets.
- [ ] **Phase D3** — Generation (hybrid): updates run **per storyline**; generate
  names each storyline; big thread aggregates its storylines' state.
- [ ] **Phase D4** — ~~Archive/detail UI stub~~ **superseded by Phase E** (the
  full visualization pass below). Skip D4; do D3 then E.

### Phase E — Visualization UX/UI (umbrella hub-and-spoke graph)

The read-side, done properly. Confirmed with Siem (1 Jul 2026) via the approved
mockup `umbrella_thread_multiline_bell_follow_mockup`:

- **Each storyline (child)** keeps its **own** graph — the existing Phase C
  detail page (`StoryDetailView`: timeline scrubber + intensity). Unchanged.
- **The umbrella (big thread)** gets one **big multi-line timeline chart**: x-axis
  = time (the anchor window), **one line per storyline**, y = daily activity
  (items/day). Line **color = dominant category / DESTEP lens** (reuse
  `dominantLens`), **live lines drawn thicker with a pulse on the latest point**
  (reuse `recencyTier`), the **"Algemeen"** general-bucket line dashed/neutral.
  Clicking a line routes to that storyline's own page. (NOT hub-and-spoke — the
  first mockup was wrong; Siem wants the timeline-as-lines chart, the same
  "one big multi-line chart" idea from the old 5c-3 note, applied per umbrella.)
- **Umbrella page** = a **hero** (aggregated state + meta + follow) above the chart;
  a **left-side legend** maps each line → storyline (lens + item total + live).
- **Two follow granularities** (appearing in the archive ≠ followed; follow drives
  "Mijn verhalen" + daily-paper priority): the hero's **"Volg heel verhaal"** follows
  the umbrella + all its storylines incl. future ones (broad); a **★ per legend row**
  follows just that one storyline (narrow). Both write `follow_marks` type `thread`
  (umbrella id vs storyline id) — no new schema. Follow affordance = a **bell**
  (filled accent = followed, outline = not), not a star. Open question for D3/E: should an
  umbrella follow *imply* its children in "Mijn verhalen", or stay a distinct mark?
- **`/archive`** restructures to list **big threads (umbrellas)**; storylines are
  reached through the umbrella chart rather than as top-level flat cards.

Routing: `/archive/[threadId]` branches — a thread **with children** renders the
umbrella page (hero + `UmbrellaChart`); a **leaf** thread renders the existing
`StoryDetailView`. No schema change (parent/child + `thread_items` already carry it).

- [ ] **Phase E1** — Data + pure helpers: `getUmbrella(profileId, threadId)`
  (umbrella + per-child daily activity series over the window, dominant lens,
  recency, item totals + the Algemeen bucket). Pure, tested helpers:
  `dailyActivitySeries(events, window)`, time→x / activity→y scales, lens→color,
  recency→line-weight. No UI yet.
- [ ] **Phase E2** — UI: `UmbrellaChart.tsx` (client SVG multi-line timeline,
  clickable lines → `router.push`, legend) + `UmbrellaHero`;
  `/archive/[threadId]` branch; `/archive` list restructured to umbrellas.
  Verify on localhost:3000.

Depends on **D3** for the hero's aggregated state (start with a simple
concatenation/fallback; D3 enriches it). Mockup reference:
`umbrella_thread_hub_and_spoke_mockup` (this session).

Gate after every phase: `npm run lint && npx tsc --noEmit && npm test && npm run build`.
Hard budget cap **€0.10/edition** (aim lower). Until Phase 3 the running pipeline
behaves exactly as today.

---

## Context

Today every edition is independent: items are scanned, selected, summarized, and a
neutral "rode draad" synthesis is written from scratch. Siem wants the opposite —
**news that builds forth on itself**, like he is curating his own news threads. A
story he follows (e.g. the SpaceX IPO) should be a *persistent storyline* that
accumulates state across days; each morning the pipeline finds what's genuinely new,
attaches it to the right thread, and writes an **update that builds on yesterday's
state** instead of a fresh article. This is the concrete realization of the design
doc's "cross-reference axis B" and reuses the slot reserved by `modules/sol`.

The Daily Paper becomes thread-aware: **Summary** (also the front-page DP block) +
**Introduction** + **body** = one deep article per *followed* topic (a thread update,
researched via the relevant DESTEP lenses only, primed by the reader's rated archive,
tied to stock impact) plus **one broad-but-shallow "general" article**. Images are
reused from source articles. The cap is funded by reclaiming broad-scan cost — once
must-have threads are guaranteed, the firehose scan can be tightened and the savings
spent on deeper research.

Verified current-code facts that shape this plan:
- `budgetMode(spent, ceiling=config…)` already takes an explicit ceiling.
- `extractImage` (`modules/shared/feeds.ts`) + `ingestSource` already populate `items.image_url`, and `VerhaalKaart` already renders it → image work is a small og:image fallback, not a build-out.
- `scanBatch` (`modules/rank/index.ts`) already does one structured LLM call per batch with a strict schema → entity extraction piggybacks it at ~no extra cost.
- Step ordering is by array index in `planStep`; `claim_next_step` enforces strict position ordering → inserting a step renumbers the rest automatically.

---

## Phase 0 — Budget cap + scan reclaim ✅ DONE

- `modules/shared/config.ts`: `budget.editionCeilingEur` `0.30 → 0.10` (env `BUDGET_EDITION_EUR`); `scan.maxRounds` `7 → 4` (40×4 = 160 items ≈ €0.03). `batchSize`/`candidatePool` stay env-overridable.
- `modules/shared/budget.test.ts`: already passes explicit ceilings → untouched, still green.

## Phase 1 — Schema + pure `modules/threads` ✅ DONE

- `supabase/migrations/0008_threads.sql` (**applied** to live Supabase `iqhyndhrlhjfdrwjvmjv`):
  - `threads`: `id`, `profile_id → profiles cascade`, `topic_id → topics set null`, `category_id → categories set null`, `title text not null`, `state text`, `entities text[] default '{}'`, `status check (active|dormant|closed) default 'active'`, `last_edition_id → editions set null`, `last_seen_at`, `created_at`. Indexes `(profile_id, status)`, `(topic_id)`.
  - `thread_items`: `id`, `thread_id → threads cascade`, `item_id → items cascade`, `edition_id → editions set null`, `created_at`, **`unique (thread_id, item_id)`**. Indexes `(thread_id)`, `(edition_id)`.
  - RLS enabled, no policies (matches 0003).
- `modules/shared/types.ts`: `Thread`, `ThreadItem`, `ThreadStatus`, `DestepLens`, `DailyPaperArticle`; `FrontPage` gains `dp_summary?`, `dp_intro?`, `dp_articles?`.
- `modules/threads/index.ts` (pure): `normalizeEntity`, `entityOverlap`, `matchThread`, `computeDelta`, `mergeEntities`, `selectLenses`, `orderThreads`.
- `modules/threads/threads.test.ts`: 22 tests, all green.

## Phase 2 — Entity extraction piggybacked on the scan call

Every scanned item gets `entities[]` from the *existing* `scanBatch` call. No new call.

- `modules/rank/index.ts`: add `entities: string[]` to `SCAN_SCHEMA` (per-item + `required`); add one Dutch sentence to the scan system prompt asking for 2–5 key entities (people/orgs/companies/places/products); extend `ScanVerdict`/`ScanUitslag` with `entities`; normalize via `normalizeEntity` (from `modules/threads`) + dedupe in the result map. Bump scan `maxTokens` 3000 → 3500 only if truncation appears.
- `modules/pipeline/steps.ts` (`scanRankStep`): merge into `scan_meta` like `regio`: `scan_meta: { ...existingMeta.get(itemId), regio, entities }`.
- **Idempotency:** step already only scans `importance is null`; merge preserves `media`/`regio`; same single LLM call → ~7s held.
- **Verify:** local run → `select scan_meta->'entities' from items where importance is not null` non-empty; gate green. No UI change.

## Phase 3 — `threads` step: match + link + state-merge (no AI)

- `modules/pipeline/steps.ts`: register `threads: threadsStep`; insert `{ kind: "threads", payload: {} }` in `planStep` **after `select`, before `generate`**.
- `threadsStep` (thin; DB helpers `loadActiveThreads`/`linkThreadItems`/`upsertThread` in `modules/threads/index.ts`, same pure/DB split as `modules/rank`):
  1. Load edition's `edition_items ⋈ items` (id, title, topic_id, category_id, `scan_meta.entities`, image_url).
  2. Load profile threads `status != 'closed'`.
  3. Per item: `matchThread(...)` → link; no match **and** deep/followed band → open a new thread; no match + not followed → leave as plain item.
  4. `thread_items` upsert `{ onConflict: "thread_id,item_id", ignoreDuplicates: true }`.
  5. Touched threads: `mergeEntities`, set `last_edition_id`, `last_seen_at`, `status='active'`.
- **Idempotency (critical):** at step start, load `thread_items` for this `edition_id` and skip already-linked items → pure function of (items, threads, links). `unique` + `ignoreDuplicates` + set-union merge all re-run-safe. No AI → <7s.
- **Verify:** run an edition twice → `thread_items` count identical; two consecutive days with overlapping entities → day 2 links to day 1's thread.

## Phase 4 — Thread-aware generation + DESTEP research

- `modules/generate/index.ts`: add (don't replace `deepDive`) `generateThreadUpdate(input, editionId, stepId): Promise<ThreadUpdate|null>` — `deep` tier via `askAIJson`, gated by `budgetPolicy[mode]` like `deepDive`. Input `{thread:{title,state,topic_id}, delta, newItems, lenses, archivePrimer, mode}`; returns `{headline, body, newState, lenses}`. Dutch prompt: "Stand van het verhaal tot nu toe: {state}. Wat er vandaag bij komt: {delta}. Schrijf een UPDATE die hierop voortbouwt — niet opnieuw vanaf nul. Gebruik alleen deze lenzen: {lenses}. Koppel aan beurs-/marktimpact waar relevant. Lezer-perspectief: {archivePrimer}. Geef ook de bijgewerkte verhaal-stand terug."
- `modules/archive/index.ts`: add `archivePrimer(profileId, topicId, categoryId, limit=5): Promise<string[]>` — titles of items rated ≥4 in `feedback_events ⋈ items`. One query, no AI.
- `modules/pipeline/steps.ts` (`generateStep`): for deep-band items linked to a thread, compute `computeDelta`/`selectLenses`/`archivePrimer`, call `generateThreadUpdate` instead of `deepDive`. Write `edition_items.summary_text = body`; write back `threads.state = newState`, `threads.title = headline`. Non-thread deep items keep `deepDive`. One update per requeue (existing `requeue(step, 40)`).
- **Idempotency (critical):** the existing `!entry.summary_text` filter gates generation → state advances ≤ once/edition. Delta builds on *stored* state → prompts stay short over time, holding the €0.10 cap.
- **Verify:** `selectLenses` unit test (done); day-1 (thread opens, state set) → day-2 (body references prior context, state rewritten once); re-run day-2 → state unchanged; `edition_cost_eur` < €0.10.

## Phase 5 — Daily Paper assembly + UI

- `modules/redactie/index.ts`: extend `writeDailyDigest` to return structured `{summary, intro, generalArticle}` (one `deep` call). Per-followed-topic articles are the Phase-4 thread updates, **reused** — this call writes only the day **summary** (= front-page DP block), the **intro**, and the **one broad-but-shallow general roundup**. `orderThreads` decides body order.
- `modules/pipeline/steps.ts` (`dailyPaperStep`): load edition's thread updates (deep items ⋈ threads: headline/body/image_url/lenses); call new `writeDailyDigest`; return `{ dp_summary, dp_intro, dp_articles, daily_paper }` (keep `daily_paper` + `intro` for back-compat / `BriefingHero`).
- `modules/pipeline/steps.ts` (`finalizeStep`): write `dp_summary`/`dp_intro`/`dp_articles` into `front_page`; article images = linked item `image_url`.
- `app/components/EditieWeergave.tsx`: replace the single "De rode draad" block with **Summary → Introduction → body** (`dp_articles` as full articles: headline, body split on `\n\n`, image, DESTEP-lens tag; followed first, general last). Fall back to old `daily_paper` prose when `dp_articles` absent.
- `app/components/EditionView.tsx`: front-page DP block shows `frontPage.dp_summary` (fallback `intro`).
- **Verify:** extend `redactie.test.ts` (`orderThreads`); `/editie/[datum]/krant` shows the three parts; front page shows `dp_summary`; old editions fall back; `edition_cost_eur` < €0.10.

## Phase 6 — Optional polish (independent, behind flags)

- **og:image fallback:** pure `extractOgImage(html)` + bounded, config-flagged fetch in `ingestSource` for imageless items (capped per feed). Reuses `items.image_url` — no migration. Unit-test the parser.
- **Embeddings upgrade:** swap only the body of `matchThread` for vector similarity (keep its signature); add a vectors column/table; matching stays a pure decision over precomputed vectors. Defer until entity-overlap proves insufficient.

---

## Idempotency invariants to hold throughout

1. `scan_meta` **merges**, never overwrites (entities join `regio`/`media`).
2. `thread_items` `unique(thread_id,item_id)` + `ignoreDuplicates` → never double-link/double-count.
3. Thread state writeback gated by the existing `edition_items.summary_text is null` flag → state advances ≤ once/edition.
4. `finalize` reads latest-done step + overwrites `front_page` wholesale → already re-run-safe.
5. Every new AI touch is one work-unit per requeue → ~7s tick contract preserved.

## Critical files

- `modules/pipeline/steps.ts` — new `threads` step + `planStep` slot; thread-aware `generateStep`, `dailyPaperStep`, `finalizeStep`.
- `modules/threads/index.ts` + `modules/threads/threads.test.ts` — pure matching/delta/lens/order + (Phase 3) DB helpers.
- `supabase/migrations/0008_threads.sql` — `threads` + `thread_items` (applied).
- `modules/rank/index.ts` — `entities[]` on `SCAN_SCHEMA` + `scanBatch`.
- `modules/generate/index.ts` — `generateThreadUpdate`. `modules/archive/index.ts` — `archivePrimer`.
- `modules/redactie/index.ts` — structured `writeDailyDigest`.
- `modules/shared/config.ts`, `modules/shared/types.ts`.
- `app/components/EditieWeergave.tsx` + `app/components/EditionView.tsx`.
