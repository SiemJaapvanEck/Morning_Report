// Editorial memory.
//
// The persona layer (character prompt + front-page intro + "Daily Paper") has
// been removed — the editorial output is now a single neutral cross-reference
// synthesis in modules/redactie. What remains here is read access to the
// stored memory, kept for the upcoming cross-reference axis B (earlier news →
// "reference") that will feed the synthesis with context. The memory tables
// (sol_memory, sol_notes) already exist.

import { db, unwrap } from "../shared/db";
import type { SolMemory } from "../shared/types";

/** Recent, un-compacted memories for context. */
export async function loadMemory(profileId: string, limit = 20): Promise<SolMemory[]> {
  return unwrap(
    await db()
      .from("sol_memory")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}
