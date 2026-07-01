// Leesqueries voor de UI. De app-laag leest; alle schrijfwerk loopt via
// modules/ en de API-routes.

import { db, unwrap } from "@/modules/shared/db";
import { todayLocal } from "@/modules/shared/config";
import { entityOverlap, normalizeEntity, aggregateUmbrellaState } from "@/modules/threads";
import {
  updatedAgo,
  recencyTier,
  rankRelated,
  dailyActivitySeries,
  threadSubject,
  titleCaseEntity,
  type Recency,
} from "@/app/lib/stories";
import type {
  CalendarEventCertainty,
  CalendarEventKind,
  DeepArticle,
  Edition,
  EditionSection,
  EditionStatus,
  FrontPage,
  Profile,
  ThreadPrediction,
  ThreadStatus,
  WeatherSnapshot,
} from "@/modules/shared/types";

export interface EditionView {
  edition: Edition;
  sections: SectionView[];
  /** category_ids the reader actively follows — the krant leads with these */
  followedCategoryIds: string[];
}

/** The storyline a deep article belongs to: thread + which installment this is. */
export interface StorylineRef {
  thread_id: string;
  title: string;
  /** "deel N": how many editions this storyline has appeared in, up to this one */
  part: number;
}

export interface SectionView {
  section: EditionSection;
  weather: WeatherSnapshot | null;
  items: {
    id: string;
    item_id: string;
    band: "deep" | "summary" | "headline";
    summary_text: string | null;
    /** structured two-layer deep article (lead + ripples) for deep items, else null */
    article: DeepArticle | null;
    sol_note: string | null;
    match_score: number | null;
    title: string;
    url: string | null;
    image_url: string | null;
    source_name: string | null;
    regio: string | null;
    /** the ongoing storyline this deep article updates, or null */
    storyline: StorylineRef | null;
    /** the storyline's current source-grounded forecast, or null */
    prediction: ThreadPrediction | null;
  }[];
}

export async function getProfiles(): Promise<Profile[]> {
  return unwrap(await db().from("profiles").select("*").order("created_at"));
}

export async function getEdition(profileId: string, date: string): Promise<EditionView | null> {
  const editionResult = await db()
    .from("editions")
    .select("*")
    .eq("profile_id", profileId)
    .eq("date", date)
    .maybeSingle();
  if (!editionResult.data) return null;
  const edition = editionResult.data as Edition;

  const sections = unwrap(
    await db()
      .from("edition_sections")
      .select("*")
      .eq("edition_id", edition.id)
      .order("position"),
  ) as EditionSection[];

  const rows = unwrap(
    await db()
      .from("edition_items")
      .select(
        "id, item_id, section_id, band, position, summary_text, article, sol_note, match_score, items(title, url, image_url, scan_meta, sources(name))",
      )
      .eq("edition_id", edition.id)
      .order("position"),
  ) as unknown as {
    id: string;
    item_id: string;
    section_id: string | null;
    band: "deep" | "summary" | "headline";
    summary_text: string | null;
    article: DeepArticle | null;
    sol_note: string | null;
    match_score: number | null;
    items: {
      title: string;
      url: string | null;
      image_url: string | null;
      scan_meta: { regio?: string | null } | null;
      sources: { name: string } | null;
    };
  }[];

  // Phase B: attach the storyline (thread + "deel N") and its forecast to the
  // deep articles. All of it is already persisted — thread_items links items to
  // threads, threads carry title + prediction. Older editions with no thread
  // links simply get null storyline/prediction (graceful fallback).
  const deepItemIds = rows.filter((r) => r.band === "deep").map((r) => r.item_id);
  const storylineByItem = new Map<string, StorylineRef>();
  const predictionByItem = new Map<string, ThreadPrediction>();
  if (deepItemIds.length > 0) {
    const links = unwrap(
      await db().from("thread_items").select("thread_id, item_id").in("item_id", deepItemIds),
    ) as { thread_id: string; item_id: string }[];
    const threadIds = [...new Set(links.map((l) => l.thread_id))];
    if (threadIds.length > 0) {
      const threads = unwrap(
        await db().from("threads").select("id, title, prediction").in("id", threadIds),
      ) as { id: string; title: string; prediction: ThreadPrediction | null }[];
      const threadById = new Map(threads.map((t) => [t.id, t]));

      // "deel N": distinct editions (on or before today's date) this thread has
      // appeared in. One pass over the thread's items joined to their editions.
      const partLinks = unwrap(
        await db().from("thread_items").select("thread_id, edition_id").in("thread_id", threadIds),
      ) as { thread_id: string; edition_id: string | null }[];
      const editionIds = [...new Set(partLinks.map((l) => l.edition_id).filter(Boolean))] as string[];
      const editionDates = editionIds.length
        ? ((unwrap(
            await db().from("editions").select("id, date").in("id", editionIds),
          ) as { id: string; date: string }[]).reduce((m, e) => m.set(e.id, e.date), new Map<string, string>()))
        : new Map<string, string>();
      const partByThread = new Map<string, number>();
      for (const tid of threadIds) {
        const eds = new Set(
          partLinks
            .filter((l) => l.thread_id === tid && l.edition_id && (editionDates.get(l.edition_id) ?? "") <= date)
            .map((l) => l.edition_id as string),
        );
        partByThread.set(tid, Math.max(1, eds.size));
      }

      // A deep item can match several threads; pick the most-established storyline
      // (highest "deel N", tie-broken by id) so the label is deterministic.
      const candidatesByItem = new Map<string, string[]>();
      for (const link of links) {
        const arr = candidatesByItem.get(link.item_id) ?? [];
        arr.push(link.thread_id);
        candidatesByItem.set(link.item_id, arr);
      }
      for (const [itemId, tids] of candidatesByItem) {
        const best = tids
          .filter((id) => threadById.has(id))
          .sort((a, b) => (partByThread.get(b) ?? 1) - (partByThread.get(a) ?? 1) || a.localeCompare(b))[0];
        if (!best) continue;
        const thread = threadById.get(best)!;
        storylineByItem.set(itemId, {
          thread_id: thread.id,
          title: thread.title,
          part: partByThread.get(thread.id) ?? 1,
        });
        if (thread.prediction) predictionByItem.set(itemId, thread.prediction);
      }
    }
  }

  const followMarks = unwrap(
    await db()
      .from("follow_marks")
      .select("target_id")
      .eq("profile_id", profileId)
      .eq("target_type", "category")
      .eq("active", true),
  ) as { target_id: string }[];
  const followedCategoryIds = followMarks.map((m) => m.target_id);

  const sectionViews: SectionView[] = sections.map((section) => ({
    section,
    weather: section.kind === "weather" ? (section.payload as unknown as WeatherSnapshot) : null,
    items: rows
      .filter((row) => row.section_id === section.id)
      .map((row) => ({
        id: row.id,
        item_id: row.item_id,
        band: row.band,
        summary_text: row.summary_text,
        article: row.article,
        sol_note: row.sol_note,
        match_score: row.match_score,
        title: row.items.title,
        url: row.items.url,
        image_url: row.items.image_url,
        source_name: row.items.sources?.name ?? null,
        regio: row.items.scan_meta?.regio ?? null,
        storyline: storylineByItem.get(row.item_id) ?? null,
        prediction: predictionByItem.get(row.item_id) ?? null,
      })),
  }));

  return { edition, sections: sectionViews, followedCategoryIds };
}

