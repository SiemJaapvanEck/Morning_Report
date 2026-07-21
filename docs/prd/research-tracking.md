# PRD — Research tracking (upload your own research → a followed, auto-updating storyline)

> **Status:** approved (2026-07-21) · **Owner:** Siem · **Linear:** Morning Report project · "Research ·" sprint milestones
> **Linear issues:** P1 MOR-10 · P2 MOR-11 · P3 MOR-12 · P4 MOR-13 · P5 MOR-14
> A PRD is approved only when no open question could stall an autonomous
> session. Approved PRDs are the autonomy boundary.

## 1. Goal

Let Siem paste/write his own research on a topic (e.g. bamboo investment
opportunities) and have the Morning Report **keep it up to date**: the research
becomes a **followed storyline** that the existing pipeline matches each day's
news to and writes "what's new since your research" updates for — auto-linked to
related articles by entity/topic overlap. Managed from a **Settings → "Mijn
onderzoek"** tab (built as an embeddable component so PRD #3's tabbed settings
just mounts it), with the updates surfaced in the krant/archive like any other
followed storyline.

This **rides on machinery that already ships** — `threads` / `thread_items` /
`follow_marks`, `threadsStep` entity-overlap matching, and
`generateThreadUpdate` — so most of the work is *wiring a user document into the
threads engine*, not building new machinery.

"Done" end-to-end: Siem writes a research note → the app extracts its
entities/topic (one `askAI` call) → seeds a followed thread anchored on those
entities → each morning the pipeline attaches fresh matching news and writes an
update building on the research → Siem reads it in the report and manages his
research list in settings.

## 2. Non-goals

- **No file or URL upload in V1.** Paste/write text only. PDF/DOCX/Markdown
  file upload and "track a URL" are a **parked follow-up task** (parsers are
  format-specific; a URL ≠ a body of research).
- **No new update engine.** Updates reuse `threadsStep` matching +
  `generateThreadUpdate`; no separate summarizer.
- **No web-search re-research in V1.** Tavily-grounded proactive re-research is
  out of scope here (it's gated on `TAVILY_API_KEY` and belongs to the
  deep-research track).
- **No sharing/export.** Research is private (per-profile, RLS), never in the
  shareable report payload beyond Siem's own followed storylines.
- **No manual article-pinning in V1** (auto-match only; manual attach is a
  possible later task).

## 3. Verification reality

- **Gate-checkable (auto-ok):** the migration **file**, types, and the pure
  extraction helpers (prompt builder + parser for entities/topic/category) with
  vitest; lint/tsc/build.
- **Needs Siem (live):** applying migration `0020`; the on-submit `askAI`
  extraction actually running; thread seeding + `follow_marks` writes; the
  pipeline matching news to a research thread across a real edition; and visual
  review of the management component + the report surfacing. Phases needing a
  live DB, a live `askAI` call, or visual sign-off are **needs-siem**.
- Agents author the migration **file** only — **Siem applies `0020`**.

## 4. Phases (one phase = one Linear issue = one session)

### Phase 1 — Foundation: `user_research` schema + types
- **Goal:** the data model linking a research note to its followed thread.
- **Acceptance criteria:**
  - `supabase/migrations/0020_user_research.sql` (format per `0018`): table
    `user_research` with `id`, `profile_id uuid not null references profiles(id)
    on delete cascade`, `title text not null`, `body text not null`,
    `entities text[] not null default '{}'` (extracted), `category_id uuid
    references categories(id) on delete set null`, `thread_id uuid references
    threads(id) on delete set null` (the seeded storyline),
    `status text not null default 'nieuw' check (status in ('nieuw','gevolgd','gearchiveerd'))`,
    `created_at timestamptz not null default now()`;
    `alter table public.user_research enable row level security;` (no policy).
  - `UserResearch` interface in `modules/shared/types.ts`.
  - Gate green. **No change to the `threads` schema** (research↔thread link
    lives on `user_research.thread_id`).
- **Files/areas:** `supabase/migrations/0020_user_research.sql`,
  `modules/shared/types.ts`.
- **Locked decisions:** the research↔thread relationship is stored **only** on
  `user_research.thread_id` (a research thread is detected by this link) — no
  new column on `threads`. Status vocab Dutch: `nieuw`/`gevolgd`/`gearchiveerd`.
- **Depends on:** —
- **Label:** auto-ok · *(Siem applies `0020`.)*

### Phase 2 — Extraction core (pure) + thin `askAI` wrapper
- **Goal:** turn research text into anchor entities + topic + category, purely
  and testably.
- **Acceptance criteria:**
  - `modules/research/index.ts` (pure): `buildExtractionPrompt(title, body)` and
    `parseExtraction(raw)` → `{ entities: string[], topicLabel: string,
    categorySlug: string | null }`, normalizing entities via
    `normalizeEntity` from `modules/threads` and capping at 8.
  - `extractResearch(title, body)` — one `askAI` call, **`scan` tier** (cheap),
    logged to `usage_log` like every other AI call; never throws (degrades to
    empty extraction) following the `modules/tavily` defensive pattern.
  - Vitest covers the prompt builder + parser (well-formed, empty, entity
    dedupe/cap, missing category). Gate green.
- **Files/areas:** `modules/research/index.ts` (+ `research.test.ts`),
  `modules/shared/types.ts`.
- **Locked decisions:** extraction runs **on submit** (not in the daily
  pipeline), one `askAI` `scan`-tier call per research note; it reuses the
  entity vocabulary/normalization of `modules/threads` so the seeded thread
  matches news the same way pipeline threads do.
- **Depends on:** Phase 1
- **Label:** auto-ok

### Phase 3 — Seed & track: research → followed thread, auto-updated
- **Goal:** creating a research note spawns a followed thread that the existing
  pipeline matches news to and updates daily.
