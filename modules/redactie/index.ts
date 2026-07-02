// The editorial layer: a single neutral, topic-driven cross-reference synthesis.
//
// No personas, no character — what matters is cross-referencing and depth. One
// bounded askAI call turns the day's relevant topics into a coherent "rode
// draad" (through-line): it covers only the topics that actually have news
// today, leads with the ones the reader follows, and draws connections between
// them. The deep research itself stays in the generate step.

import { askAI, askAIJson } from "../shared/ai";
import { budgetPolicy } from "../shared/budget";
import { db, unwrap } from "../shared/db";
import type { ActorCluster } from "../entities";
import type { BudgetMode, DailyPaperSection } from "../shared/types";

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
  /** topic_ids the reader explicitly tracks as a thread (thread_tracking) */
  trackedTopicIds: Set<string>;
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

  const tracking = unwrap(
    await db().from("thread_tracking").select("topic_id").eq("profile_id", profileId),
  ) as { topic_id: string }[];
  const trackedTopicIds = new Set(tracking.map((t) => t.topic_id));

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
  return { follows, followedTopicIds, followedCategoryIds, trackedTopicIds };
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

// ============================================================
// Daily Paper assembly (Phase 5a) — structured summary / intro / general
// ============================================================

/** The editorial parts the Daily Paper needs around the (reused) thread articles. */
export interface DailyPaperParts {
  /** short summary of the day — the front-page Daily Paper block */
  summary: string;
  /** introduction to the paper: the day + how it is laid out */
  intro: string;
  /** one broad-but-shallow roundup of the news NOT in the lead storylines */
  generalHeadline: string;
  generalBody: string;
}

const DAILY_PAPER_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    intro: { type: "string" },
    generalHeadline: { type: "string" },
    generalBody: { type: "string" },
  },
  required: ["summary", "intro", "generalHeadline", "generalBody"],
  additionalProperties: false,
} as const;

/**
 * Writes the editorial wrapper around the day's (already-generated) thread
 * updates: the front-page summary, the paper's intro, and one broad general
 * roundup of everything not covered by a lead storyline. One `deep` call,
 * budget-aware ('stop' → null). The per-thread articles are reused, not rewritten.
 */
export async function composeDailyPaper(
  leadStories: string[],
  topics: DigestTopic[],
  mode: BudgetMode,
  editionId: string,
  stepId?: string,
  actorClusters: ActorCluster[] = [],
): Promise<DailyPaperParts | null> {
  const policy = budgetPolicy[mode];
  if (policy.solMaxTokens === 0) return null;

  const ordered = orderDigestTopics(topics);
  const leadBlok = leadStories.length
    ? leadStories.map((h) => `- ${h}`).join("\n")
    : "(geen uitgelichte verhaallijnen vandaag)";
  const topicBlok = ordered
    .map((t) => `## ${t.followed ? "★ " : ""}${t.name}\n${t.headlines.map((h) => `- ${h}`).join("\n")}`)
    .join("\n\n");
  const followed = ordered.filter((t) => t.followed).map((t) => t.name);

  // Actor through-lines: the same actor (org/person) recurring across separate
  // storylines — the cross-references "de rode draad" should draw (F5).
  const actorBlok = actorClusters.length
    ? actorClusters.map((c) => `## ${c.actor}\n${c.items.map((h) => `- ${h}`).join("\n")}`).join("\n\n")
    : "";
  const actorSystem = actorClusters.length
    ? " Meerdere verhaallijnen draaien vandaag om dezelfde speler (organisatie of persoon) — die dwarsverbanden staan onder 'Spelers die vandaag terugkeren'. Benoem ze op spelersniveau ('Anthropic bracht zowel X als Y uit'), niet alleen per onderwerp."
    : "";

  const { data } = await askAIJson<DailyPaperParts>({
    tier: "deep",
    editionId,
    stepId,
    maxTokens: Math.min(1200, policy.solMaxTokens + 600),
    jsonSchema: DAILY_PAPER_SCHEMA as unknown as Record<string, unknown>,
    system:
      "Je bent de eindredacteur van een persoonlijk ochtendrapport, in het Nederlands, zakelijk en neutraal — geen personage, geen 'ik'. " +
      "De krant is opgebouwd als: een korte samenvatting (voorpagina), een introductie, dan de uitgelichte verhaallijnen (die zijn al geschreven), en tot slot één breed-maar-ondiep overzichtsartikel van de rest. Geef terug: " +
      "'summary' — 3-4 zinnen, de dag in het kort voor de voorpagina; " +
      "'intro' — 2-3 zinnen die de dag en de opbouw van de krant inleiden" +
      (followed.length ? `, begin bij wat de lezer volgt (${followed.join(", ")})` : "") +
      "; 'generalHeadline' + 'generalBody' — één overzichtsartikel (2-3 alinea's) van het nieuws dat NIET in de uitgelichte verhaallijnen zit. Verwijs naar de verhaallijnen, herhaal ze niet." +
      actorSystem,
    prompt:
      `Uitgelichte verhaallijnen van vandaag (al uitgeschreven):\n${leadBlok}\n\n` +
      `Alle onderwerpen met nieuws vandaag:\n${topicBlok || "(geen)"}` +
      (actorBlok ? `\n\nSpelers die vandaag terugkeren over meerdere verhaallijnen:\n${actorBlok}` : ""),
  });

  return {
    summary: data.summary.trim(),
    intro: data.intro.trim(),
    generalHeadline: data.generalHeadline.trim(),
    generalBody: data.generalBody.trim(),
  };
}

