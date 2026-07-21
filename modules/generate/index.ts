// Generatie: samenvattingen en deep-dives per sectie.
//
// Budget-bewust: de stap vraagt de modus op en geeft die door; de policy
// bepaalt lengte en aantal deep-dives. In modus 'stop' valt alles terug op
// koppen — er gaat dan geen Claude-call meer uit.

import { askAI, askAIJson } from "../shared/ai";
import { budgetPolicy } from "../shared/budget";
import { config, todayLocal } from "../shared/config";
import { isValidIsoDate } from "../calendar";
import { formatGroundingBlock, type Grounding } from "../tavily";
import type {
  BudgetMode,
  Item,
  DestepLens,
  ThreadUpdate,
  ThreadPrediction,
  DeepArticle,
  GroundingSource,
} from "../shared/types";

// Phase 5 — one sentence appended to a deep-research system prompt when web
// grounding is present, so the model treats the snippets as additional source
// under the same no-fabrication discipline as the feed text.
const GROUNDING_RULE =
  "\nJe krijgt mogelijk AANVULLENDE WEBBRONNEN onderaan. Behandel die als geldige bron, " +
  "gelijkwaardig aan de aangeboden nieuwsteksten: gebruik ze om de feiten en de gevolgen " +
  "te onderbouwen. Dezelfde regel blijft gelden — verzin niets dat niet in de aangeboden " +
  "teksten óf deze webbronnen staat.";

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
      // Upper hint for the model; cleanArticle enforces the real cap from
      // config.generate.maxRipples (Phase 4 — richer per topic).
      maxItems: 6,
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
 * with both a subtitle and a body; at most `maxRipples` are kept (Phase 4 raised
 * this from a hard 3, env `GENERATE_MAX_RIPPLES`). Lead is always trimmed. Keeps
 * the depth honest without trusting the model to self-limit.
 */
export function cleanArticle(
  raw: { lead?: string; ripples?: { subhead?: string; text?: string }[] } | null | undefined,
  maxRipples = config.generate.maxRipples,
): DeepArticle {
  const lead = raw?.lead?.trim() ?? "";
  const ripples = (raw?.ripples ?? [])
    .map((r) => ({ subhead: (r?.subhead ?? "").trim(), text: (r?.text ?? "").trim() }))
    .filter((r) => r.subhead.length > 0 && r.text.length > 0)
    .slice(0, maxRipples);
  return { lead, ripples };
}

/**
 * The distinct web sources (Tavily grounding) that fed an article, deduped by
 * URL and stripped to `{title, url}` for storage. Returns undefined when
 * grounding was off or empty, so callers can omit the field entirely (the
 * "+N extra bronnen via Tavily" cijfers row stays hidden until real grounding
 * exists — matches the brandbook's never-stub rule).
 */
export function groundingSourcesFrom(grounding?: Grounding): GroundingSource[] | undefined {
  if (!grounding || grounding.snippets.length === 0) return undefined;
  const seen = new Set<string>();
  const out: GroundingSource[] = [];
  for (const s of grounding.snippets) {
    if (!s.url || seen.has(s.url)) continue;
    seen.add(s.url);
    out.push({ title: s.title, url: s.url });
  }
  return out.length ? out : undefined;
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
  /** Phase 5 — web-search snippets to ground the article; omit/empty = none */
  grounding?: Grounding;
  /** Phase D3 — when this thread is a storyline, its facet + parent umbrella, so the update is framed to the facet ("names each storyline"); omit for flat threads/umbrellas */
  storyline?: { umbrella: string; facet: string };
  /**
   * Research Tracking PRD, Phase 3 — true when this thread originated from a
   * research note (detected via `user_research.thread_id`, never matching
   * code). Combined with `thread.state == null` (its first update), the
   * prompt opens with "sinds jouw onderzoek" framing. Omit for ordinary
   * threads.
   */
  researchOrigin?: boolean;
}

/**
 * Pure (Phase D3): the one-line prompt frame that names a storyline within its
 * umbrella, or "" for a flat thread/umbrella. Keeps generateThreadUpdate's prompt
 * assembly testable without an AI call.
 */
export function storylineFraming(storyline?: { umbrella: string; facet: string }): string {
  if (!storyline) return "";
  const facet = storyline.facet.trim();
  const umbrella = storyline.umbrella.trim();
  if (!facet || !umbrella) return "";
  return `Dit is de verhaallijn '${facet}' binnen het grote verhaal '${umbrella}'; schrijf de update toegespitst op deze facet.\n`;
}

