// Throwaway Phase 3 verification: run the real `threads` step against today's
// Siem edition twice and report thread / thread_items counts (idempotency).
// Run: node --env-file=.env.local --import tsx scripts/verify-threads.ts
import { stepRegistry } from "../modules/pipeline/steps";
import { db, unwrap } from "../modules/shared/db";
import type { Edition, PipelineStep } from "../modules/shared/types";

const PROFILE = "ec194dfb-0725-4ff0-bb7c-e8e3a2091786"; // Siem
// Verify against an edition that actually has items (June 17, generated last session).
const EDITION_DATE = process.env.VERIFY_DATE ?? "2026-06-17";

async function snapshot(editionId: string) {
  const threads = unwrap(
    await db().from("threads").select("id, title, status, entities").eq("profile_id", PROFILE),
  ) as { id: string; title: string; status: string; entities: string[] }[];
  const links = unwrap(
    await db().from("thread_items").select("thread_id").eq("edition_id", editionId),
  ) as { thread_id: string }[];
  return { threads, links: links.length };
}

async function main() {
  const edition = unwrap(
    await db().from("editions").select("*").eq("profile_id", PROFILE).eq("date", EDITION_DATE).single(),
  ) as Edition;
  const fakeStep = { id: "verify", edition_id: edition.id, kind: "threads", payload: {} } as unknown as PipelineStep;

  console.log(`Edition ${edition.id} (${EDITION_DATE})\n`);

  const r1 = await stepRegistry.threads({ edition, step: fakeStep });
  console.log("run 1:", r1);
  const s1 = await snapshot(edition.id);
  console.log(`  → ${s1.threads.length} threads, ${s1.links} thread_items\n`);

  const r2 = await stepRegistry.threads({ edition, step: fakeStep });
  console.log("run 2 (idempotency):", r2);
  const s2 = await snapshot(edition.id);
  console.log(`  → ${s2.threads.length} threads, ${s2.links} thread_items`);
  console.log(`\nIDEMPOTENT: ${s1.threads.length === s2.threads.length && s1.links === s2.links ? "YES ✓" : "NO ✗"}`);

  console.log("\nThreads:");
  for (const t of s2.threads) {
    console.log(`  • [${t.status}] ${t.title}  — entities: ${t.entities.slice(0, 6).join(", ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