// ============================================================
// Section intros (Phase 0) — per newspaper section: a one-sentence caption
// (Sol's angle) + a small 2-3 sentence roundup of that category's news.
// ============================================================

const SECTION_INTROS_SCHEMA = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          caption: { type: "string" },
          summary: { type: "string" },
        },
        required: ["title", "caption", "summary"],
        additionalProperties: false,
      },
    },
  },
  required: ["sections"],
  additionalProperties: false,
} as const;

/** Pure: trim section intros and drop entries with no title or no text at all. */
export function cleanSectionIntros(
  raw: { sections?: { title?: string; caption?: string; summary?: string }[] } | null | undefined,
): DailyPaperSection[] {
  return (raw?.sections ?? [])
    .map((s) => ({
      title: (s?.title ?? "").trim(),
      caption: (s?.caption ?? "").trim(),
      summary: (s?.summary ?? "").trim(),
    }))
    .filter((s) => s.title.length > 0 && (s.caption.length > 0 || s.summary.length > 0));
}

/**
 * Writes Sol's per-section editorial text: for each category with news today, a
 * punchy one-sentence caption plus a short roundup summary. One `deep` call,
 * budget-aware ('stop' / no token budget → []). Titles must match the section
 * titles so the krant can line them up.
 */
export async function composeSectionIntros(
  topics: DigestTopic[],
  mode: BudgetMode,
  editionId: string,
  stepId?: string,
): Promise<DailyPaperSection[]> {
  const policy = budgetPolicy[mode];
  const ordered = orderDigestTopics(topics).filter((t) => t.headlines.length > 0);
  if (ordered.length === 0 || policy.solMaxTokens === 0) return [];

  const blok = ordered
    .map((t) => `## ${t.name}\n${t.headlines.map((h) => `- ${h}`).join("\n")}`)
    .join("\n\n");

  const { data } = await askAIJson<{ sections: { title: string; caption: string; summary: string }[] }>({
    tier: "deep",
    editionId,
    stepId,
    maxTokens: Math.min(1600, 200 + ordered.length * 140),
    jsonSchema: SECTION_INTROS_SCHEMA as unknown as Record<string, unknown>,
    system:
      "Je bent de eindredacteur van een persoonlijk ochtendrapport, in het Nederlands, zakelijk en neutraal — geen personage, geen 'ik'. " +
      "Voor ELKE aangeboden sectie schrijf je twee dingen: " +
      "'caption' — één pakkende zin die de kern/insteek van die sectie vandaag vangt; " +
      "'summary' — een kort overzicht van 2-3 zinnen van wat er vandaag in die categorie speelt, dat de losse koppen met elkaar verbindt. " +
      "Gebruik EXACT de aangeboden sectietitel als 'title'. Behandel alleen de aangeboden secties, verzin er geen bij.",
    prompt: `De secties met hun koppen van vandaag:\n\n${blok}`,
  });

  return cleanSectionIntros(data);
}