export async function listEditions(profileId: string, limit = 30): Promise<Edition[]> {
  return unwrap(
    await db()
      .from("editions")
      .select("*")
      .eq("profile_id", profileId)
      .order("date", { ascending: false })
      .limit(limit),
  );
}

/** Lichtgewicht editie-metadata voor de kalendernavigatie en de overzichten. */
export interface EditionSummary {
  date: string;
  status: EditionStatus;
  /** korte kop voor de kalendercel: beste top-item, anders de korte lead van de dag */
  headline: string | null;
}

/** Pure functie: leid een korte kop af uit de front_page van een editie. */
export function deriveHeadline(frontPage: FrontPage | null): string | null {
  if (!frontPage) return null;
  const top = frontPage.top_items?.[0]?.title;
  if (top) return top;
  const intro = frontPage.intro?.trim();
  if (intro) return intro.split(/(?<=[.!?])\s/)[0]; // eerste zin
  return null;
}

/**
 * Alle edities van een profiel als lichte samenvattingen (datum + status + kop).
 * Voedt de kalender-stippen, de vorige/volgende-sprong en de week/maand/jaar-
 * overzichten. Eén goedkope select (geen secties/items).
 */
export async function listEditionSummaries(profileId: string): Promise<EditionSummary[]> {
  const rows = unwrap(
    await db()
      .from("editions")
      .select("date, status, front_page")
      .eq("profile_id", profileId)
      .order("date", { ascending: false }),
  ) as { date: string; status: EditionStatus; front_page: FrontPage | null }[];

  return rows.map((row) => ({
    date: row.date,
    status: row.status,
    headline: deriveHeadline(row.front_page),
  }));
}

// ============================================================
// Story archive (Phase B): every anchor thread as one flat timeline row
// ============================================================

/** One anchor thread for the "Alle verhalen" list — a self-contained storyline. */
export interface Story {
  id: string;
  title: string;
  /** dominant category of the linked items — drives the colored dot */
  category: { slug: string; label: string } | null;
  /** every category the story's items span, most-frequent first — tags + filter */
  categories: { slug: string; label: string }[];
  /** how alive the story is (last-event age) — the recency filter axis */
  recency: Recency;
  status: ThreadStatus;
  /** ISO date of the earliest linked event; null when the thread has no items yet */
  firstDate: string | null;
  /** ISO date of the latest linked event */
  lastDate: string | null;
  /** number of linked items — the "M gebeurtenissen" count */
  eventCount: number;
  /** when the pipeline last touched the thread — drives "UPD … geleden" */
  lastSeenAt: string | null;
  /** precomputed compact age of lastSeenAt (e.g. "2u"), so the UI stays pure */
  updatedLabel: string;
  /** does the reader follow this storyline? — powers the "Mijn verhalen" filter */
  followed: boolean;
  /** this thread bundles child storylines — its row opens the umbrella page (Phase E) */
  isUmbrella: boolean;
  /** one dot per linked event, by date ascending — the row's mini timeline bar */
  events: { date: string }[];
}

