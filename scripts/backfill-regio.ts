// Eenmalige backfill: zet scan_meta.regio op recente items die nog geen regio
// hebben (gescand vóór de wereldkaart-feature). Gebruikt het goedkope scan-model
// — alleen regio, importance/topic/is_ad blijven ongemoeid. Idempotent: items
// die al een regio hebben worden overgeslagen.
//
// Draaien:  node --env-file=.env.local --import tsx scripts/backfill-regio.ts [urenTerug]
// Daarna nog editions.front_page.regios herberekenen (los SQL-stapje).

import { db, unwrap } from "../modules/shared/db";
import { askAIJson } from "../modules/shared/ai";
import { REGIO_CODES, REGIO_GEEN, REGIO_NAAM, isRegioCode } from "../modules/shared/regios";

const REGIO_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          regio: { type: "string", enum: [...REGIO_CODES, REGIO_GEEN] },
        },
        required: ["index", "regio"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

interface ItemRow {
  id: string;
  title: string;
  raw_summary: string | null;
  scan_meta: Record<string, unknown> | null;
}

async function main() {
  const urenTerug = Number(process.argv[2] ?? "48");
  const cutoff = new Date(Date.now() - urenTerug * 3600 * 1000).toISOString();

  const rows = unwrap(
    await db()
      .from("items")
      .select("id, title, raw_summary, scan_meta")
      .gte("fetched_at", cutoff)
      .not("importance", "is", null)
      .order("published_at", { ascending: false })
      .limit(500),
  ) as ItemRow[];

  const todo = rows.filter((r) => !(r.scan_meta && typeof r.scan_meta === "object" && "regio" in r.scan_meta));
  console.log(`Recente items (laatste ${urenTerug}u): ${rows.length}, nog zonder regio: ${todo.length}`);
  if (todo.length === 0) {
    console.log("Niets te doen.");
    return;
  }

  let getagd = 0;
  const telling: Record<string, number> = {};

  for (let i = 0; i < todo.length; i += 25) {
    const batch = todo.slice(i, i + 25);
    const lijst = batch
      .map((it, j) => `${j}. ${it.title}${it.raw_summary ? ` — ${it.raw_summary.slice(0, 150)}` : ""}`)
      .join("\n");

    const { data } = await askAIJson<{ items: { index: number; regio: string }[] }>({
      tier: "scan",
      editionId: null,
      maxTokens: 1500,
      jsonSchema: REGIO_SCHEMA as unknown as Record<string, unknown>,
      system:
        "Je bepaalt per nieuwsitem de wereldregio waar het nieuws over gáát (niet de bron): " +
        REGIO_CODES.map((c) => `${c}=${REGIO_NAAM[c]}`).join(", ") +
        `. Nederland valt onder eu. Gebruik "${REGIO_GEEN}" als er geen duidelijke geografische plek is.`,
      prompt: `Bepaal de regio per item:\n\n${lijst}`,
    });

    for (const v of data.items) {
      const item = batch[v.index];
      if (!item) continue;
      const regio = isRegioCode(v.regio) ? v.regio : REGIO_GEEN;
      const merged = { ...(item.scan_meta ?? {}), regio };
      const { error } = await db().from("items").update({ scan_meta: merged }).eq("id", item.id);
      if (error) throw new Error(`Update ${item.id}: ${error.message}`);
      getagd++;
      if (regio !== REGIO_GEEN) telling[regio] = (telling[regio] ?? 0) + 1;
    }
    console.log(`  batch ${Math.floor(i / 25) + 1}: ${batch.length} items getagd`);
  }

  console.log(`Klaar: ${getagd} items getagd. Verdeling per regio:`, telling);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
