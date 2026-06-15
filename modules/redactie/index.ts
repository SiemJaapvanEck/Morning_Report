// De redactie: vakredacteuren per beat als persona-prompts + bounded askAI-calls.
//
// Geen agent-runtime — elke redacteur is config (modules/redactie/prompts/*.md) +
// één gegenereerde beat-samenvatting per editie. Sol (modules/sol) is
// hoofdredacteur en stelt de Daily Paper samen uit deze samenvattingen. De
// desk→categorie-map is config zodat hij makkelijk te herzien is.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { askAI } from "../shared/ai";
import { budgetPolicy } from "../shared/budget";
import { db, unwrap } from "../shared/db";
import type { BudgetMode } from "../shared/types";

export interface Desk {
  /** stabiele sleutel (komt in het stap-result en front_page.desks) */
  id: string;
  naam: string;
  /** categorie-slugs die deze desk dekt; leeg = persoonlijke (cross-categorie) desk */
  categories: string[];
  promptFile: string;
  /** de persoonlijke redacteur: items komen van de voorkeuren, niet van een categorie */
  personal?: boolean;
}

/** De vaste redactie. Volgorde = volgorde in de Daily Paper. Map is tunebaar. */
export const DESKS: Desk[] = [
  { id: "tech", naam: "Tech & Wetenschap", categories: ["tech", "wetenschap", "frontier"], promptFile: "tech-wetenschap.md" },
  { id: "wereld", naam: "Politiek & Wereld", categories: ["wereld"], promptFile: "politiek-wereld.md" },
  { id: "financieel", naam: "Financieel", categories: ["financieel"], promptFile: "financieel.md" },
  { id: "journalist", naam: "Algemeen", categories: ["games", "lokaal", "goed-nieuws"], promptFile: "journalist.md" },
  { id: "persoonlijk", naam: "Voor jou", categories: [], promptFile: "persoonlijk.md", personal: true },
];

/** Welke desk dekt deze categorie-slug? (null = geen vaste desk) */
export function deskForCategory(slug: string): Desk | null {
  return DESKS.find((d) => !d.personal && d.categories.includes(slug)) ?? null;
}

async function loadPersona(file: string): Promise<string> {
  return readFile(join(process.cwd(), "modules", "redactie", "prompts", file), "utf-8");
}

// ============================================================
// Cross-referentie-context (axis A: voorkeuren) — wordt in fase 2 uitgebreid
// met eerder nieuws (B) en portefeuille (C).
// ============================================================

export interface UserContext {
  /** namen van onderwerpen/categorieën die de lezer actief volgt (follow_marks) */
  follows: string[];
  /** topic_id's die de lezer volgt — om items te markeren */
  followedTopicIds: Set<string>;
  /** category_id's die de lezer volgt */
  followedCategoryIds: Set<string>;
}

/**
 * Verzamelt de cross-ref-context voor een profiel: wat volgt de lezer actief.
 * Leeg als er niets gevolgd wordt (no-op, geen fout).
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
// Beat-samenvatting
// ============================================================

export interface DeskItem {
  title: string;
  summary: string | null;
  categorie: string;
  bron: string | null;
  /** volgt de lezer dit item-onderwerp? (cross-ref axis A) */
  gevolgd?: boolean;
}

/**
 * Eén beat-samenvatting in de stem van de redacteur. Eén deep-call per desk.
 * Budget-bewust (modus 'stop' → geen call). Gevolgde items krijgen een ★ mee
 * zodat de redacteur ze expliciet kan benoemen.
 */
export async function writeDeskSummary(
  desk: Desk,
  items: DeskItem[],
  context: UserContext,
  mode: BudgetMode,
  editionId: string,
  stepId?: string,
): Promise<string | null> {
  const policy = budgetPolicy[mode];
  if (items.length === 0 || policy.solMaxTokens === 0) return null;

  const persona = await loadPersona(desk.promptFile);
  const lijst = items
    .slice(0, 14)
    .map((it, i) => `${i + 1}. ${it.gevolgd ? "★ " : ""}[${it.categorie}] ${it.title}${it.summary ? ` — ${it.summary.slice(0, 200)}` : ""}`)
    .join("\n");

  const volgBlok =
    context.follows.length > 0
      ? `\n\nDe lezer volgt actief: ${context.follows.join(", ")}. Items met ★ raken een gevolgd onderwerp — benoem die kort expliciet.`
      : "";

  const result = await askAI({
    tier: "deep",
    editionId,
    stepId,
    maxTokens: Math.min(500, policy.solMaxTokens),
    system: persona + volgBlok,
    prompt:
      `De items van jouw beat vandaag:\n\n${lijst}\n\n` +
      `Schrijf je beat-samenvatting (3-5 zinnen): wat speelde er, wat is het ` +
      `belangrijkst, en waarom. Geen opsomming, lopende tekst in jouw stem.`,
  });
  return result.text.trim();
}
