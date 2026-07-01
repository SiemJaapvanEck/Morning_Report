// Accountvoorkeuren: welke onderwerpen een profiel volgt en hoe relevant ze
// zijn. De voorkeur is het startpunt van de interessemotor — de relevantie
// wordt als beginscore in topic_scores gezet en de kaart-ratings (−2…+2)
// stellen daarna bij. Volgen/niet-volgen leeft in follow_marks.
//
// Ontwerp (zie docs/ontwerp.md §8): niet-gevolgde onderwerpen worden gedempt
// maar groot nieuws breekt er altijd doorheen; harde uitsluiting bestaat niet.

import { db, unwrap } from "../shared/db";
import { fetchFeed } from "../shared/feeds";
import type { Category, Source, Topic } from "../shared/types";

/** Categorieën die voor een nieuw profiel voorgeselecteerd staan. */
export const DEFAULT_CATEGORY_SLUGS = [
  "tech",
  "financieel",
  "wereld",
  "wetenschap",
  "goed-nieuws",
] as const;

/**
 * Pure functie: relevantie (−2…+2, dezelfde schaal als de kaart-rating) →
 * beginscore voor topic_scores. ×0.3 zodat de voorkeur stevig stuurt
 * (−0.6…+0.6) maar er ruimte blijft tot ±1 voor het leren via ratings.
 */
export function relevantieNaarScore(relevantie: number): number {
  const clamped = Math.max(-2, Math.min(2, Math.round(relevantie)));
  return clamped * 0.3;
}

