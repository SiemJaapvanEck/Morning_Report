// Server-helper: de kieslijst + huidige stand voor de VoorkeurenKiezer.
// Nieuwe profielen (zonder follow_marks) krijgen de standaard-voorselectie:
// tech, financieel, wereld, wetenschap en goed-nieuws op relevantie +1.

import { db, unwrap } from "@/modules/shared/db";
import { DEFAULT_CATEGORY_SLUGS } from "@/modules/preferences";
import type { Category, Source, Topic } from "@/modules/shared/types";

export interface VoorkeurenData {
  categories: Category[];
  topics: Topic[];
  /** actieve bronnen, voor de optionele topic ↔ bron-koppeling */
  sources: Source[];
  initieel: Record<string, { volgen: boolean; relevantie: number }>;
}

export async function getVoorkeurenData(profileId: string): Promise<VoorkeurenData> {
  const [categoriesRes, topicsRes, sourcesRes, scoresRes, marksRes] = await Promise.all([
    db().from("categories").select("*").order("position"),
    db().from("topics").select("*").order("name"),
    db().from("sources").select("*").eq("active", true).order("name"),
    db()
      .from("topic_scores")
      .select("target_id, score")
      .eq("profile_id", profileId)
      .eq("target_type", "topic"),
    db()
      .from("follow_marks")
      .select("target_id, active")
      .eq("profile_id", profileId)
      .eq("target_type", "topic"),
  ]);
  const categories = unwrap(categoriesRes) as Category[];
  const topics = unwrap(topicsRes) as Topic[];
  const sources = unwrap(sourcesRes) as Source[];
  const scores = unwrap(scoresRes) as { target_id: string; score: number }[];
  const marks = unwrap(marksRes) as { target_id: string; active: boolean }[];

  const scoreVoor = new Map(scores.map((s) => [s.target_id, s.score]));
  const markVoor = new Map(marks.map((m) => [m.target_id, m.active]));
  const defaultCategoryIds = new Set(
    categories
      .filter((c) => (DEFAULT_CATEGORY_SLUGS as readonly string[]).includes(c.slug))
      .map((c) => c.id),
  );

  const initieel: VoorkeurenData["initieel"] = {};
  for (const topic of topics) {
    const mark = markVoor.get(topic.id);
    if (mark != null) {
      // bestaande voorkeur: relevantie terugrekenen uit de (bijgeleerde) score
      const score = scoreVoor.get(topic.id) ?? 0;
      initieel[topic.id] = {
        volgen: mark,
        relevantie: Math.max(-2, Math.min(2, Math.round(score / 0.3))),
      };
    } else {
      // nog geen voorkeur: standaard-voorselectie
      initieel[topic.id] = {
        volgen: defaultCategoryIds.has(topic.category_id),
        relevantie: 1,
      };
    }
  }

  return { categories, topics, sources, initieel };
}
