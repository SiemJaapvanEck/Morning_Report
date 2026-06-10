// Claude-client met ingebouwde usage-logging.
//
// Alle Claude-verkeer in het hele platform loopt door askClaude() — dat is de
// enige plek waar tokens worden geteld en kosten worden gelogd, zodat de
// budget-guard altijd een compleet beeld heeft.

import Anthropic from "@anthropic-ai/sdk";
import { config, costEur } from "./config";
import { db } from "./db";

let anthropic: Anthropic | null = null;

function client(): Anthropic {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY ontbreekt — zie docs/setup.md");
    }
    anthropic = new Anthropic();
  }
  return anthropic;
}

export interface AskOptions {
  /** 'scan' (Haiku, goedkoop) of 'deep' (Sonnet, sterker) */
  tier: "scan" | "deep";
  system?: string;
  prompt: string;
  maxTokens: number;
  /** JSON-schema voor structured output (classificatie e.d.) */
  jsonSchema?: Record<string, unknown>;
  /** Voor usage-logging; null bij calls buiten een editie om */
  editionId: string | null;
  stepId?: string | null;
}

export interface AskResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costEur: number;
}

export async function askClaude(opts: AskOptions): Promise<AskResult> {
  const model = opts.tier === "scan" ? config.models.scan : config.models.deep;

  const response = await client().messages.create({
    model,
    max_tokens: opts.maxTokens,
    ...(opts.system ? { system: opts.system } : {}),
    ...(opts.jsonSchema
      ? { output_config: { format: { type: "json_schema" as const, schema: opts.jsonSchema } } }
      : {}),
    messages: [{ role: "user", content: opts.prompt }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const cost = costEur(model, inputTokens, outputTokens);

  await db().from("usage_log").insert({
    edition_id: opts.editionId,
    step_id: opts.stepId ?? null,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_eur: cost,
  });

  return { text, inputTokens, outputTokens, costEur: cost };
}

/** askClaude + JSON.parse, voor structured-output-calls. */
export async function askClaudeJson<T>(opts: AskOptions): Promise<{ data: T } & AskResult> {
  const result = await askClaude(opts);
  return { ...result, data: JSON.parse(result.text) as T };
}