/**
 * Display floor for the archive list: only stories that recurred across at least
 * this many linked events are listed. Keeps the page curated (cuts the one-day
 * singleton tail) without dropping the threads themselves — a thread climbs into
 * view once it accumulates enough events. Purely a presentation cut.
 */
export const MIN_STORY_EVENTS = 3;

/**
 * Run an `in (...)` lookup in batches so a long id list can't blow the PostgREST
 * URL-length limit (a busy profile has hundreds of linked items). Concatenates
 * the rows from each batch.
 */
async function fetchInChunks<T>(ids: string[], run: (batch: string[]) => Promise<T[]>, size = 150): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += size) out.push(...(await run(ids.slice(i, i + size))));
  return out;
}

/**
 * Every non-closed anchor thread with at least {@link MIN_STORY_EVENTS} events as a
 * self-contained story timeline. One row per thread: category, status, first/last
 * event date, event count, last-updated, and the event dots. The list page sorts
 * (latest / longest / most-active) and filters by category client-side; a row links
 * to its detail page (Phase C).
 */
export async function listStories(profileId: string): Promise<Story[]> {
  const threads = unwrap(
    await db()
      .from("threads")
      .select("id, title, status, anchor_entity, last_seen_at, parent_thread_id")
      .eq("profile_id", profileId)
      .neq("status", "closed"),
  ) as {
    id: string;
    title: string;
    status: ThreadStatus;
    anchor_entity: string | null;
    last_seen_at: string | null;
    parent_thread_id: string | null;
  }[];
  if (threads.length === 0) return [];

  // Storylines (children) are reached through their umbrella's page (Phase E), so
  // the top-level list shows umbrellas + flat threads only. A thread is an umbrella
  // when some other thread names it as parent.
  const parentIds = new Set(threads.map((t) => t.parent_thread_id).filter(Boolean) as string[]);

  // Which of these threads the reader actively follows (the "Mijn verhalen" axis).
  const followRows = unwrap(
    await db()
      .from("follow_marks")
      .select("target_id")
      .eq("profile_id", profileId)
      .eq("target_type", "thread")
      .eq("active", true),
  ) as { target_id: string }[];
  const followedThreads = new Set(followRows.map((f) => f.target_id));

  // Each linked item is an event; its edition's date places it on the timeline,
  // and its own category feeds the story's (multi-)category set.
  const threadIds = threads.map((t) => t.id);
  const links = await fetchInChunks(threadIds, async (batch) =>
    unwrap(
      await db().from("thread_items").select("thread_id, item_id, edition_id").in("thread_id", batch),
    ) as { thread_id: string; item_id: string; edition_id: string | null }[],
  );

  const editionIds = [...new Set(links.map((l) => l.edition_id).filter(Boolean))] as string[];
  const eds = editionIds.length
    ? (unwrap(await db().from("editions").select("id, date").in("id", editionIds)) as { id: string; date: string }[])
    : [];
  const dateByEdition = new Map(eds.map((e) => [e.id, e.date]));

  // Item → its category, so a story's categories come from where its items landed.
  const itemIds = [...new Set(links.map((l) => l.item_id))];
  const items = await fetchInChunks(itemIds, async (batch) =>
    unwrap(await db().from("items").select("id, category_id").in("id", batch)) as {
      id: string;
      category_id: string | null;
    }[],
  );
  const catByItem = new Map(items.map((i) => [i.id, i.category_id]));
  const categoryIds = [...new Set(items.map((i) => i.category_id).filter(Boolean))] as string[];
  const cats = categoryIds.length
    ? (unwrap(await db().from("categories").select("id, slug, name").in("id", categoryIds)) as {
        id: string;
        slug: string;
        name: string;
      }[])
    : [];
  const categoryById = new Map(cats.map((c) => [c.id, { slug: c.slug, label: c.name }]));

  const datesByThread = new Map<string, string[]>();
  const catCountByThread = new Map<string, Map<string, number>>();
  for (const l of links) {
    const date = l.edition_id ? dateByEdition.get(l.edition_id) : undefined;
    if (date) {
      const arr = datesByThread.get(l.thread_id) ?? [];
      arr.push(date);
      datesByThread.set(l.thread_id, arr);
    }
    const catId = catByItem.get(l.item_id);
    if (catId) {
      const m = catCountByThread.get(l.thread_id) ?? new Map<string, number>();
      m.set(catId, (m.get(catId) ?? 0) + 1);
      catCountByThread.set(l.thread_id, m);
    }
  }

  // Recency is measured against the newest event in the set, so "live" means
  // "moved in the most recent edition(s)" even if this snapshot is a few days old.
  const latestSeen = threads.reduce(
    (max, t) => (t.last_seen_at && Date.parse(t.last_seen_at) > max ? Date.parse(t.last_seen_at) : max),
    0,
  );

  // Children per umbrella, so an umbrella row can roll its storylines' events into
  // its own timeline/count/categories (its general bucket alone understates it).
  const childrenByParent = new Map<string, string[]>();
  for (const t of threads) {
    if (!t.parent_thread_id) continue;
    const arr = childrenByParent.get(t.parent_thread_id) ?? [];
    arr.push(t.id);
    childrenByParent.set(t.parent_thread_id, arr);
  }

  const now = Date.now();
  return threads
    // Only top-level rows: umbrellas + flat threads. Storylines open via the umbrella.
    .filter((t) => !t.parent_thread_id)
    .map((t) => {
      const isUmbrella = parentIds.has(t.id);
      const own = [t.id, ...(isUmbrella ? childrenByParent.get(t.id) ?? [] : [])];
      const dates = own.flatMap((id) => datesByThread.get(id) ?? []).sort((a, b) => a.localeCompare(b));
      // Categories present, most-frequent first; the leader drives the dot color.
      const catCount = new Map<string, number>();
      for (const id of own)
        for (const [cid, n] of catCountByThread.get(id) ?? new Map<string, number>())
          catCount.set(cid, (catCount.get(cid) ?? 0) + n);
      const ranked = [...catCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => categoryById.get(id))
        .filter((c): c is { slug: string; label: string } => Boolean(c));
      return {
        id: t.id,
        title: threadSubject(t.title, t.anchor_entity),
        category: ranked[0] ?? null,
        categories: ranked,
        recency: recencyTier(t.last_seen_at, latestSeen),
        status: t.status,
        firstDate: dates[0] ?? null,
        lastDate: dates.at(-1) ?? null,
        eventCount: dates.length,
        lastSeenAt: t.last_seen_at,
        updatedLabel: updatedAgo(t.last_seen_at, now),
        followed: followedThreads.has(t.id),
        isUmbrella,
        events: dates.map((date) => ({ date })),
      };
    })
    // The archive is the big-storyline index: only umbrellas (threads that bundle
    // child storylines) are listed. Flat single-entity threads are reached through
    // their edition, not here.
    .filter((s) => s.isUmbrella);
}

