// Leesqueries voor de UI. De app-laag leest; alle schrijfwerk loopt via
// modules/ en de API-routes.

import { db, unwrap } from "@/modules/shared/db";
import { dominantLens, selectLenses } from "@/modules/threads";
import type {
  DestepLens,
  Edition,
  EditionSection,
  EditionStatus,
  FrontPage,
  Profile,
  WeatherSnapshot,
} from "@/modules/shared/types";

export interface EditionView {
  edition: Edition;
  sections: SectionView[];
}

export interface SectionView {
  section: EditionSection;
  weather: WeatherSnapshot | null;
  items: {
    id: string;
    item_id: string;
    band: "deep" | "summary" | "headline";
    summary_text: string | null;
    sol_note: string | null;
    match_score: number | null;
    title: string;
    url: string | null;
    image_url: string | null;
    source_name: string | null;
    regio: string | null;
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
        "id, item_id, section_id, band, position, summary_text, sol_note, match_score, items(title, url, image_url, scan_meta, sources(name))",
      )
      .eq("edition_id", edition.id)
      .order("position"),
  ) as unknown as {
    id: string;
    item_id: string;
    section_id: string | null;
    band: "deep" | "summary" | "headline";
    summary_text: string | null;
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
        sol_note: row.sol_note,
        match_score: row.match_score,
        title: row.items.title,
        url: row.items.url,
        image_url: row.items.image_url,
        source_name: row.items.sources?.name ?? null,
        regio: row.items.scan_meta?.regio ?? null,
      })),
  }));

  return { edition, sections: sectionViews };
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
// Thread archive (Phase 5c-2): mega-threads as timelines of dots
// ============================================================

/** One dot on a mega-thread's timeline: a child storyline at the date it ran. */
export interface ArchiveDot {
  date: string;
  headline: string;
  body: string | null;
  lenses: string[];
  childId: string;
}

/** A mega-thread for the archive: its daily news volume + the child-story dots. */
export interface ArchiveMega {
  id: string;
  title: string;
  /** the topic's own daily item count — the volume line the dots sit on */
  volume: { date: string; count: number }[];
  dots: ArchiveDot[];
  /** the mega's main DESTEP sector — drives its line color in the chart */
  primarySector: DestepLens;
}

/**
 * The profile's mega-threads as timelines. Each is a parent storyline (an anchor
 * entity that recurred across days); its child threads become dots placed on the
 * date they last ran, sitting on the topic's daily-volume line. Click a dot in
 * the UI to read that child's latest article.
 */
export async function getThreadArchive(profileId: string): Promise<ArchiveMega[]> {
  const megas = unwrap(
    await db()
      .from("threads")
      .select("id, title")
      .eq("profile_id", profileId)
      .not("anchor_entity", "is", null),
  ) as { id: string; title: string }[];
  if (megas.length === 0) return [];

  const children = unwrap(
    await db()
      .from("threads")
      .select("id, parent_thread_id, title, entities, topic_id, category_id")
      .in("parent_thread_id", megas.map((m) => m.id)),
  ) as {
    id: string;
    parent_thread_id: string;
    title: string;
    entities: string[];
    topic_id: string | null;
    category_id: string | null;
  }[];
  if (children.length === 0) {
    return megas.map((m) => ({ id: m.id, title: m.title, volume: [], dots: [], primarySector: "sociaal" as DestepLens }));
  }

  // Topic/category context so selectLenses gets more than bare entities — this
  // is what fixes the "SOCIAAL instead of ECONOMISCH" mislabeling.
  const topicIds = [...new Set(children.map((c) => c.topic_id).filter(Boolean))] as string[];
  const categoryIds = [...new Set(children.map((c) => c.category_id).filter(Boolean))] as string[];
  const topics = topicIds.length
    ? (unwrap(await db().from("topics").select("id, name").in("id", topicIds)) as { id: string; name: string }[])
    : [];
  const categories = categoryIds.length
    ? (unwrap(await db().from("categories").select("id, slug").in("id", categoryIds)) as { id: string; slug: string }[])
    : [];
  const topicName = new Map(topics.map((t) => [t.id, t.name]));
  const categorySlug = new Map(categories.map((c) => [c.id, c.slug]));
  const lensesOf = (c: (typeof children)[number]) =>
    selectLenses(
      c.category_id ? categorySlug.get(c.category_id) ?? null : null,
      c.topic_id ? topicName.get(c.topic_id) ?? null : null,
      c.entities,
    );

  const childIds = children.map((c) => c.id);
  const links = unwrap(
    await db().from("thread_items").select("thread_id, item_id, edition_id").in("thread_id", childIds),
  ) as { thread_id: string; item_id: string; edition_id: string | null }[];

  const editionIds = [...new Set(links.map((l) => l.edition_id).filter(Boolean))] as string[];
  const eds = editionIds.length
    ? (unwrap(await db().from("editions").select("id, date").in("id", editionIds)) as { id: string; date: string }[])
    : [];
  const dateByEdition = new Map(eds.map((e) => [e.id, e.date]));

  const itemIds = [...new Set(links.map((l) => l.item_id))];
  const eis = itemIds.length
    ? (unwrap(
        await db()
          .from("edition_items")
          .select("item_id, summary_text")
          .in("item_id", itemIds)
          .not("summary_text", "is", null),
      ) as { item_id: string; summary_text: string | null }[])
    : [];
  const bodyByItem = new Map<string, string>();
  for (const ei of eis) if (ei.summary_text) bodyByItem.set(ei.item_id, ei.summary_text);

  const linksByChild = new Map<string, typeof links>();
  for (const l of links) {
    const arr = linksByChild.get(l.thread_id) ?? [];
    arr.push(l);
    linksByChild.set(l.thread_id, arr);
  }

  return megas.map((m) => {
    const kids = children.filter((c) => c.parent_thread_id === m.id);
    const dots: ArchiveDot[] = [];
    const volume = new Map<string, number>();
    const kidLenses: DestepLens[][] = [];
    for (const kid of kids) {
      const kl = linksByChild.get(kid.id) ?? [];
      const dates = kl
        .map((l) => (l.edition_id ? dateByEdition.get(l.edition_id) : undefined))
        .filter((d): d is string => Boolean(d));
      for (const d of dates) volume.set(d, (volume.get(d) ?? 0) + 1);
      const lenses = lensesOf(kid);
      kidLenses.push(lenses);
      const latest = [...dates].sort().at(-1);
      if (!latest) continue;
      const body = kl.map((l) => bodyByItem.get(l.item_id)).find(Boolean) ?? null;
      dots.push({
        date: latest,
        headline: kid.title,
        body,
        lenses,
        childId: kid.id,
      });
    }
    return {
      id: m.id,
      title: m.title,
      volume: [...volume.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
      dots: dots.sort((a, b) => a.date.localeCompare(b.date)),
      primarySector: dominantLens(kidLenses),
    };
  });
}
