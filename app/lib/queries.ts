// Leesqueries voor de UI. De app-laag leest; alle schrijfwerk loopt via
// modules/ en de API-routes.

import { db, unwrap } from "@/modules/shared/db";
import type {
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
