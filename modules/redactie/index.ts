// The editorial layer: a single neutral, topic-driven cross-reference synthesis.
//
// No personas, no character — what matters is cross-referencing and depth. One
// bounded askAI call turns the day's relevant topics into a coherent "rode
// draad" (through-line): it covers only the topics that actually have news
// today, leads with the ones the reader follows, and draws connections between
// them. The deep research itself stays in the generate step.

import { askAI } from "../shared/ai";
import { budgetPolicy } from "../shared/budget";
import { db, unwrap } from "../shared/db";
import type { BudgetMode } from "../shared/types";

// ============================================================
// Cross-reference context (axis A: what the reader follows) — extended in a
// later phase with earlier news (B) and portfolio (C).
// ============================================================

export interface UserContext {
  /** names of topics/categories the reader actively follows (follow_marks) */
  follows: string[];
  /** topic_ids the reader follows — to mark items */
  followedTopicIds: Set<string>;
  /** category_ids the reader follows */
  followedCategoryIds: Set<string>;
}

/**
 * Collects the cross-reference context for a profile: what the reader actively
 * follows. Empty when nothing is followed (no-op, not an error).
 */
export async function assembleUserContext(profileId: string): Promise<UserContext> {
  const marks = unwrap(
    await db()
      .from("follow_marks")
      .select("target_type, target_id")
      .eq("profile_id", profileId)
      .eq("active", true),
  ) as { target_type: string; target_id: string }[];

  const followedTopicIds = new Set(marks.filter((m) => m.target_type === "topic").map((m) => m.target_id));
  const followedCategoryIds = new Set(marks.filter((m) => m.target_type === "category").map((m) => m.target_id));

  const follows: string[] = [];
  if (followedTopicIds.size > 0) {
    const topics = unwrap(
      await db().from("topics").select("name").in("id", [...followedTopicIds]),
    ) as { name: string }[];
    follows.push(...topics.map((t) => t.name));
  }
  if (followedCategoryIds.size > 0) {
    const cats = unwrap(
      await db().from("categories").select("name").in("id", [...followedCategoryIds]),
    ) as { name: string }[];
    follows.push(...cats.map((c) => c.name));
  }
  return { follows, followedTopicIds, followedCategoryIds };
}

// ============================================================
// Daily digest — one neutral cross-reference synthesis
// ============================================================

export interface DigestTopic {
  /** topic/category name as it appears in the edition */
  name: string;
  /** does the reader actively follow this topic/category? (cross-ref axis A) */
  followed: boolean;
  /** a few item headlines from today, best first */
  headlines: string[];
}

/**
 * Pure-ish: orders the day's topics with followed ones first, then by how much
 * news they carry. Topics without headlines are dropped — only what has real
 * news today is covered.
 */
export function orderDigestTopics(topics: DigestTopic[]): DigestTopic[] {
  return topics
    .filter((t) => t.headlines.length > 0)
    .sort((a, b) => Number(b.followed) - Number(a.followed) || b.headlines.length - a.headlines.length);
}

/**
 * One neutral cross-reference synthesis of the day. Budget-aware ('stop' → no
 * call). Covers only the topics passed in (the ones with news today), leads
 * with followed topics, and connects threads. Plain editorial prose, no persona.
 */
export async function writeDailyDigest(
  topics: DigestTopic[],
  mode: BudgetMode,
  editionId: string,
  stepId?: string,
): Promise<string | null> {
  const policy = budgetPolicy[mode];
  const ordered = orderDigestTopics(topics);
  if (ordered.length === 0 || policy.solMaxTokens === 0) return null;

  const blok = ordered
    .map((t) => `## ${t.followed ? "★ " : ""}${t.name}\n${t.headlines.map((h) => `- ${h}`).join("\n")}`)
    .join("\n\n");

  const followed = ordered.filter((t) => t.followed).map((t) => t.name);
  const focusBlok = followed.length
    ? `\n\nDe lezer volgt actief: ${followed.join(", ")} — geef die onderwerpen voorrang en ` +
      `begin daarbij. De ★ markeert ze in de lijst hierboven; gebruik dat teken zelf niet in je tekst.`
    : "";

  const result = await askAI({
    tier: "deep",
    editionId,
    stepId,
    maxTokens: Math.min(900, policy.solMaxTokens + 300),
    system:
      "Je bent de eindredacteur van een persoonlijk ochtendrapport. Schrijf zakelijk, " +
      "helder en neutraal — geen personage, geen naam, geen 'ik'. Lopende tekst, geen kopjes.",
    prompt:
      `Dit zijn de onderwerpen mét nieuws van vandaag (behandel alléén deze, niet meer):\n\n${blok}` +
      focusBlok +
      `\n\nSchrijf de rode draad van vandaag in 2-3 alinea's: verbind de belangrijkste ` +
      `ontwikkelingen, leg dwarsverbanden tussen onderwerpen, en begin bij wat de lezer volgt. ` +
      `Sla onderwerpen zonder echt nieuws over.`,
  });
  return result.text.trim();
}
