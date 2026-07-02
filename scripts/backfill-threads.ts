// Throwaway 5c-1 backfill: add entities to the entity-less window days
// (June 13-15 predate Phase 2), then run the threads step across June 13->17 in
// date order so storylines link across days and the Iran mega-thread forms.
// Run: node --env-file=.env.local --import tsx scripts/backfill-threads.ts
import { scanBatch } from "../modules/rank";
import { stepRegistry } from "../modules/pipeline/steps";
import { db, unwrap } from "../modules/shared/db";
import type { Edition, Item, PipelineStep } from "../modules/shared/types";

const PROFILE = "ec194dfb-0725-4ff0-bb7c-e8e3a2091786"; // Siem
const RESCAN = ["2026-06-13", "2026-06-14", "2026-06-15"];
const RUN = ["2026-06-13", "2026-06-14", "2026-06-15", "2026-06-16", "2026-06-17"];

async function editionByDate(date: string): Promise<Edition | null> {
  return (await db().from("editions").select("*").eq("profile_id", PROFILE).eq("date", date).maybeSingle())
    .data as Edition | null;
}

async function rescan(edition: Edition): Promise<number> {
  const rows = unwrap(
    await db().from("edition_items").select("items(*)").eq("edition_id", edition.id),
  ) as unknown as { items: Item | null }[];
  const items = rows
    .map((r) => r.items)
    .filter((i): i is Item => !!i && !((i.scan_meta as { entities?: string[] } | null)?.entities?.length));
  if (items.length === 0) return 0;

  const stepRow = (await db()
    .from("pipeline_steps")
    .select("id")
    .eq("edition_id", edition.id)
    .eq("kind", "scan_rank")
    .limit(1)
    .maybeSingle()).data as { id: string } | null;

  let updated = 0;
  for (let i = 0; i < items.length; i += 40) {
    const batch = items.slice(i, i + 40);
    const verdicts = await scanBatch(batch, edition.id, stepRow?.id, []);
    for (const [itemId, v] of verdicts) {
      const existing = (batch.find((b) => b.id === itemId)?.scan_meta ?? {}) as Record<string, unknown>;
      await db().from("items").update({ scan_meta: { ...existing, entities: v.entities } }).eq("id", itemId);
      updated++;
    }
  }
  return updated;
}

async function main() {
  console.log("Re-scanning entity-less days for entities:");
  for (const d of RESCAN) {
    const e = await editionByDate(d);
    if (e) console.log(`  ${d}: +${await rescan(e)} items`);
  }

  console.log("\nRunning threads step in date order:");
  for (const d of RUN) {
    const e = await editionByDate(d);
    if (!e) continue;
    const step = { id: "backfill", edition_id: e.id, kind: "threads", payload: {} } as unknown as PipelineStep;
    console.log(`  ${d}:`, await stepRegistry.threads({ edition: e, step }));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