/**
 * Research Tracking PRD, Phase 3 — the one-line prompt frame for a
 * research-origin thread's FIRST update, so it reads as "sinds jouw
 * onderzoek" instead of a cold restart. Pure: the caller supplies both
 * signals — `isResearchOrigin` (detected via `user_research.thread_id`, never
 * matching code) and `isFirstUpdate` (the same `thread.state == null` signal
 * generateThreadUpdate's prompt already uses for "new thread"). "" once
 * either is false, so only the note's very first update carries the framing —
 * later updates read like any other followed thread.
 */
export function researchOriginFraming(isResearchOrigin: boolean, isFirstUpdate: boolean): string {
  if (!isResearchOrigin || !isFirstUpdate) return "";
  return (
    "Deze verhaallijn komt voort uit onderzoek dat de lezer zelf heeft aangedragen en krijgt nu " +
    "zijn allereerste update; open de 'lead' met een verwijzing naar dat onderzoek " +
    "(bijvoorbeeld \"Sinds jouw onderzoek naar ...\") voordat je het nieuwe nieuws behandelt.\n"
  );
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
  const groundingBlock = input.grounding ? formatGroundingBlock(input.grounding) : "";

  const { data } = await askAIJson<
    ThreadUpdate & { prediction?: Record<string, string>; ripples?: { subhead?: string; text?: string }[] }
  >({
    tier: "deep",
    editionId,
    stepId,
    maxTokens: config.generate.threadUpdateMaxTokens,
    jsonSchema: THREAD_UPDATE_SCHEMA as unknown as Record<string, unknown>,
    system:
      "Je houdt een doorlopende verhaallijn bij voor een persoonlijk ochtendrapport, in het Nederlands. " +
      "Je krijgt de stand van het verhaal tot nu toe en de volledige nieuwsteksten van vandaag. " +
      "Schrijf het VOLLEDIGE verhaal achter dit onderwerp, in TWEE lagen, en bouw VOORT op de eerdere stand (niet vanaf nul): " +
      "verwijs kort naar wat er eerder speelde en benoem expliciet wat echt nieuw is.\n" +
      "LAAG 1 — 'lead': de feiten. Wat er vandaag gebeurde, mét de harde gegevens (getallen, namen, wie/wat). " +
      "STRIKT op basis van de aangeboden teksten — verzin geen feiten, cijfers, namen of citaten. 2-3 alinea's (6-10 zinnen).\n" +
      `LAAG 2 — 'ripples': de doorwerking. MAXIMAAL ${config.generate.maxRipples} gevolgen die je écht kunt onderbouwen met het aangeboden nieuws — ` +
      "de economische, politieke en maatschappelijke uitstraling, en de impact op verbonden partijen (andere bedrijven, " +
      "stakeholders, sectoren). Elk gevolg is een object met 'subhead' — een pakkende, nieuws-specifieke subtitel " +
      "(bijvoorbeeld 'Hoe Tesla een deel van de klap opving') — en 'text' (1-2 zinnen geredeneerde analyse). " +
      "Dit is ANALYSE: redeneer over gevolgen, maar verzin geen concrete feiten/cijfers die niet in de bron staan. " +
      "Kun je een gevolg niet onderbouwen? Laat het weg. Liever een paar sterke gevolgen dan veel zwakke; bij dun nieuws mag 'ripples' leeg zijn.\n" +
      "'headline': een nieuws-specifieke kop voor deze update. " +
      "'newState': een bondige, bijgewerkte samenvatting van de héle verhaallijn tot nu toe (3-5 zinnen) die de volgende editie als startpunt gebruikt. " +
      "'lenses': de DESTEP-lenzen die je daadwerkelijk gebruikte (subset van de aangeboden). " +
      "'prediction': een korte, concrete vooruitblik (1 zin) MET een streefdatum (YYYY-MM-DD), " +
      "een zekerheid (bevestigd/verwacht/gerucht) en een 'source_basis': benoem letterlijk wélk aangeboden " +
      "nieuwsitem of welke geagendeerde gebeurtenis de voorspelling onderbouwt. " +
      "STRIKT: voorspel ALLEEN op basis van de aangeboden items en geagendeerde gebeurtenissen — verzin niets. " +
      "Heb je geen concrete grond of geen datum? Laat 'text', 'target_date' en 'source_basis' dan LEEG ('')." +
      (groundingBlock ? GROUNDING_RULE : ""),
    prompt:
      researchOriginFraming(!!input.researchOrigin, input.thread.state == null) +
      storylineFraming(input.storyline) +
      `Verhaallijn: ${input.thread.title}\n` +
      `Stand tot nu toe: ${input.thread.state ?? "(nieuw verhaal — nog geen eerdere stand)"}\n` +
      `Aangeboden lenzen: ${lensList}\n` +
      `Datum vandaag: ${todayLocal()}\n` +
      (primer ? `${primer}\n` : "") +
      (eventsBlock ? `${eventsBlock}\n` : "") +
      `\nWat er vandaag bij komt (volledige teksten):\n${newsBlock}` +
      (groundingBlock ? `\n\n${groundingBlock}` : ""),
  });

  const article: DeepArticle = cleanArticle(data);
  const groundingSources = groundingSourcesFrom(input.grounding);
  return {
    headline: data.headline.trim(),
    lead: article.lead,
    ripples: article.ripples,
    ...(groundingSources ? { groundingSources } : {}),
    newState: data.newState.trim(),
    lenses: data.lenses?.length ? data.lenses : input.lenses,
    prediction: cleanPrediction(data.prediction, todayLocal()),
  };
}

