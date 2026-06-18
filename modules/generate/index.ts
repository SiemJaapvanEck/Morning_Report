// Generatie: samenvattingen en deep-dives per sectie.
//
// Budget-bewust: de stap vraagt de modus op en geeft die door; de policy
// bepaalt lengte en aantal deep-dives. In modus 'stop' valt alles terug op
// koppen — er gaat dan geen Claude-call meer uit.

import { askAI, askAIJson } from "../shared/ai";
import { budgetPolicy } from "../shared/budget";
import type { BudgetMode, Item, DestepLens, ThreadUpdate } from "../shared/types";

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

  const result = await askAI({
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

// ============================================================
// Thread-aware generation — an UPDATE that builds on stored state
// ============================================================

const LENS_VALUES: DestepLens[] = [
  "economisch", "technologisch", "politiek", "sociaal", "ecologisch", "demografisch",
];

const THREAD_UPDATE_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    body: { type: "string" },
    newState: { type: "string" },
    lenses: { type: "array", items: { type: "string", enum: LENS_VALUES } },
  },
  required: ["headline", "body", "newState", "lenses"],
  additionalProperties: false,
} as const;

export interface ThreadUpdateInput {
  thread: { title: string; state: string | null };
  /** today's items on this thread — always genuinely new (unique(thread_id,item_id)) */
  newItems: { title: string; summary: string | null; url: string | null }[];
  /** the relevant DESTEP lenses to use (from selectLenses) */
  lenses: DestepLens[];
  /** titles the reader rated highly in this area — reader perspective */
  archivePrimer: string[];
}

/**
 * Writes the next instalment of a persistent storyline: an UPDATE that builds on
 * the thread's stored state instead of a from-scratch article, and returns the
 * rewritten state for the next edition. `deep` tier, budget-gated exactly like
 * deepDive (null in 'stop'). Because the delta builds on stored state, prompts
 * stay short as a thread ages — that is what holds the per-edition budget.
 */
export async function generateThreadUpdate(
  input: ThreadUpdateInput,
  mode: BudgetMode,
  editionId: string,
  stepId?: string,
): Promise<ThreadUpdate | null> {
  if (budgetPolicy[mode].deepDivesPerSectie === 0) return null;

  const lensList = input.lenses.join(", ") || "sociaal";
  const newsBlock =
    input.newItems
      .map((it, i) => `${i + 1}. ${it.title}${it.summary ? ` — ${it.summary.slice(0, 200)}` : ""}`)
      .join("\n") || "(geen losse nieuwe items — duid de algemene ontwikkeling)";
  const primer = input.archivePrimer.length
    ? `De lezer waardeerde eerder in dit onderwerp: ${input.archivePrimer.join("; ")}.`
    : "";

  const { data } = await askAIJson<ThreadUpdate>({
    tier: "deep",
    editionId,
    stepId,
    maxTokens: 900,
    jsonSchema: THREAD_UPDATE_SCHEMA as unknown as Record<string, unknown>,
    system:
      "Je houdt een doorlopende verhaallijn bij voor een persoonlijk ochtendrapport, in het Nederlands. " +
      "Je krijgt de stand van het verhaal tot nu toe en wat er vandaag bij komt. " +
      "Schrijf een UPDATE die hierop VOORTBOUWT — niet opnieuw vanaf nul: verwijs kort naar wat er eerder speelde en benoem expliciet wat echt nieuw is. " +
      "Gebruik alleen de aangeboden DESTEP-lenzen als invalshoek, en koppel aan beurs-/marktimpact waar dat relevant is. " +
      "'body': 1-2 strakke alinea's (4-8 zinnen), feitelijk, geen kop in de tekst zelf. " +
      "'headline': een nieuws-specifieke kop voor deze update. " +
      "'newState': een bondige, bijgewerkte samenvatting van de héle verhaallijn tot nu toe (3-5 zinnen) die de volgende editie als startpunt gebruikt. " +
      "'lenses': de lenzen die je daadwerkelijk gebruikte (subset van de aangeboden).",
    prompt:
      `Verhaallijn: ${input.thread.title}\n` +
      `Stand tot nu toe: ${input.thread.state ?? "(nieuw verhaal — nog geen eerdere stand)"}\n` +
      `Aangeboden lenzen: ${lensList}\n` +
      (primer ? `${primer}\n` : "") +
      `\nWat er vandaag bij komt:\n${newsBlock}`,
  });

  return {
    headline: data.headline.trim(),
    body: data.body.trim(),
    newState: data.newState.trim(),
    lenses: data.lenses?.length ? data.lenses : input.lenses,
  };
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

  const result = await askAI({
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
