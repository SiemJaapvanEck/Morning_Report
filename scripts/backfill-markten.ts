// One-off: populate front_page.markten for today's edition(s) with a live
// markets snapshot, so the markets-by-region map shows immediately (editions
// finalized before the feature lack the snapshot). Free (Yahoo, no key).
// Idempotent — safe to re-run.
//
// Run:  node --env-file=.env.local --import tsx scripts/backfill-markten.ts

import { db, unwrap } from "../modules/shared/db";
import { fetchMarkten } from "../modules/markten";
import { todayLocal } from "../modules/shared/config";

interface EditionRow {
  id: string;
  date: string;
  front_page: Record<string, unknown> | null;
}

async function main() {
  const snapshot = await fetchMarkten();
  console.log(`Fetched ${snapshot.indices.length} indices:`, snapshot.indices.map((i) => `${i.naam} ${i.d > 0 ? "+" : ""}${i.d}%`).join(", "));

  const today = todayLocal();
  const editions = unwrap(
    await db().from("editions").select("id, date, front_page").eq("date", today),
  ) as EditionRow[];

  if (editions.length === 0) {
    console.log(`No edition for ${today}.`);
    return;
  }

  for (const e of editions) {
    const frontPage = { ...(e.front_page ?? {}), markten: snapshot };
    const { error } = await db().from("editions").update({ front_page: frontPage }).eq("id", e.id);
    if (error) throw new Error(`Update ${e.id}: ${error.message}`);
    console.log(`Updated edition ${e.date} (${e.id})`);
  }
  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