const DEEP_ARTICLE_SCHEMA = {
  type: "object",
  properties: {
    lead: { type: "string" },
    ripples: {
      type: "array",
      maxItems: 6,
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
  },
  required: ["lead", "ripples"],
  additionalProperties: false,
} as const;

/**
 * Deep research for one non-storyline topband item: the SAME two-layer article
 * (facts lead + grounded ripples) as a thread update, but for a single fresh
 * item with no prior state and no prediction. Phase 4 unified the deep path so
 * every deep topic — storyline or one-off — gets the full-story treatment
 * instead of the old shallow single-paragraph deep-dive. `deep` tier,
 * budget-gated exactly like the thread update (null in 'stop'/'minimaal').
 */
export async function deepArticle(
  item: Item,
  mode: BudgetMode,
  editionId: string,
  stepId?: string,
  grounding?: Grounding,
): Promise<DeepArticle | null> {
  if (budgetPolicy[mode].deepDivesPerSectie === 0) return null;

  const body = excerptForPrompt(item.content, item.raw_summary, config.generate.itemExcerptChars);
  const groundingBlock = grounding ? formatGroundingBlock(grounding) : "";

  const { data } = await askAIJson<{ lead?: string; ripples?: { subhead?: string; text?: string }[] }>({
    tier: "deep",
    editionId,
    stepId,
    maxTokens: config.generate.threadUpdateMaxTokens,
    jsonSchema: DEEP_ARTICLE_SCHEMA as unknown as Record<string, unknown>,
    system:
      "Je schrijft het VOLLEDIGE verhaal achter het belangrijkste nieuws van de dag voor een persoonlijk " +
      "ochtendrapport, in het Nederlands, in TWEE lagen.\n" +
      "LAAG 1 — 'lead': de feiten. Wat er gebeurde, mét de harde gegevens (getallen, namen, wie/wat). " +
      "STRIKT op basis van de aangeboden tekst — verzin geen feiten, cijfers, namen of citaten. 2-3 alinea's (6-10 zinnen).\n" +
      `LAAG 2 — 'ripples': de doorwerking. MAXIMAAL ${config.generate.maxRipples} gevolgen die je écht kunt onderbouwen — ` +
      "de economische, politieke en maatschappelijke uitstraling, en de impact op verbonden partijen (andere bedrijven, " +
      "stakeholders, sectoren). Elk gevolg is een object met 'subhead' — een pakkende, nieuws-specifieke subtitel — " +
      "en 'text' (1-2 zinnen geredeneerde analyse). Dit is ANALYSE: redeneer over gevolgen, maar verzin geen concrete " +
      "feiten/cijfers die niet in de bron staan. Kun je een gevolg niet onderbouwen? Laat het weg. Liever een paar sterke " +
      "gevolgen dan veel zwakke; bij dun nieuws mag 'ripples' leeg zijn." +
      (groundingBlock ? GROUNDING_RULE : ""),
    prompt:
      `${item.title}\n\n${body ?? item.raw_summary ?? ""}\n\nBron-URL: ${item.url ?? "onbekend"}` +
      (groundingBlock ? `\n\n${groundingBlock}` : ""),
  });

  const article = cleanArticle(data);
  const groundingSources = groundingSourcesFrom(grounding);
  return groundingSources ? { ...article, groundingSources } : article;
}
