// Throwaway Phase B rebuild: re-derive the entity-anchored, flat threads from the
// existing item/entity history so the /archive "Alle verhalen" list has real
// content. Replays the SAME anchor algorithm threadsStep uses (the pure functions
// + DB helpers), edition-by-edition in chronological order, with the recurrence
// window computed *as of each edition's date* so anchors open when they would have.
//
// DESTRUCTIVE in --apply mode: it deletes every thread (and, by cascade, every
// thread_item) for the profile, then rebuilds. Written deep articles live on
// edition_items and survive; only the accumulated thread `state` prose is lost
// (it regenerates over future editions). Default is a DRY RUN: nothing is written,
// it just prints the story list it would produce.
//
// Run dry:   node --env-file=.env.local --import tsx scripts/rebuild-threads.ts
// Run apply: node --env-file=.env.local --import tsx scripts/rebuild-threads.ts --apply
import { db } from "../modules/shared/db";
import { config } from "../modules/shared/config";
import { assembleUserContext } from "../modules/redactie";
import {
  loadEditionCandidates,
  detectAnchors,
  bigTopicAnchors,
  personalAnchors,
  mergeAnchors,
  matchByAnchor,
  resolveThreadMeta,
  mergeEntities,
  normalizeEntity,
  isAnchorableEntity,
  insertThread,
  linkThreadItems,
  touchThread,
  type EntityDays,
} from "../modules/threads";
import { updatedAgo, spanDays } from "../app/lib/stories";

const PROFILE_ID = process.argv.find((a) => a.startsWith("--profile="))?.split("=")[1]
  ?? "ec194dfb-0725-4ff0-bb7c-e8e3a2091786"; // Siem
const APPLY = process.argv.includes("--apply");

/** loadEntityDays, but the recurrence window ends at `asOf` (a YYYY-MM-DD date). */
async function entityDaysAsOf(profileId: string, windowDays: number, asOf: string): Promise<EntityDays> {
  const cutoff = new Date(Date.parse(asOf + "T00:00:00Z") - windowDays * 86_400_000).toISOString().slice(0, 10);
  const rows = (await db()
    .from("edition_items")
    .select("items(scan_meta), editions!inner(date, profile_id)")
    .eq("editions.profile_id", profileId)
    .gte("editions.date", cutoff)
    .lte("editions.date", asOf)).data as unknown as {
    items: { scan_meta: { entities?: string[] } | null } | null;
    editions: { date: string } | null;
  }[];

  const map: EntityDays = new Map();
  for (const r of rows ?? []) {
    const date = r.editions?.date;
    if (!date) continue;
    const seen = new Set<string>();
    for (const raw of r.items?.scan_meta?.entities ?? []) {
      const norm = normalizeEntity(raw);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      const e = map.get(norm) ?? { days: new Set<string>(), count: 0, display: raw };
      e.days.add(date);
      e.count += 1;
      map.set(norm, e);
    }
  }
  return map;
}

/** In-memory thread under construction during the replay (mirrors the DB row). */
interface SimThread {
  id: string;
  anchorEntity: string;
  title: string;
  entities: string[];
  topicId: string | null;
  categoryId: string | null;
  reason: string;
  dates: string[];
  lastSeen: string;
}

