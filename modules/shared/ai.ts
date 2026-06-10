// AI-router: hét enige aanspreekpunt voor taalmodel-calls in het platform.
//
// Elke call loopt hierdoorheen zodat tokens en kosten in usage_log komen —
// daar leunt de budget-guard op. De provider is config (AI_PROVIDER):
//   - "xai"       → Grok via de OpenAI-compatibele xAI-API (actief "voor nu")
//   - "anthropic" → Claude via de Anthropic SDK
// Call-sites kennen alleen askAI/askAIJson en het tier-onderscheid scan/deep.

import { config, costEur } from "./config";
import { db } from "./db";

export interface AskOptions {
  /** 'scan' (goedkoop, classificatie) of 'deep' (sterker, generatie) */
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

async function logUsage(
  opts: AskOptions,
  model: string,
  inputTokens: number,
  outputTokens: number,
): Promise<number> {
  const cost = costEur(model, inputTokens, outputTokens);
  await db().from("usage_log").insert({
    edition_id: opts.editionId,
    step_id: opts.stepId ?? null,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_eur: cost,
  });
  return cost;
}

// ============================================================
// Provider: xAI (Grok) — OpenAI-compatibele chat completions
// ============================================================

async function askXai(opts: AskOptions, model: string): Promise<AskResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY ontbreekt — zie docs/setup.md");

  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens,
    messages: [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      { role: "user", content: opts.prompt },
    ],
  };
  if (opts.jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: "antwoord", strict: true, schema: opts.jsonSchema },
    };
  }

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`xAI: HTTP ${response.status} ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string | null } }[];
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  const text = data.choices[0]?.message?.content ?? "";
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;
  const cost = await logUsage(opts, model, inputTokens, outputTokens);

  return { text, inputTokens, outputTokens, costEur: cost };
}

// ============================================================
// Provider: Anthropic (Claude)
// ============================================================

async function askAnthropic(opts: AskOptions, model: string): Promise<AskResult> {
  // import hier zodat de SDK alleen laadt als de provider actief is
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY ontbreekt — zie docs/setup.md");
  }
  const client = new Anthropic();

  const response = await client.messages.create({
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
  const cost = await logUsage(opts, model, inputTokens, outputTokens);

  return { text, inputTokens, outputTokens, costEur: cost };
}

// ============================================================
// Router
// ============================================================

export async function askAI(opts: AskOptions): Promise<AskResult> {
  const model = opts.tier === "scan" ? config.models.scan : config.models.deep;
  if (config.provider === "xai") return askXai(opts, model);
  return askAnthropic(opts, model);
}

/** askAI + JSON.parse, voor structured-output-calls. */
export async function askAIJson<T>(opts: AskOptions): Promise<{ data: T } & AskResult> {
  const result = await askAI(opts);
  return { ...result, data: JSON.parse(result.text) as T };
}
