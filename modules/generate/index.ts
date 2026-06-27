// Generatie: samenvattingen en deep-dives per sectie.
//
// Budget-bewust: de stap vraagt de modus op en geeft die door; de policy
// bepaalt lengte en aantal deep-dives. In modus 'stop' valt alles terug op
// koppen — er gaat dan geen Claude-call meer uit.

import { askAI, askAIJson } from "../shared/ai";
import { budgetPolicy } from "../shared/budget";
import { config, todayLocal } from "../shared/config";
import { isValidIsoDate } from "../calendar";
import type { BudgetMode, Item, DestepLens, ThreadUpdate, ThreadPrediction, DeepArticle } from "../shared/types";

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
    lead: { type: "string" },
    ripples: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          subhead: { type: "string" },
          text: { type: "string" },
        },
        required: ["subhead", "text"],
        additionalProperties: false,
      },
    },
    newState: { type: "string" },
    lenses: { type: "array", items: { type: "string", enum: LENS_VALUES } },
    prediction: {
      type: "object",
      properties: {
        text: { type: "string" },
        target_date: { type: "string" },
        confidence: { type: "string", enum: ["bevestigd", "verwacht", "gerucht"] },
        source_basis: { type: "string" },
      },
      required: ["text", "target_date", "confidence", "source_basis"],
      additionalProperties: false,
    },
  },
  required: ["headline", "lead", "ripples", "newState", "lenses", "prediction"],
  additionalProperties: false,
} as const;

/**
 * Pure: validate + bound the model's two-layer article. A ripple survives only
 * with both a subtitle and a body; at most 3 are kept (the "≤3 grounded ripples"
 * rule). Lead is always trimmed. Keeps the depth honest without trusting the
 * model to self-limit.
 */
export function cleanArticle(
  raw: { lead?: string; ripples?: { subhead?: string; text?: string }[] } | null | undefined,
): DeepArticle {
  const lead = raw?.lead?.trim() ?? "";
  const ripples = (raw?.ripples ?? [])
    .map((r) => ({ subhead: (r?.subhead ?? "").trim(), text: (r?.text ?? "").trim() }))
    .filter((r) => r.subhead.length > 0 && r.text.length > 0)
    .slice(0, 3);
  return { lead, ripples };
}

/** Pure: flatten a two-layer article to plain text (dashboard card + back-compat). */
export function flattenArticle(article: DeepArticle): string {
  return [article.lead, ...article.ripples.map((r) => `${r.subhead}\n${r.text}`)]
    .filter((s) => s.trim().length > 0)
    .join("\n\n")
    .trim();
}

/**
 * Pure: turn the model's raw prediction object into a stored ThreadPrediction, or
 * null. The discipline lives here, not just in the prompt: a prediction survives
 * only with a non-empty text AND a named source_basis AND a real future date.
 * Anything else (the "no basis" case the prompt is told to signal with blanks) is
 * dropped — no free-floating AI guesses reach the agenda.
 */
export function cleanPrediction(
  raw: { text?: string; target_date?: string; confidence?: string; source_basis?: string } | null | undefined,
  today: string,
): ThreadPrediction | null {
  if (!raw) return null;
  const text = (raw.text ?? "").trim();
  const basis = (raw.source_basis ?? "").trim();
  const date = (raw.target_date ?? "").trim();
  if (!text || !basis) return null;
  if (!isValidIsoDate(date) || date < today) return null;
  const confidence = (["bevestigd", "verwacht", "gerucht"] as const).find((c) => c === raw.confidence) ?? "verwacht";
  return { text, target_date: date, confidence, source_basis: basis };
}

/**
 * Pure: the body text fed to the model for one source item. Prefers the full
 * article body (content), falls back to the short summary, and bounds the length
 * to hold token cost — cutting on a sentence/line boundary near the limit so the
 * model never sees a word sliced in half. Empty body → null.
 */
export function excerptForPrompt(
  content: string | null,
  summary: string | null,
  maxChars: number,
): string | null {
  const body = (content?.trim() || summary?.trim()) ?? null;
  if (!body) return null;
  if (body.length <= maxChars) return body;
  const cut = body.slice(0, maxChars);
  const boundary = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"));
  const trimmed = boundary > maxChars * 0.6 ? cut.slice(0, boundary + 1) : cut;
  return `${trimmed.trim()} […]`;
}

