// Throwaway Phase 5a verification: run daily_paper assembly + finalize against
// the June 17 edition and confirm front_page gets dp_summary/dp_intro/dp_articles.
// Run: node --env-file=.env.local --import tsx scripts/verify-phase5a.ts
import { stepRegistry } from "../modules/pipeline/steps";
import { db, unwrap } from "../modules/shared/db";
import type { Edition, PipelineStep, DailyPaperArticle } from "../modules/shared/types";

const PROFILE = "ec194dfb-0725-4ff0-bb7c-e8e3a2091786"; // Siem
const EDITION_DATE = process.env.VERIFY_DATE ?? "2026-06-17";

async function main() {
  const edition = unwrap(
    await db().from("editions").select("*").eq("profile_id", PROFILE).eq("date", EDITION_DATE).single(),
  ) as Edition;
  const dpStepRow = unwrap(
    await db().from("pipeline_steps").select("id").eq("edition_id", edition.id).eq("kind", "daily_paper").limit(1).maybeSingle(),
  ) as { id: string } | null;
  const dpStep = { id: dpStepRow?.id, edition_id: edition.id, kind: "daily_paper", payload: {}, position: 7 } as unknown as PipelineStep;

  console.log(`Edition ${edition.id} (${EDITION_DATE})\n`);

  // 1. Assemble.
  const result = (await stepRegistry.daily_paper({ edition, step: dpStep })) as {
    dp_summary: string | null;
    dp_intro: string | null;
    dp_articles: DailyPaperArticle[];
    threads: number;
  };
  console.log(`dp_summary: ${result.dp_summary?.slice(0, 220)}\n`);
  console.log(`dp_intro:   ${result.dp_intro?.slice(0, 220)}\n`);
  console.log(`dp_articles: ${result.dp_articles.length} (${result.threads} thread updates + general)`);
  for (const a of result.dp_articles) {
    const kind = a.thread_id ? (a.followed ? "thread/followed" : "thread") : "GENERAL";
    console.log(`  • [${kind}] ${a.headline}  {lenses: ${a.destep_lenses.join(",") || "—"}}`);
  }

  // 2. Push the result through finalize (write into front_page).
  if (dpStepRow?.id) {
    await db().from("pipeline_steps").update({ result }).eq("id", dpStepRow.id);
  }
  const finStep = { id: "fin", edition_id: edition.id, kind: "finalize", payload: {}, position: 8 } as unknown as PipelineStep;
  await stepRegistry.finalize({ edition, step: finStep });

  // 3. Read back front_page.
  const fp = (unwrap(
    await db().from("editions").select("front_page").eq("id", edition.id).single(),
  ) as { front_page: Record<string, unknown> }).front_page;
  const arts = (fp.dp_articles as DailyPaperArticle[] | null) ?? [];
  console.log(`\nfront_page written: dp_summary=${fp.dp_summary ? "yes" : "no"}, dp_intro=${fp.dp_intro ? "yes" : "no"}, dp_articles=${arts.length}`);
  console.log(`front_page check: ${fp.dp_summary && fp.dp_intro && arts.length ? "OK ✓" : "MISSING ✗"}`);

  const usage = unwrap(
    await db().from("usage_log").select("cost_eur").eq("edition_id", edition.id).gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()),
  ) as { cost_eur: number }[];
  console.log(`\nThis run: ${usage.length} AI call(s), €${usage.reduce((s, u) => s + Number(u.cost_eur), 0).toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
