// Leesqueries voor de UI. De app-laag leest; alle schrijfwerk loopt via
// modules/ en de API-routes.

import { db, unwrap } from "@/modules/shared/db";
import { todayLocal } from "@/modules/shared/config";
import { updatedAgo, recencyTier, type Recency } from "@/app/lib/stories";
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
      .select("id, title, status, last_seen_at")
      .eq("profile_id", profileId)
      .neq("status", "closed"),
  ) as {
    id: string;
    title: string;
    status: ThreadStatus;
    last_seen_at: string | null;
  }[];
  if (threads.length === 0) return [];

  // Each linked item is an event; its edition's date places it on the timeline,
  // and its own category feeds the story's (multi-)category set.
  const threadIds = threads.map((t) => t.id);
  const links = unwrap(
    await db().from("thread_items").select("thread_id, item_id, edition_id").in("thread_id", threadIds),
  ) as { thread_id: string; item_id: string; edition_id: string | null }[];

  const editionIds = [...new Set(links.map((l) => l.edition_id).filter(Boolean))] as string[];
  const eds = editionIds.length
    ? (unwrap(await db().from("editions").select("id, date").in("id", editionIds)) as { id: string; date: string }[])
    : [];
  const dateByEdition = new Map(eds.map((e) => [e.id, e.date]));

  // Item → its category, so a story's categories come from where its items landed.
  const itemIds = [...new Set(links.map((l) => l.item_id))];
  const items = itemIds.length
    ? (unwrap(await db().from("items").select("id, category_id").in("id", itemIds)) as {
        id: string;
        category_id: string | null;
      }[])
    : [];
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

  const now = Date.now();
  return threads
    .map((t) => {
      const dates = (datesByThread.get(t.id) ?? []).sort((a, b) => a.localeCompare(b));
      // Categories present, most-frequent first; the leader drives the dot color.
      const ranked = [...(catCountByThread.get(t.id) ?? new Map()).entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => categoryById.get(id))
        .filter((c): c is { slug: string; label: string } => Boolean(c));
      return {
        id: t.id,
        title: t.title,
        category: ranked[0] ?? null,
        categories: ranked,
        recency: recencyTier(t.last_seen_at, latestSeen),
        status: t.status,
        firstDate: dates[0] ?? null,
        lastDate: dates.at(-1) ?? null,
        eventCount: dates.length,
        lastSeenAt: t.last_seen_at,
        updatedLabel: updatedAgo(t.last_seen_at, now),
        events: dates.map((date) => ({ date })),
      };
    })
    .filter((s) => s.eventCount >= MIN_STORY_EVENTS);
}

/** One event on a story's detail timeline: the source item + its written update. */
export interface StoryEvent {
  date: string | null;
  title: string;
  body: string | null;
}

/** A single story for the detail page (Phase C drill-in target). */
export interface StoryDetail {
  id: string;
  title: string;
  status: ThreadStatus;
  category: { slug: string; label: string } | null;
  /** accumulated storyline prose the editions build on */
  state: string | null;
  firstDate: string | null;
  lastDate: string | null;
  eventCount: number;
  /** the linked events, newest first */
  events: StoryEvent[];
}

/**
 * One story by thread id, scoped to the profile. Minimal Phase B stub: the
 * thread's meta, its accumulated state prose, and the linked events (source title
 * + the written update). Phase C builds the full detail page on top of this.
 */
export async function getStoryDetail(profileId: string, threadId: string): Promise<StoryDetail | null> {
  const rows = unwrap(
    await db()
      .from("threads")
      .select("id, title, status, category_id, state")
      .eq("profile_id", profileId)
      .eq("id", threadId)
      .limit(1),
  ) as { id: string; title: string; status: ThreadStatus; category_id: string | null; state: string | null }[];
  const thread = rows[0];
  if (!thread) return null;

  const category =
    thread.category_id != null
      ? ((unwrap(await db().from("categories").select("slug, name").eq("id", thread.category_id).limit(1)) as {
          slug: string;
          name: string;
        }[])[0] ?? null)
      : null;

  const links = unwrap(
    await db().from("thread_items").select("item_id, edition_id").eq("thread_id", threadId),
  ) as { item_id: string; edition_id: string | null }[];

  const editionIds = [...new Set(links.map((l) => l.edition_id).filter(Boolean))] as string[];
  const eds = editionIds.length
    ? (unwrap(await db().from("editions").select("id, date").in("id", editionIds)) as { id: string; date: string }[])
    : [];
  const dateByEdition = new Map(eds.map((e) => [e.id, e.date]));

  const itemIds = [...new Set(links.map((l) => l.item_id))];
  const items = itemIds.length
    ? (unwrap(await db().from("items").select("id, title").in("id", itemIds)) as { id: string; title: string }[])
    : [];
  const titleByItem = new Map(items.map((i) => [i.id, i.title]));
  const eis = itemIds.length
    ? (unwrap(
        await db().from("edition_items").select("item_id, summary_text").in("item_id", itemIds),
      ) as { item_id: string; summary_text: string | null }[])
    : [];
  const bodyByItem = new Map(eis.map((e) => [e.item_id, e.summary_text]));

  const events: StoryEvent[] = links
    .map((l) => ({
      date: l.edition_id ? dateByEdition.get(l.edition_id) ?? null : null,
      title: titleByItem.get(l.item_id) ?? "Onbekend bericht",
      body: bodyByItem.get(l.item_id) ?? null,
    }))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const dates = events.map((e) => e.date).filter((d): d is string => Boolean(d)).sort((a, b) => a.localeCompare(b));

  return {
    id: thread.id,
    title: thread.title,
    status: thread.status,
    category: category ? { slug: category.slug, label: category.name } : null,
    state: thread.state,
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
    eventCount: events.length,
    events,
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
