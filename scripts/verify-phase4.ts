// Throwaway Phase 4 verification: clear summary_text on the thread-linked deep
// items of an edition, run the real `generate` handler until done, and check
// that thread UPDATES are produced (state + title advance) and it's idempotent.
// Run: node --env-file=.env.local --import tsx scripts/verify-phase4.ts
import { stepRegistry } from "../modules/pipeline/steps";
import { db, unwrap } from "../modules/shared/db";
import type { Edition, PipelineStep } from "../modules/shared/types";

const PROFILE = "ec194dfb-0725-4ff0-bb7c-e8e3a2091786"; // Siem
const EDITION_DATE = process.env.VERIFY_DATE ?? "2026-06-17";

async function runGenerate(edition: Edition, step: PipelineStep): Promise<number> {
  let round = 0;
  let total = 0;
  for (;;) {
    round++;
    const r = (await stepRegistry.generate({ edition, step })) as { gegenereerd: number };
    total += r.gegenereerd;
    if (r.gegenereerd === 0 || round > 40) break;
  }
  return total;
}

async function main() {
  const edition = unwrap(
    await db().from("editions").select("*").eq("profile_id", PROFILE).eq("date", EDITION_DATE).single(),
  ) as Edition;
  // A real pipeline_steps id so AI usage logging (uuid FK) is happy; ronde=999 makes requeue a no-op.
  const real = unwrap(
    await db().from("pipeline_steps").select("id").eq("edition_id", edition.id).eq("kind", "generate").limit(1).maybeSingle(),
  ) as { id: string } | null;
  const step = { id: real?.id, edition_id: edition.id, kind: "generate", payload: { ronde: 999 }, position: 6 } as unknown as PipelineStep;

  console.log(`Edition ${edition.id} (${EDITION_DATE})\n`);

  // 1. Reset thread-linked deep items to pending.
  const links = unwrap(await db().from("thread_items").select("item_id").eq("edition_id", edition.id)) as { item_id: string }[];
  const linkedIds = new Set(links.map((l) => l.item_id));
  const deep = unwrap(
    await db().from("edition_items").select("id, item_id").eq("edition_id", edition.id).eq("band", "deep"),
  ) as { id: string; item_id: string }[];
  const toReset = deep.filter((d) => linkedIds.has(d.item_id)).map((d) => d.id);
  if (toReset.length) await db().from("edition_items").update({ summary_text: null }).in("id", toReset);
  console.log(`Reset ${toReset.length} thread-linked deep items to pending.\n`);

  // 2. Generate.
  const total = await runGenerate(edition, step);
  console.log(`Generated ${total} unit(s).`);

  // 3. Snapshot threads.
  const threads = unwrap(
    await db().from("threads").select("id, title, state").eq("profile_id", PROFILE),
  ) as { id: string; title: string; state: string | null }[];
  console.log(`Threads with state set: ${threads.filter((t) => t.state).length}/${threads.length}\n`);

  const sample = threads.find((t) => t.state);
  if (sample) {
    const body = unwrap(
      await db()
        .from("edition_items")
        .select("summary_text, items!inner(id)")
        .eq("edition_id", edition.id)
        .in("item_id", links.filter(() => true).map((l) => l.item_id)),
    ) as { summary_text: string | null }[];
    console.log(`Sample thread:\n  TITLE: ${sample.title}\n  STATE: ${sample.state}\n  BODY:  ${body.find((b) => b.summary_text)?.summary_text?.slice(0, 400)}\n`);
  }

  // 4. Idempotency: re-run without reset.
  const again = await runGenerate(edition, step);
  console.log(`Idempotency re-run: ${again} unit(s) → ${again === 0 ? "STABLE ✓" : "NOT STABLE ✗"}`);

  // 5. Cost of this run.
  const usage = unwrap(
    await db().from("usage_log").select("cost_eur").eq("edition_id", edition.id).gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()),
  ) as { cost_eur: number }[];
  const cost = usage.reduce((s, u) => s + Number(u.cost_eur), 0);
  console.log(`\nThis run: ${usage.length} AI calls, €${cost.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
