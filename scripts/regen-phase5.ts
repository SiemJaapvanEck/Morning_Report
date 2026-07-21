// Throwaway Phase 5 verification: regenerate ALL deep bodies on today's editions
// with Tavily grounding active, and report the ripple lift + cost vs the Phase 4
// baseline. Nulls summary_text+article on deep items, runs the real `generate`
// handler until done (per HANDOFF "re-gen only deep bodies" recipe).
// Run: node --env-file=.env.local --import tsx scripts/regen-phase5.ts
import { stepRegistry } from "../modules/pipeline/steps";
import { db, unwrap } from "../modules/shared/db";
import { tavilyEnabled } from "../modules/tavily";
import type { Edition, PipelineStep } from "../modules/shared/types";

const DATE = process.env.VERIFY_DATE ?? "2026-06-28";

type DeepRow = { id: string; article: { ripples?: unknown[] } | null };

function rippleTotal(rows: DeepRow[]): number {
  return rows.reduce((s, r) => s + (Array.isArray(r.article?.ripples) ? r.article!.ripples!.length : 0), 0);
}

async function deepRows(editionId: string): Promise<DeepRow[]> {
  return unwrap(
    await db().from("edition_items").select("id, article").eq("edition_id", editionId).eq("band", "deep"),
  ) as DeepRow[];
}

async function runGenerate(edition: Edition, step: PipelineStep): Promise<number> {
  let round = 0;
  let total = 0;
  for (;;) {
    round++;
    const r = (await stepRegistry.generate({ edition, step })) as { gegenereerd: number };
    total += r.gegenereerd;
    if (r.gegenereerd === 0 || round > 80) break;
  }
  return total;
}

async function regen(edition: Edition, profile: string) {
  const real = unwrap(
    await db().from("pipeline_steps").select("id").eq("edition_id", edition.id).eq("kind", "generate").limit(1).maybeSingle(),
  ) as { id: string } | null;
  const step = { id: real?.id, edition_id: edition.id, kind: "generate", payload: { ronde: 999 }, position: 6 } as unknown as PipelineStep;

  const before = await deepRows(edition.id);
  const beforeRipples = rippleTotal(before);

  // Null deep bodies so generate re-processes them (article + flat text).
  await db().from("edition_items").update({ summary_text: null, article: null }).eq("edition_id", edition.id).eq("band", "deep");

  const t0 = Date.now();
  const generated = await runGenerate(edition, step);
  const secs = ((Date.now() - t0) / 1000).toFixed(0);

  const after = await deepRows(edition.id);
  const afterRipples = rippleTotal(after);

  const usage = unwrap(
    await db().from("usage_log").select("cost_eur").eq("edition_id", edition.id).gte("created_at", new Date(t0).toISOString()),
  ) as { cost_eur: number }[];
  const cost = usage.reduce((s, u) => s + Number(u.cost_eur), 0);

  console.log(`\n=== ${profile} (${edition.id}) ===`);
  console.log(`  deep items:   ${after.length}`);
  console.log(`  ripples:      ${beforeRipples} → ${afterRipples}  (avg ${(afterRipples / after.length).toFixed(2)}/article)`);
  console.log(`  generated:    ${generated} unit(s) in ${secs}s`);
  console.log(`  cost:         €${cost.toFixed(4)} (${usage.length} AI calls)`);
}

async function main() {
  console.log(`Tavily grounding active: ${tavilyEnabled()}\n`);
  const editions = unwrap(
    await db().from("editions").select("*, profiles(name)").eq("date", DATE),
  ) as (Edition & { profiles: { name: string } })[];
  for (const e of editions) await regen(e, e.profiles.name);
  console.log("\n✅ Regeneration complete — check localhost:3000.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