/** Pure functie: naam → uniek slug-achtig id (voor eigen topics/categorieën). */
export function naamNaarSlug(naam: string): string {
  return naam
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export interface VoorkeurKeuze {
  topic_id: string;
  volgen: boolean;
  /** −2…+2; alleen relevant als volgen=true */
  relevantie: number;
}

/**
 * Slaat de volledige voorkeurenset van een profiel op: follow_marks voor
 * volgen/niet-volgen en topic_scores als beginscore. Idempotent (upserts) —
 * bestaande, door ratings bijgestelde scores worden alléén overschreven als
 * de gebruiker de relevantie expliciet opnieuw instelt (dat is precies wat
 * een bewerkte voorkeur betekent).
 */
export async function applyPreferences(
  profileId: string,
  keuzes: VoorkeurKeuze[],
): Promise<void> {
  if (keuzes.length === 0) return;

  const marks = keuzes.map((keuze) => ({
    profile_id: profileId,
    target_type: "topic" as const,
    target_id: keuze.topic_id,
    active: keuze.volgen,
  }));
  const { error: markError } = await db()
    .from("follow_marks")
    .upsert(marks, { onConflict: "profile_id,target_type,target_id" });
  if (markError) throw new Error(`Voorkeuren (volgen): ${markError.message}`);

  const scores = keuzes.map((keuze) => ({
    profile_id: profileId,
    target_type: "topic" as const,
    target_id: keuze.topic_id,
    // niet volgen = demping: −0.6, zodat alleen groot nieuws doorbreekt
    score: keuze.volgen ? relevantieNaarScore(keuze.relevantie) : -0.6,
    updated_at: new Date().toISOString(),
  }));
  const { error: scoreError } = await db()
    .from("topic_scores")
    .upsert(scores, { onConflict: "profile_id,target_type,target_id" });
  if (scoreError) throw new Error(`Voorkeuren (scores): ${scoreError.message}`);
}

export interface NieuwTopic {
  naam: string;
  /** bestaande categorie… */
  category_id?: string;
  /** …of een nieuwe categorienaam (heeft voorrang als beide gezet zijn) */
  nieuwe_categorie?: string;
  relevantie: number;
  /**
   * Specifiek volgen: vrije zoektekst (bv. een bedrijfsnaam). Het topic wordt
   * query_mode zodat de query-ingestie (fase 3) het actief opzoekt; de
   * scan-stap matcht het ondertussen al op naam in de bestaande feeds.
   */
  zoektekst?: string;
  /**
   * Optionele vaste bron: items uit deze bron krijgen het topic direct bij
   * de ingestie. Leeg = de normale zoekweg (AI-toewijzing over alle feeds).
   */
  source_id?: string;
}

/** Maakt een eigen topic (en zo nodig categorie) aan en volgt het meteen. */
export async function createUserTopic(
  profileId: string,
  invoer: NieuwTopic,
): Promise<Topic> {
  const naam = invoer.naam.trim();
  if (!naam) throw new Error("Topicnaam is leeg");

  let categoryId = invoer.category_id ?? null;
  if (invoer.nieuwe_categorie?.trim()) {
    const catNaam = invoer.nieuwe_categorie.trim();
    const bestaande = unwrap(await db().from("categories").select("*")) as Category[];
    const match = bestaande.find((c) => c.slug === naamNaarSlug(catNaam));
    if (match) {
      categoryId = match.id;
    } else {
      const maxPos = Math.max(0, ...bestaande.map((c) => c.position));
      const nieuw = unwrap(
        await db()
          .from("categories")
          .insert({ slug: naamNaarSlug(catNaam), name: catNaam, position: maxPos + 1 })
          .select()
          .single(),
      ) as Category;
      categoryId = nieuw.id;
    }
  }
  if (!categoryId) throw new Error("Kies een categorie of geef een nieuwe naam");

  const zoektekst = invoer.zoektekst?.trim() || null;
  const topic = unwrap(
    await db()
      .from("topics")
      .upsert(
        {
          category_id: categoryId,
          slug: naamNaarSlug(naam),
          name: naam,
          cadence: "altijd",
          query_mode: zoektekst != null,
          query_text: zoektekst,
          source_id: invoer.source_id ?? null,
        },
        { onConflict: "slug" },
      )
      .select()
      .single(),
  ) as Topic;

  await applyPreferences(profileId, [
    { topic_id: topic.id, volgen: true, relevantie: invoer.relevantie },
  ]);

  return topic;
}

// ============================================================
// Add a feed to the shared source catalog (validated by URL)
// ============================================================

export interface NieuweBron {
  naam: string;
  url: string;
  /** optionele macro-categorie waaronder de bron valt */
  category_id?: string | null;
}

export interface BronValidatie {
  ok: boolean;
  /** aantal items dat de feed opleverde (alleen bij ok) */
  items?: number;
  error?: string;
}

/** Pure: accepteert alleen http(s)-URL's. */
export function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Valideer een feed door 'm echt te parsen (dezelfde weg als de ingestie). Geeft
 * het aantal items terug zodat de UI "23 artikelen gevonden" kan tonen.
 */
export async function validateFeedUrl(url: string): Promise<BronValidatie> {
  if (!isHttpUrl(url)) return { ok: false, error: "Geen geldige http(s)-URL." };
  try {
    const items = await fetchFeed(url.trim());
    if (items.length === 0) return { ok: false, error: "Feed bevat geen items." };
    return { ok: true, items: items.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Maakt een gedeelde RSS-bron aan uit een URL, na validatie dat 'ie parseert.
 * De bron is globaal (gedeelde catalogus) — alleen de per-profiel volg-/track-
 * keuze is persoonlijk. Idempotent op url: een bestaande bron met dezelfde url
 * wordt ongewijzigd teruggegeven.
 */
export async function createUserSource(invoer: NieuweBron): Promise<Source> {
  const naam = invoer.naam.trim();
  const url = invoer.url.trim();
  if (!naam) throw new Error("Bronnaam is leeg");

  const validatie = await validateFeedUrl(url);
  if (!validatie.ok) throw new Error(validatie.error ?? "Feed niet geldig");

  const bestaande = unwrap(
    await db().from("sources").select("*").eq("url", url).limit(1),
  ) as Source[];
  if (bestaande.length > 0) return bestaande[0];

  return unwrap(
    await db()
      .from("sources")
      .insert({
        category_id: invoer.category_id ?? null,
        name: naam,
        kind: "rss",
        url,
        medium: "article",
        active: true,
      })
      .select()
      .single(),
  ) as Source;
}

// ============================================================
// Per-profile "track as thread" selection
// ============================================================

/**
 * Vervangt de "track als verhaallijn"-selectie van een profiel door `topicIds`
 * (de volledige gewenste set). Diff-gebaseerd, zodat opnieuw opslaan een no-op
 * is en de set nooit kortstondig leeg raakt.
 */
export async function applyThreadTracking(
  profileId: string,
  topicIds: string[],
): Promise<void> {
  const desired = new Set(topicIds);
  const existing = unwrap(
    await db().from("thread_tracking").select("topic_id").eq("profile_id", profileId),
  ) as { topic_id: string }[];
  const have = new Set(existing.map((e) => e.topic_id));

  const toAdd = [...desired].filter((id) => !have.has(id));
  const toRemove = [...have].filter((id) => !desired.has(id));

  if (toAdd.length > 0) {
    const { error } = await db()
      .from("thread_tracking")
      .insert(toAdd.map((topic_id) => ({ profile_id: profileId, topic_id })));
    if (error) throw new Error(`Thread-tracking (toevoegen): ${error.message}`);
  }
  if (toRemove.length > 0) {
    const { error } = await db()
      .from("thread_tracking")
      .delete()
      .eq("profile_id", profileId)
      .in("topic_id", toRemove);
    if (error) throw new Error(`Thread-tracking (verwijderen): ${error.message}`);
  }
}

/**
 * Follow / unfollow a single storyline (Phase C). Threads are entity-anchored, so
 * "following" lives in follow_marks with target_type 'thread' (not the topic-keyed
 * thread_tracking). Idempotent upsert on (profile, type, target) — the same
 * conflict key the topic follow-marks use.
 */
export async function setThreadFollow(
  profileId: string,
  threadId: string,
  active: boolean,
): Promise<void> {
  const { error } = await db()
    .from("follow_marks")
    .upsert(
      { profile_id: profileId, target_type: "thread", target_id: threadId, active },
      { onConflict: "profile_id,target_type,target_id" },
    );
  if (error) throw new Error(`Verhaallijn volgen: ${error.message}`);
}