/** One event on a story's detail timeline: the source item + its deep article. */
export interface StoryEvent {
  date: string | null;
  /** the source item's headline */
  title: string;
  /** flat fallback text (the dashboard summary) — used when there is no article */
  body: string | null;
  /** structured two-layer deep article for this event, or null (older/non-deep) */
  article: DeepArticle | null;
  /** Sol's note for this event, when present */
  sol_note: string | null;
  source_name: string | null;
  url: string | null;
}

/** Another storyline related to this one, by shared entities or parent/child. */
export interface RelatedStory {
  id: string;
  title: string;
  status: ThreadStatus;
  category: { slug: string; label: string } | null;
  /** the entities both stories share — drives the "deelt: …" label */
  shared: string[];
}

/** A single story for the detail page (Phase C drill-in target). */
export interface StoryDetail {
  id: string;
  title: string;
  status: ThreadStatus;
  /** dominant category of the linked items — the dot color */
  category: { slug: string; label: string } | null;
  /** every category the items span, most-frequent first — display tags */
  categories: { slug: string; label: string }[];
  /** accumulated storyline prose the editions build on */
  state: string | null;
  /** the storyline's current source-grounded forecast, or null */
  prediction: ThreadPrediction | null;
  /** the thread's normalized entity set */
  entities: string[];
  /** does the reader follow this storyline? */
  followed: boolean;
  firstDate: string | null;
  lastDate: string | null;
  eventCount: number;
  /** the linked events, newest first */
  events: StoryEvent[];
  /** related storylines, strongest relation first */
  related: RelatedStory[];
  /** upcoming dated events on this storyline */
  agenda: AgendaEvent[];
  /** the underlying sources, with how many of the events each contributed */
  sources: { name: string; count: number }[];
}

/** One event inside a storyline — a dot on the strip + an "in deze verhaallijn" row. */
export interface StorylineEvent {
  date: string | null;
  title: string;
  source: string | null;
  url: string | null;
  /** this moment's deep article, shown in the panel when its dot is pressed */
  article: DeepArticle | null;
  solNote: string | null;
}

/** The right-panel reading content for one storyline (Phase E master–detail). */
export interface StorylineDetail {
  /** accumulated storyline prose the editions build on — the "Stand van zaken" */
  state: string | null;
  firstDate: string | null;
  lastDate: string | null;
  /** the latest event that carries a deep article — the reading body */
  article: DeepArticle | null;
  articleHeadline: string | null;
  articleDate: string | null;
  solNote: string | null;
  /** every event, newest first — the "in deze verhaallijn" list */
  events: StorylineEvent[];
  sources: { name: string; count: number }[];
}