- **Acceptance criteria:**
  - On research create, a thread is opened anchored on the primary extracted
    entity (`anchor_entity`), `title` = research title, `entities` = extracted,
    `status='active'`; `user_research.thread_id` set; a `follow_marks` row
    (`target_type='thread'`, `active=true`) added so it counts as followed.
  - The seeded thread participates in the **existing** `threadsStep` matching
    (entity overlap) and `generateStep`/`generateThreadUpdate` with **no new
    matching code** — verified across a live edition (research about a topic in
    the day's news gets a linked item + an update).
  - `generateThreadUpdate` framing extended so a research-origin thread's first
    update reads as *"sinds jouw onderzoek"* (pure framing helper, unit-tested;
    detected via `user_research.thread_id`).
  - Gate green (pure framing tested; wiring live-verified by Siem).
- **Files/areas:** `modules/research/index.ts`, `app/api/research/route.ts`
  (create path), `modules/generate/index.ts` (framing), `modules/pipeline/steps.ts`
  (only if a hook is needed — prefer reusing existing steps).
- **Locked decisions:** reuse the threads engine wholesale (no parallel matcher);
  a research thread is a normal followed thread + the `user_research` link;
  seeding happens synchronously in the create API (extraction from Phase 2 +
  thread insert + follow), so the storyline exists immediately and fills in on
  the next pipeline run.
- **Depends on:** Phase 2
- **Label:** needs-siem *(live askAI + DB writes + a pipeline run)*

### Phase 4 — "Mijn onderzoek" management component + API
- **Goal:** an embeddable panel to add, list, and archive research — mountable
  now and by the future Settings tab (PRD #3).
- **Acceptance criteria:**
  - `app/api/research/route.ts`: POST (create → triggers Phase-3 seeding),
    GET (list for profile), DELETE/PATCH (archive) — all cookie-gated (401).
  - `getResearch(profileId)` in `app/lib/queries.ts` returning each note + its
    thread's status/last-update.
  - `app/components/MijnOnderzoek.tsx` — a **self-contained** client component
    (add form via the `CaptureFormulier.tsx` pattern + a list with status +
    a link to each note's storyline). It takes its data as props / calls the
    API, so it can be dropped into any page or the Settings tab unchanged.
  - Mounted at a temporary route (e.g. a section on `/instellingen`) until the
    tabbed Settings page (PRD #3) hosts it. Gate green.
- **Files/areas:** `app/api/research/route.ts`, `app/lib/queries.ts`,
  `app/components/MijnOnderzoek.tsx`, a temporary mount in `app/instellingen`.
- **Locked decisions:** the component is the **integration seam** with PRD #3 —
  built standalone with no page-specific assumptions; Dutch UI copy;
  archive (not hard-delete) keeps the storyline history intact.
- **Depends on:** Phase 1 (schema); parallelizable with Phase 3.
- **Label:** needs-siem

### Phase 5 — Surface research storylines in the report/archive
- **Goal:** research-origin storylines are recognisable and reachable from the
  reading surfaces.
- **Acceptance criteria:**
  - Research-seeded followed storylines render in the archive/krant with an
    origin label **"Uit jouw onderzoek"** (detected via the `user_research`
    link; no `threads` schema change).
  - The `MijnOnderzoek` list links each note to its storyline detail page; the
    storyline page links back to the source research note.
  - Empty/absent-data states hidden gracefully (pattern of `CijfersCard`).
  - Gate green.
- **Files/areas:** `app/lib/queries.ts` (origin flag on the story view),
  `app/components/*` (archive/krant story rendering), `app/components/MijnOnderzoek.tsx`.
- **Locked decisions:** origin shown as a label/chip only — research storylines
  otherwise use the existing thread/umbrella rendering unchanged.
- **Depends on:** Phase 3
- **Label:** needs-siem

## 5. Risks & rails

- **Extraction quality:** a bad entity extraction seeds a thread that matches
  nothing (or the wrong news). Rail: cap 8 entities, reuse `normalizeEntity`,
  show the extracted entities in `MijnOnderzoek` so Siem can see/curate; a
  research note with no matches simply shows no updates yet (no error).
- **AI cost:** one `scan`-tier `askAI` per research note on submit — logged to
  `usage_log`, trivial and outside the daily edition budget (not in the pipeline
  loop). No per-edition cost added (matching/updates reuse the existing budgeted
  thread path).
- **Privacy:** research + its thread are per-profile, RLS-enabled (no policies),
  never emitted outside the profile's own followed storylines.
- **Merge-readiness (Siem's directive):** every phase is a Linear task under the
  Research Tracking project; the `MijnOnderzoek` component and the finance
  surfaces are built standalone so PRD #3's Settings tabs mount them without
  rework.
- **Migration discipline:** one file `0020`, applied by Siem; `types.ts` in sync.

## 6. Decision log

- **2026-07-21 — PRD drafted with Siem.** Locked: (1) **paste/write** text input
  in V1 (file/URL upload parked as a follow-up task); (2) "kept up to date" =
  a **followed storyline with daily updates via the existing threads engine**
  (no new update engine, no web-search re-research in V1); (3) **auto-match** to
  news by extracted entities/topic (no manual pinning in V1); (4) managed in a
  **Settings "Mijn onderzoek" tab**, built as an **embeddable component** (the
  PRD #3 seam) with updates surfaced in the krant/archive; (5) research↔thread
  link stored only on `user_research.thread_id` — **no `threads` schema change**;
  (6) extraction = **one `askAI` `scan`-tier call on submit**, logged to
  `usage_log`. Per Siem: every phase is a Linear task under the project so the
  finished PRD-plans merge together cleanly.