async function main() {
  const editions = (await db()
    .from("editions")
    .select("id, date")
    .eq("profile_id", PROFILE_ID)
    .order("date", { ascending: true })).data as { id: string; date: string }[] | null;
  if (!editions || editions.length === 0) {
    console.log("No editions for this profile — nothing to rebuild.");
    return;
  }

  const userCtx = await assembleUserContext(PROFILE_ID);
  const { anchorMinDays, anchorMinItems, anchorWindowDays, bigTopicMinOverlap, bigTopicMinCluster } = config.threads;

  if (APPLY) {
    console.log("⚠️  APPLY mode — deleting existing threads for the profile (cascades thread_items)…");
    const { error } = await db().from("threads").delete().eq("profile_id", PROFILE_ID);
    if (error) throw new Error(`wipe failed: ${error.message}`);
  }

  const sim: SimThread[] = [];
  const byAnchor = new Map<string, SimThread>();
  let openedTotal = 0;
  let linkedTotal = 0;

  for (const edition of editions) {
    const candidates = await loadEditionCandidates(edition.id);
    if (candidates.length === 0) continue;
    const stamp = `${edition.date}T12:00:00Z`;

    const todayEntities = new Set<string>();
    for (const c of candidates) for (const e of c.entities) {
      const n = normalizeEntity(e);
      if (n) todayEntities.add(n);
    }

    const entityDays = await entityDaysAsOf(PROFILE_ID, anchorWindowDays, edition.date);
    const recurring = detectAnchors(entityDays, anchorMinDays, anchorMinItems)
      .filter((a) => todayEntities.has(a.entity))
      .map((a) => ({ entity: a.entity, display: a.display, reason: "recurring" as const }));
    const big = bigTopicAnchors(
      candidates.map((c) => ({ id: c.itemId, entities: c.entities })),
      bigTopicMinOverlap,
      bigTopicMinCluster,
    );
    const personal = personalAnchors(
      candidates,
      userCtx.followedTopicIds,
      userCtx.followedCategoryIds,
      userCtx.trackedTopicIds,
    );
    const anchors = mergeAnchors(recurring, big, personal).filter((a) => isAnchorableEntity(a.entity));

    // Open a thread for each qualifying anchor we don't have yet.
    for (const a of anchors) {
      if (byAnchor.has(a.entity)) continue;
      const meta = resolveThreadMeta(a.entity, candidates);
      const entities = mergeEntities([a.entity], []);
      const id = APPLY
        ? await insertThread({
            profileId: PROFILE_ID,
            topicId: meta.topicId,
            categoryId: meta.categoryId,
            title: a.display,
            entities,
            status: "active",
            lastEditionId: edition.id,
            lastSeenAt: stamp,
            anchorEntity: a.entity,
          })
        : `NEW:${a.entity}`;
      const t: SimThread = {
        id,
        anchorEntity: a.entity,
        title: a.display,
        entities,
        topicId: meta.topicId,
        categoryId: meta.categoryId,
        reason: a.reason,
        dates: [],
        lastSeen: stamp,
      };
      sim.push(t);
      byAnchor.set(a.entity, t);
      openedTotal++;
    }

    // Link each candidate to its single best anchor thread; accumulate dates.
    const anchorView = sim.map((t) => ({ id: t.id, anchor_entity: t.anchorEntity }));
    const links: { threadId: string; itemId: string; editionId: string }[] = [];
    const touched = new Map<string, string[]>();
    for (const c of candidates) {
      const threadId = matchByAnchor(c.entities, anchorView);
      if (!threadId) continue;
      const t = sim.find((s) => s.id === threadId)!;
      t.dates.push(edition.date);
      t.lastSeen = stamp;
      links.push({ threadId, itemId: c.itemId, editionId: edition.id });
      touched.set(threadId, [...(touched.get(threadId) ?? []), ...c.entities]);
      linkedTotal++;
    }

    if (APPLY) {
      await linkThreadItems(links);
      for (const [threadId, addEnts] of touched) {
        const t = sim.find((s) => s.id === threadId)!;
        t.entities = mergeEntities(t.entities, addEnts);
        await touchThread(threadId, t.entities, edition.id, t.lastSeen);
      }
    } else {
      for (const [threadId, addEnts] of touched) {
        const t = sim.find((s) => s.id === threadId)!;
        t.entities = mergeEntities(t.entities, addEnts);
      }
    }
  }

  // Resolve categories for the printout.
  const catIds = [...new Set(sim.map((t) => t.categoryId).filter(Boolean))] as string[];
  const cats = catIds.length
    ? ((await db().from("categories").select("id, name").in("id", catIds)).data as { id: string; name: string }[] | null) ?? []
    : [];
  const catName = new Map(cats.map((c) => [c.id, c.name]));

  const now = Date.now();
  const stories = sim
    .map((t) => {
      const dates = [...t.dates].sort();
      return {
        title: t.title,
        reason: t.reason,
        cat: t.categoryId ? catName.get(t.categoryId) ?? "—" : "—",
        firstDate: dates[0] ?? null,
        lastDate: dates.at(-1) ?? null,
        eventCount: dates.length,
        lastSeen: t.lastSeen,
      };
    })
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));

  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"} — ${editions.length} editions replayed`);
  console.log(`opened ${openedTotal} threads · ${linkedTotal} thread_item links\n`);
  console.log(`Story list (${stories.length}):`);
  for (const s of stories) {
    const span = spanDays(s);
    const upd = updatedAgo(s.lastSeen, now);
    const range = s.firstDate ? `${s.firstDate}→${s.lastDate}` : "no events";
    console.log(
      `  • ${s.title.padEnd(34)} [${s.cat.padEnd(12)}] ${String(s.eventCount).padStart(2)} ev · ${String(span).padStart(3)}d · ${range}  (upd ${upd}, ${s.reason})`,
    );
  }
  if (!APPLY) console.log(`\n(no writes — re-run with --apply to persist)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
