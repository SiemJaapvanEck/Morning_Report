// Accountvoorkeuren: welke onderwerpen een profiel volgt en hoe relevant ze
// zijn. De voorkeur is het startpunt van de interessemotor — de relevantie
// wordt als beginscore in topic_scores gezet en de kaart-ratings (−2…+2)
// stellen daarna bij. Volgen/niet-volgen leeft in follow_marks.
//
// Ontwerp (zie docs/ontwerp.md §8): niet-gevolgde onderwerpen worden gedempt
// maar groot nieuws breekt er altijd doorheen; harde uitsluiting bestaat niet.

import { db, unwrap } from "../shared/db";
import type { Category, Topic } from "../shared/types";

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