export interface ThreadUpdateInput {
  thread: { title: string; state: string | null };
  /** today's items on this thread — always genuinely new (unique(thread_id,item_id)) */
  newItems: { title: string; summary: string | null; content: string | null; url: string | null }[];
  /** the relevant DESTEP lenses to use (from selectLenses) */
  lenses: DestepLens[];
  /** titles the reader rated highly in this area — reader perspective */
  archivePrimer: string[];
  /** dated events already on this thread — extra grounding for the prediction */
  scheduledEvents: { title: string; date: string; certainty: string }[];
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
      .map((it, i) => {
        const body = excerptForPrompt(it.content, it.summary, config.generate.itemExcerptChars);
        return `${i + 1}. ${it.title}${body ? `\n${body}` : ""}`;
      })
      .join("\n\n") || "(geen losse nieuwe items — duid de algemene ontwikkeling)";
  const primer = input.archivePrimer.length
    ? `De lezer waardeerde eerder in dit onderwerp: ${input.archivePrimer.join("; ")}.`
    : "";
  const eventsBlock = input.scheduledEvents.length
    ? `Reeds geagendeerde gebeurtenissen op deze verhaallijn:\n` +
      input.scheduledEvents.map((e) => `- ${e.date}: ${e.title} (${e.certainty})`).join("\n")
    : "";

  const { data } = await askAIJson<
    ThreadUpdate & { prediction?: Record<string, string>; ripples?: { subhead?: string; text?: string }[] }
  >({
    tier: "deep",
    editionId,
    stepId,
    maxTokens: 1500,
    jsonSchema: THREAD_UPDATE_SCHEMA as unknown as Record<string, unknown>,
    system:
      "Je houdt een doorlopende verhaallijn bij voor een persoonlijk ochtendrapport, in het Nederlands. " +
      "Je krijgt de stand van het verhaal tot nu toe en de volledige nieuwsteksten van vandaag. " +
      "Schrijf het VOLLEDIGE verhaal achter dit onderwerp, in TWEE lagen, en bouw VOORT op de eerdere stand (niet vanaf nul): " +
      "verwijs kort naar wat er eerder speelde en benoem expliciet wat echt nieuw is.\n" +
      "LAAG 1 — 'lead': de feiten. Wat er vandaag gebeurde, mét de harde gegevens (getallen, namen, wie/wat). " +
      "STRIKT op basis van de aangeboden teksten — verzin geen feiten, cijfers, namen of citaten. 1-2 alinea's (4-7 zinnen).\n" +
      "LAAG 2 — 'ripples': de doorwerking. MAXIMAAL 3 gevolgen die je écht kunt onderbouwen met het aangeboden nieuws — " +
      "de economische, politieke en maatschappelijke uitstraling, en de impact op verbonden partijen (andere bedrijven, " +
      "stakeholders, sectoren). Elk gevolg is een object met 'subhead' — een pakkende, nieuws-specifieke subtitel " +
      "(bijvoorbeeld 'Hoe Tesla een deel van de klap opving') — en 'text' (1-2 zinnen geredeneerde analyse). " +
      "Dit is ANALYSE: redeneer over gevolgen, maar verzin geen concrete feiten/cijfers die niet in de bron staan. " +
      "Kun je een gevolg niet onderbouwen? Laat het weg. Liever twee sterke gevolgen dan drie zwakke; bij dun nieuws mag 'ripples' leeg zijn.\n" +
      "'headline': een nieuws-specifieke kop voor deze update. " +
      "'newState': een bondige, bijgewerkte samenvatting van de héle verhaallijn tot nu toe (3-5 zinnen) die de volgende editie als startpunt gebruikt. " +
      "'lenses': de DESTEP-lenzen die je daadwerkelijk gebruikte (subset van de aangeboden). " +
      "'prediction': een korte, concrete vooruitblik (1 zin) MET een streefdatum (YYYY-MM-DD), " +
      "een zekerheid (bevestigd/verwacht/gerucht) en een 'source_basis': benoem letterlijk wélk aangeboden " +
      "nieuwsitem of welke geagendeerde gebeurtenis de voorspelling onderbouwt. " +
      "STRIKT: voorspel ALLEEN op basis van de aangeboden items en geagendeerde gebeurtenissen — verzin niets. " +
      "Heb je geen concrete grond of geen datum? Laat 'text', 'target_date' en 'source_basis' dan LEEG ('').",
    prompt:
      `Verhaallijn: ${input.thread.title}\n` +
      `Stand tot nu toe: ${input.thread.state ?? "(nieuw verhaal — nog geen eerdere stand)"}\n` +
      `Aangeboden lenzen: ${lensList}\n` +
      `Datum vandaag: ${todayLocal()}\n` +
      (primer ? `${primer}\n` : "") +
      (eventsBlock ? `${eventsBlock}\n` : "") +
      `\nWat er vandaag bij komt (volledige teksten):\n${newsBlock}`,
  });

  const article: DeepArticle = cleanArticle(data);
  return {
    headline: data.headline.trim(),
    lead: article.lead,
    ripples: article.ripples,
    newState: data.newState.trim(),
    lenses: data.lenses?.length ? data.lenses : input.lenses,
    prediction: cleanPrediction(data.prediction, todayLocal()),
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
