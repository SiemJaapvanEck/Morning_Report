// Generatie: samenvattingen en deep-dives per sectie.
//
// Budget-bewust: de stap vraagt de modus op en geeft die door; de policy
// bepaalt lengte en aantal deep-dives. In modus 'stop' valt alles terug op
// koppen — er gaat dan geen Claude-call meer uit.

import { askClaude } from "../shared/claude";
import { budgetPolicy } from "../shared/budget";
import type { BudgetMode, Item } from "../shared/types";

export interface GeneratedSummary {
  itemId: string;
  text: string;
}

/**
 * Samenvattingen voor de summary-band van één sectie: één call voor de hele
 * batch (goedkoper en consistenter dan per item).
 */
export async function summarizeSection(
  sectionTitle: string,
  items: Item[],
  mode: BudgetMode,
  editionId: string,
  stepId?: string,
): Promise<GeneratedSummary[]> {
  const policy = budgetPolicy[mode];
  if (items.length === 0 || policy.samenvattingMaxTokens === 0) return [];

  const lijst = items
    .map((item, i) => `${i}. ${item.title}\n${item.raw_summary?.slice(0, 300) ?? "(geen beschrijving)"}`)
    .join("\n\n");

  const result = await askClaude({
    tier: "scan",
    editionId,
    stepId,
    maxTokens: Math.min(4000, items.length * policy.samenvattingMaxTokens),
    system:
      "Je schrijft beknopte nieuwssamenvattingen in het Nederlands voor een persoonlijk ochtendrapport. " +
      "Per item: 2-3 zinnen, feitelijk, geen clickbait-taal overnemen. " +
      `Antwoord als genummerde lijst die exact de invoer-nummers volgt (0., 1., ...).`,
    prompt: `Sectie: ${sectionTitle}\n\nVat deze items samen:\n\n${lijst}`,
  });

  // Genummerde lijst terug-parsen naar items
  const summaries: GeneratedSummary[] = [];
  const blokken = result.text.split(/^\s*(\d+)\.\s*/m).slice(1);
  for (let i = 0; i < blokken.length - 1; i += 2) {
    const index = Number(blokken[i]);
    const item = items[index];
    if (item) summaries.push({ itemId: item.id, text: blokken[i + 1].trim() });
  }
  return summaries;
}

/** Deep-dive voor één topband-item: langere duiding via het sterke model. */
export async function deepDive(
  item: Item,
  mode: BudgetMode,
  editionId: string,
  stepId?: string,
): Promise<string | null> {
  const policy = budgetPolicy[mode];
  if (policy.deepDivesPerSectie === 0) return null;

  const result = await askClaude({
    tier: "deep",
    editionId,
    stepId,
    maxTokens: 600,
    system:
      "Je schrijft de duiding bij het belangrijkste nieuws van de dag voor een persoonlijk ochtendrapport, " +
      "in het Nederlands. Geef context: waarom dit ertoe doet, wat eraan voorafging, wat te verwachten. " +
      "Lengte: één strakke alinea van 4-6 zinnen. Geen kop, geen opsomming.",
    prompt: `${item.title}\n\n${item.raw_summary ?? ""}\n\nBron-URL: ${item.url ?? "onbekend"}`,
  });

  return result.text.trim();
}