/** One storyline inside an umbrella — a selectable block + its reading detail (Phase E). */
export interface UmbrellaLine {
  /** child thread id; the "Algemeen" general bucket carries the umbrella's own id */
  id: string;
  /** short eyebrow — the storyline's distinguishing facet (e.g. "Nasdaq 100") */
  facet: string;
  /** the storyline's latest headline (its generated title) */
  headline: string;
  /** the umbrella's own general-bucket block (dashed, neutral) */
  general: boolean;
  /** dominant category of this storyline's items — the block's accent color */
  category: { slug: string; label: string } | null;
  /** how alive the storyline is (last-event age) — drives the LIVE pill */
  recency: Recency;
  status: ThreadStatus;
  /** does the reader follow this storyline? (the block's follow bell) */
  followed: boolean;
  /** total linked items — the "N delen" count */
  itemCount: number;
  /** compact relative age of the last update, e.g. "2u" */
  updatedLabel: string;
  /** per-day item counts across the umbrella window — the block's event-dot strip */
  series: number[];
  /** the reading content shown in the left panel when this block is selected */
  detail: StorylineDetail;
}

/** An umbrella (big thread) view for the Phase E hub page: hero + storyline tiles. */
export interface UmbrellaView {
  id: string;
  title: string;
  /** short label for the hero/graph — anchor_entity over the generated title */
  label: string;
  status: ThreadStatus;
  /** dominant category across all lines — the hero dot */
  category: { slug: string; label: string } | null;
  /** compute-on-read rollup: umbrella general state + each storyline's state */
  state: string;
  /** does the reader follow the whole umbrella? (the hero's broad bell) */
  followed: boolean;
  /** inclusive chart window across the umbrella + all its storylines */
  windowStart: string | null;
  windowEnd: string | null;
  /** one line per storyline, plus the Algemeen general bucket when it has items */
  lines: UmbrellaLine[];
}

/**
 * An umbrella (big thread) by id, scoped to the profile (Phase E). Returns
 * `null` when the thread has no child storylines — the caller then falls back to
 * the leaf {@link getStoryDetail} + StoryDetailView. Otherwise: the umbrella meta
 * + the {@link aggregateUmbrellaState} rollup + one activity line per storyline
 * (and the umbrella's own general "Algemeen" bucket), all aligned to a shared
 * window, plus both follow tiers. Pure series math lives in
 * {@link dailyActivitySeries}; batched `in(...)` lookups via {@link fetchInChunks}.
 */
