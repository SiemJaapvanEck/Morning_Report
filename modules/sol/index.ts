// Sol — de redactionele persoonlijkheid.
//
// v1 (verticale plak): karakter uit promptbestand + intro op de voorpagina.
// Fase 6 bouwt hierop verder: geheugen + compactie, notitiebelletjes,
// karakterevolutie. De geheugentabellen (sol_memory, sol_notes) bestaan al.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { askClaude } from "../shared/claude";
import { budgetPolicy } from "../shared/budget";
import { db, unwrap } from "../shared/db";
import type { BudgetMode, SolMemory } from "../shared/types";

/** Karakterprompt is config: tunen zonder code aan te raken. */
export async function loadKarakter(): Promise<string> {
  const path = join(process.cwd(), "modules", "sol", "prompts", "karakter.md");
  return readFile(path, "utf-8");
}

/** Recente, niet-gecompacteerde herinneringen voor de context. */
export async function loadMemory(profileId: string, limit = 20): Promise<SolMemory[]> {
  return unwrap(
    await db()
      .from("sol_memory")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

/** Sol's intro voor de voorpagina van een editie. */
export async function writeIntro(
  profileId: string,
  editionId: string,
  topItems: { title: string; sectionTitle: string }[],
  stepId?: string,
  mode: BudgetMode = "vol",
): Promise<string | null> {
  const policy = budgetPolicy[mode];
  if (policy.solMaxTokens === 0) return null;

  const karakter = await loadKarakter();
  const memory = await loadMemory(profileId);
  const geheugenBlok =
    memory.length > 0
      ? `\n\nJe herinneringen (context, niet citeren):\n${memory.map((m) => `- ${m.content}`).join("\n")}`
      : "";

  const kopLijst = topItems.map((t) => `- [${t.sectionTitle}] ${t.title}`).join("\n");

  const result = await askClaude({
    tier: "deep",
    editionId,
    stepId,
    maxTokens: policy.solMaxTokens,
    system: karakter + geheugenBlok,
    prompt:
      `Dit zijn de topitems van de editie van vandaag:\n\n${kopLijst}\n\n` +
      `Schrijf je intro voor de voorpagina (3-5 zinnen).`,
  });

  return result.text.trim();
}
