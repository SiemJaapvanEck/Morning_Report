// Throwaway Phase A verification: READ-ONLY simulation of the new entity-anchored
// thread planner against a real edition. Loads the same inputs threadsStep uses,
// runs the pure functions, and prints the anchors it would open + the links it
// would make — WITHOUT writing anything to the database.
//
// Run: node --env-file=.env.local --import tsx scripts/verify-anchor-threads.ts [YYYY-MM-DD]
import { db } from "../modules/shared/db";
import { config } from "../modules/shared/config";
import { assembleUserContext } from "../modules/redactie";
import {
  loadEditionCandidates,
  loadActiveThreads,
  loadLinkedItemIds,
  loadEntityDays,
  detectAnchors,
  bigTopicAnchors,
  personalAnchors,
  mergeAnchors,
  matchByAnchor,
  resolveThreadMeta,
  normalizeEntity,
} from "../modules/threads";
import type { Edition } from "../modules/shared/types";

const PROFILES: Record<string, string> = {
  Siem: "ec194dfb-0725-4ff0-bb7c-e8e3a2091786",
};

async function simulate(name: string, profileId: string, date: string) {
  const edition = (await db()
    .from("editions")
    .select("*")
    .eq("profile_id", profileId)
    .eq("date", date)
    .maybeSingle()).data as Edition | null;
  if (!edition) {
    console.log(`\n## ${name}: no edition on ${date}\n`);
    return;
  }

  const [candidates, threads, linked, userCtx, entityDays] = await Promise.all([
    loadEditionCandidates(edition.id),
    loadActiveThreads(profileId),
    loadLinkedItemIds(edition.id),
    assembleUserContext(profileId),
    loadEntityDays(profileId, config.threads.anchorWindowDays),
  ]);

  const todayEntities = new Set<string>();
  for (const c of candidates) for (const e of c.entities) {
    const n = normalizeEntity(e);
    if (n) todayEntities.add(n);
  }

  const recurring = detectAnchors(entityDays, config.threads.anchorMinDays, config.threads.anchorMinItems)
    .filter((a) => todayEntities.has(a.entity))
    .map((a) => ({ entity: a.entity, display: a.display, reason: "recurring" as const }));
  const big = bigTopicAnchors(
    candidates.map((c) => ({ id: c.itemId, entities: c.entities })),
    config.threads.bigTopicMinOverlap,
    config.threads.bigTopicMinCluster,
  );
  const personal = personalAnchors(
    candidates,
    userCtx.followedTopicIds,
    userCtx.followedCategoryIds,
    userCtx.trackedTopicIds,
  );
  const anchors = mergeAnchors(recurring, big, personal);

  const existingAnchors = new Set(
    threads.map((t) => t.anchor_entity).filter((a): a is string => Boolean(a)),
  );
  const newAnchors = anchors.filter((a) => !existingAnchors.has(a.entity));

  // Simulate matching against existing anchor threads + the ones we'd open.
  const simThreads = [
    ...threads.filter((t) => t.anchor_entity).map((t) => ({ id: t.id, anchor_entity: t.anchor_entity })),
    ...newAnchors.map((a) => ({ id: `NEW:${a.entity}`, anchor_entity: a.entity })),
  ];
  let linkCount = 0;
  for (const c of candidates) {
    if (linked.has(c.itemId)) continue;
    if (matchByAnchor(c.entities, simThreads)) linkCount++;
  }

  console.log(`\n## ${name} — edition ${date} (${candidates.length} items)`);
  console.log(`existing anchor threads: ${existingAnchors.size} | qualifying anchors: ${anchors.length} | would OPEN: ${newAnchors.length} | would LINK: ${linkCount}`);
  console.log(`  recurring=${recurring.length}  big_topic=${big.length}  personal=${personal.length}`);
  console.log(`\nNew threads it would open:`);
  for (const a of newAnchors) {
    const meta = resolveThreadMeta(a.entity, candidates);
    console.log(`  • "${a.display}"  [${a.reason}]  topic=${meta.topicId ?? "—"} cat=${meta.categoryId ?? "—"}`);
  }
}

async function main() {
  const date = process.argv[2] ?? "2026-06-28";
  for (const [name, id] of Object.entries(PROFILES)) await simulate(name, id, date);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