export async function getUmbrella(profileId: string, threadId: string): Promise<UmbrellaView | null> {
  const rows = unwrap(
    await db()
      .from("threads")
      .select("id, title, status, category_id, state, anchor_entity, entities, last_seen_at")
      .eq("profile_id", profileId)
      .eq("id", threadId)
      .limit(1),
  ) as {
    id: string;
    title: string;
    status: ThreadStatus;
    category_id: string | null;
    state: string | null;
    anchor_entity: string | null;
    entities: string[] | null;
    last_seen_at: string | null;
  }[];
  const umbrella = rows[0];
  if (!umbrella) return null;

  // Child storylines. No children ⇒ this is a leaf; signal the caller to fall back.
  const children = unwrap(
    await db()
      .from("threads")
      .select("id, title, status, category_id, state, anchor_entity, entities, last_seen_at")
      .eq("profile_id", profileId)
      .eq("parent_thread_id", threadId)
      .neq("status", "closed"),
  ) as typeof rows;
  if (children.length === 0) return null;

  // Every line = one thread (the umbrella's own general bucket + each child).
  const lineThreads = [umbrella, ...children];
  const threadIds = lineThreads.map((t) => t.id);

  const links = await fetchInChunks(threadIds, async (batch) =>
    unwrap(
      await db().from("thread_items").select("thread_id, item_id, edition_id").in("thread_id", batch),
    ) as { thread_id: string; item_id: string; edition_id: string | null }[],
  );

  const editionIds = [...new Set(links.map((l) => l.edition_id).filter(Boolean))] as string[];
  const eds = editionIds.length
    ? (unwrap(await db().from("editions").select("id, date").in("id", editionIds)) as { id: string; date: string }[])
    : [];
  const dateByEdition = new Map(eds.map((e) => [e.id, e.date]));

  const itemIds = [...new Set(links.map((l) => l.item_id))];
  const items = itemIds.length
    ? await fetchInChunks(itemIds, async (batch) =>
        unwrap(
          await db().from("items").select("id, title, url, category_id, sources(name)").in("id", batch),
        ) as unknown as {
          id: string;
          title: string;
          url: string | null;
          category_id: string | null;
          sources: { name: string } | null;
        }[],
      )
    : [];
  const itemById = new Map(items.map((i) => [i.id, i]));
  const catByItem = new Map(items.map((i) => [i.id, i.category_id]));

  // The deep article + Sol note live on the edition_item for that item in that
  // edition (an item can recur), so key by item:edition — same as getStoryDetail.
  const eis = itemIds.length
    ? await fetchInChunks(itemIds, async (batch) =>
        unwrap(
          await db()
            .from("edition_items")
            .select("item_id, edition_id, article, sol_note")
            .in("item_id", batch),
        ) as { item_id: string; edition_id: string | null; article: DeepArticle | null; sol_note: string | null }[],
      )
    : [];
  const eiByKey = new Map(eis.map((e) => [`${e.item_id}:${e.edition_id ?? ""}`, e]));

  const allCats = unwrap(await db().from("categories").select("id, slug, name")) as {
    id: string;
    slug: string;
    name: string;
  }[];
  const catById = new Map(allCats.map((c) => [c.id, { slug: c.slug, label: c.name }]));

  // Per-thread event dates, category tallies, and the full events (for the panel).
  const datesByThread = new Map<string, string[]>();
  const catCountByThread = new Map<string, Map<string, number>>();
  const overallCatCount = new Map<string, number>();
  const eventsByThread = new Map<string, (StorylineEvent & { article: DeepArticle | null; solNote: string | null })[]>();
  for (const l of links) {
    const date = l.edition_id ? dateByEdition.get(l.edition_id) : undefined;
    if (date) {
      const arr = datesByThread.get(l.thread_id) ?? [];
      arr.push(date);
      datesByThread.set(l.thread_id, arr);
    }
    const catId = catByItem.get(l.item_id);
    if (catId) {
      const m = catCountByThread.get(l.thread_id) ?? new Map<string, number>();
      m.set(catId, (m.get(catId) ?? 0) + 1);
      catCountByThread.set(l.thread_id, m);
      overallCatCount.set(catId, (overallCatCount.get(catId) ?? 0) + 1);
    }
    const item = itemById.get(l.item_id);
    const ei = eiByKey.get(`${l.item_id}:${l.edition_id ?? ""}`);
    const evs = eventsByThread.get(l.thread_id) ?? [];
    evs.push({
      date: date ?? null,
      title: item?.title ?? "Onbekend bericht",
      source: item?.sources?.name ?? null,
      url: item?.url ?? null,
      article: ei?.article ?? null,
      solNote: ei?.sol_note ?? null,
    });
    eventsByThread.set(l.thread_id, evs);
  }

  // Who the reader follows among these threads (the two bell tiers).
  const followRows = unwrap(
    await db()
      .from("follow_marks")
      .select("target_id")
      .eq("profile_id", profileId)
      .eq("target_type", "thread")
      .eq("active", true)
      .in("target_id", threadIds),
  ) as { target_id: string }[];
  const followed = new Set(followRows.map((f) => f.target_id));

  // Shared window across every line; recency measured against the newest event.
  const allDates = [...datesByThread.values()].flat().sort((a, b) => a.localeCompare(b));
  const windowStart = allDates[0] ?? null;
  const windowEnd = allDates.at(-1) ?? null;
  const latestSeen = lineThreads.reduce(
    (max, t) => (t.last_seen_at && Date.parse(t.last_seen_at) > max ? Date.parse(t.last_seen_at) : max),
    0,
  );

  const dominantCat = (m: Map<string, number> | undefined): { slug: string; label: string } | null => {
    if (!m) return null;
    const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? catById.get(top[0]) ?? null : null;
  };

  // A storyline's short facet = its first entity that isn't the umbrella's anchor
  // (e.g. under "spacex": "nasdaq 100", "cursor"). Title-cased for display; falls
  // back to the stored anchor, then the category label. This is the label the
  // generated headline can't give us (titles get overwritten with full headlines).
  const umbNorm = umbrella.anchor_entity ? normalizeEntity(umbrella.anchor_entity) : "";
  const facetOf = (t: (typeof children)[number]): string => {
    const pick = (t.entities ?? []).find((e) => {
      const n = normalizeEntity(e);
      return n && n !== umbNorm;
    });
    const raw = pick ?? t.anchor_entity ?? "";
    return raw ? titleCaseEntity(raw) : dominantCat(catCountByThread.get(t.id))?.label ?? "Verhaallijn";
  };

  // The right-panel reading content: accumulated state + events (newest first),
  // the latest deep article, Sol's latest note, and the source breakdown.
  const buildDetail = (t: (typeof lineThreads)[number]): StorylineDetail => {
    const evs = (eventsByThread.get(t.id) ?? []).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    const dates = evs.map((e) => e.date).filter((d): d is string => Boolean(d)).sort((a, b) => a.localeCompare(b));
    const withArticle = evs.find((e) => e.article);
    const sourceCount = new Map<string, number>();
    for (const e of evs) if (e.source) sourceCount.set(e.source, (sourceCount.get(e.source) ?? 0) + 1);
    return {
      state: t.state,
      firstDate: dates[0] ?? null,
      lastDate: dates.at(-1) ?? null,
      article: withArticle?.article ?? null,
      articleHeadline: withArticle?.title ?? null,
      articleDate: withArticle?.date ?? null,
      solNote: evs.find((e) => e.solNote)?.solNote ?? null,
      events: evs.map(({ date, title, source, url, article, solNote }) => ({ date, title, source, url, article, solNote })),
      sources: [...sourceCount.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    };
  };

  const now = Date.now();
  const lineFor = (t: (typeof lineThreads)[number], general: boolean): UmbrellaLine => {
    const dates = datesByThread.get(t.id) ?? [];
    return {
      id: t.id,
      facet: general ? "Algemeen" : facetOf(t),
      headline: general ? "Overige ontwikkelingen" : t.title,
      general,
      category: dominantCat(catCountByThread.get(t.id)) ?? (t.category_id ? catById.get(t.category_id) ?? null : null),
      recency: recencyTier(t.last_seen_at, latestSeen),
      status: t.status,
      followed: followed.has(t.id),
      itemCount: dates.length,
      updatedLabel: updatedAgo(t.last_seen_at, now),
      series: windowStart && windowEnd ? dailyActivitySeries(dates, windowStart, windowEnd) : [],
      detail: buildDetail(t),
    };
  };

  // The umbrella's own general bucket becomes a tile only when it directly holds
  // items; storylines always get a tile, busiest first.
  const generalLine = (datesByThread.get(umbrella.id)?.length ?? 0) > 0 ? [lineFor(umbrella, true)] : [];
  const childLines = children
    .map((c) => lineFor(c, false))
    .sort((a, b) => b.itemCount - a.itemCount || a.facet.localeCompare(b.facet));

  return {
    id: umbrella.id,
    title: umbrella.title,
    label: threadSubject(umbrella.title, umbrella.anchor_entity),
    status: umbrella.status,
    category:
      dominantCat(overallCatCount) ?? (umbrella.category_id ? catById.get(umbrella.category_id) ?? null : null),
    // Frame each storyline's state by its short facet, not the long headline.
    state: aggregateUmbrellaState(
      umbrella.state,
      children.map((c) => ({ anchor: facetOf(c), state: c.state })),
    ),
    followed: followed.has(umbrella.id),
    windowStart,
    windowEnd,
    lines: [...childLines, ...generalLine],
  };
}

/**
 * One story by thread id, scoped to the profile (Phase C). The thread's meta +
 * accumulated state + forecast, every linked event with its full deep article,
 * the related storylines (by entity overlap + parent/child), the upcoming agenda,
 * and the source breakdown. Batched `in(...)` lookups via {@link fetchInChunks}.
 */
export async function getStoryDetail(profileId: string, threadId: string): Promise<StoryDetail | null> {
  const rows = unwrap(
    await db()
      .from("threads")
      .select("id, title, status, category_id, state, entities, prediction, parent_thread_id")
      .eq("profile_id", profileId)
      .eq("id", threadId)
      .limit(1),
  ) as {
    id: string;
    title: string;
    status: ThreadStatus;
    category_id: string | null;
    state: string | null;
    entities: string[] | null;
    prediction: ThreadPrediction | null;
    parent_thread_id: string | null;
  }[];
  const thread = rows[0];
  if (!thread) return null;
  const entities = thread.entities ?? [];

  // Categories are a small table — load once and map by id (used for this story's
  // dominant/multi categories and for the related storylines' labels).
  const allCats = unwrap(await db().from("categories").select("id, slug, name")) as {
    id: string;
    slug: string;
    name: string;
  }[];
  const catById = new Map(allCats.map((c) => [c.id, { slug: c.slug, label: c.name }]));

  const links = unwrap(
    await db().from("thread_items").select("item_id, edition_id").eq("thread_id", threadId),
  ) as { item_id: string; edition_id: string | null }[];

  const editionIds = [...new Set(links.map((l) => l.edition_id).filter(Boolean))] as string[];
  const eds = editionIds.length
    ? (unwrap(await db().from("editions").select("id, date").in("id", editionIds)) as { id: string; date: string }[])
    : [];
  const dateByEdition = new Map(eds.map((e) => [e.id, e.date]));

  const itemIds = [...new Set(links.map((l) => l.item_id))];
  const items = await fetchInChunks(itemIds, async (batch) =>
    unwrap(
      await db().from("items").select("id, title, url, category_id, sources(name)").in("id", batch),
    ) as unknown as {
      id: string;
      title: string;
      url: string | null;
      category_id: string | null;
      sources: { name: string } | null;
    }[],
  );
  const itemById = new Map(items.map((i) => [i.id, i]));

  // The deep article + Sol note live on the edition_item for that item in that
  // edition, so key by item:edition (an item can recur across editions).
  const eis = await fetchInChunks(itemIds, async (batch) =>
    unwrap(
      await db()
        .from("edition_items")
        .select("item_id, edition_id, summary_text, article, sol_note")
        .in("item_id", batch),
    ) as {
      item_id: string;
      edition_id: string | null;
      summary_text: string | null;
      article: DeepArticle | null;
      sol_note: string | null;
    }[],
  );
  const eiByKey = new Map(eis.map((e) => [`${e.item_id}:${e.edition_id ?? ""}`, e]));

  const events: StoryEvent[] = links
    .map((l) => {
      const item = itemById.get(l.item_id);
      const ei = eiByKey.get(`${l.item_id}:${l.edition_id ?? ""}`);
      return {
        date: l.edition_id ? dateByEdition.get(l.edition_id) ?? null : null,
        title: item?.title ?? "Onbekend bericht",
        body: ei?.summary_text ?? null,
        article: ei?.article ?? null,
        sol_note: ei?.sol_note ?? null,
        source_name: item?.sources?.name ?? null,
        url: item?.url ?? null,
      };
    })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const dates = events.map((e) => e.date).filter((d): d is string => Boolean(d)).sort((a, b) => a.localeCompare(b));

  // Dominant + multi categories from where the linked items landed.
  const catCount = new Map<string, number>();
  for (const id of itemIds) {
    const cid = itemById.get(id)?.category_id;
    if (cid) catCount.set(cid, (catCount.get(cid) ?? 0) + 1);
  }
  const rankedCats = [...catCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => catById.get(id))
    .filter((c): c is { slug: string; label: string } => Boolean(c));
  const category = rankedCats[0] ?? (thread.category_id ? catById.get(thread.category_id) ?? null : null);

  // Source breakdown: count events per source name.
  const sourceCount = new Map<string, number>();
  for (const l of links) {
    const name = itemById.get(l.item_id)?.sources?.name;
    if (name) sourceCount.set(name, (sourceCount.get(name) ?? 0) + 1);
  }
  const sources = [...sourceCount.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // Related storylines: other open threads ranked by entity overlap, with parent
  // and children always included (they share the anchor entity by construction).
  const otherThreads = unwrap(
    await db()
      .from("threads")
      .select("id, title, status, category_id, entities, parent_thread_id")
      .eq("profile_id", profileId)
      .neq("status", "closed")
      .neq("id", threadId),
  ) as {
    id: string;
    title: string;
    status: ThreadStatus;
    category_id: string | null;
    entities: string[] | null;
    parent_thread_id: string | null;
  }[];
  const selfSet = new Set(entities.map(normalizeEntity).filter(Boolean));
  const toRelated = (t: (typeof otherThreads)[number]): RelatedStory => ({
    id: t.id,
    title: t.title,
    status: t.status,
    category: t.category_id ? catById.get(t.category_id) ?? null : null,
    shared: [...new Set((t.entities ?? []).map(normalizeEntity).filter((e) => e && selfSet.has(e)))].slice(0, 3),
  });
  const ranked = rankRelated(
    entities,
    otherThreads.map((t) => ({ ...t, entities: t.entities ?? [] })),
    entityOverlap,
  ).map((r) => toRelated(r.item));
  const relatedIds = new Set(ranked.map((r) => r.id));
  for (const t of otherThreads) {
    if (relatedIds.has(t.id)) continue;
    if (t.id === thread.parent_thread_id || t.parent_thread_id === threadId) {
      ranked.push(toRelated(t));
      relatedIds.add(t.id);
    }
  }
  const related = ranked.slice(0, 4);

  // Upcoming dated events on this storyline.
  const agendaRows = unwrap(
    await db()
      .from("calendar_events")
      .select("id, title, kind, date, certainty, thread_id, threads(title)")
      .eq("profile_id", profileId)
      .eq("thread_id", threadId)
      .gte("date", todayLocal())
      .order("date", { ascending: true })
      .limit(8),
  ) as unknown as {
    id: string;
    title: string;
    kind: CalendarEventKind;
    date: string;
    certainty: CalendarEventCertainty;
    thread_id: string | null;
    threads: { title: string } | null;
  }[];
  const agenda: AgendaEvent[] = agendaRows.map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    date: r.date,
    certainty: r.certainty,
    thread_id: r.thread_id,
    thread_title: r.threads?.title ?? null,
  }));

  const followRows = unwrap(
    await db()
      .from("follow_marks")
      .select("target_id")
      .eq("profile_id", profileId)
      .eq("target_type", "thread")
      .eq("target_id", threadId)
      .eq("active", true),
  ) as { target_id: string }[];

  return {
    id: thread.id,
    title: thread.title,
    status: thread.status,
    category,
    categories: rankedCats,
    state: thread.state,
    prediction: thread.prediction,
    entities,
    followed: followRows.length > 0,
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
    eventCount: events.length,
    events,
    related,
    agenda,
    sources,
  };
}

// ── Agenda: aankomende gedateerde gebeurtenissen (Phase B) ───────────────────

export interface AgendaEvent {
  id: string;
  title: string;
  kind: CalendarEventKind;
  date: string;
  certainty: CalendarEventCertainty;
  thread_id: string | null;
  /** verhaallijn waar het event bij hoort, voor een klein label */
  thread_title: string | null;
}

/** Aankomende events van een profiel (vandaag en later), op datum oplopend. */
export async function getUpcomingAgenda(profileId: string, limit = 12): Promise<AgendaEvent[]> {
  const today = todayLocal();
  const rows = unwrap(
    await db()
      .from("calendar_events")
      .select("id, title, kind, date, certainty, thread_id, threads(title)")
      .eq("profile_id", profileId)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(limit),
  ) as unknown as {
    id: string;
    title: string;
    kind: CalendarEventKind;
    date: string;
    certainty: CalendarEventCertainty;
    thread_id: string | null;
    threads: { title: string } | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    date: r.date,
    certainty: r.certainty,
    thread_id: r.thread_id,
    thread_title: r.threads?.title ?? null,
  }));
}
