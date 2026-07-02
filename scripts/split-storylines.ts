// Phase D2 rebuild: retroactively split existing flat big threads into the
// two-level model (big thread → storylines). Replays the SAME storyline logic
// threadsStep uses (storylineFacets / shouldPromote / matchStorylines) over each
// big thread's full linked history, so the /archive hierarchy appears on current
// data without waiting for it to emerge forward.
//
// ADDITIVE, not destructive: it never deletes a thread. In --apply it (1) creates
// a child storyline per qualifying facet and (2) MOVES each matching item's link
// from the umbrella to its storyline(s) (many-to-many). Items matching no facet
// stay on the umbrella as a general bucket. Deep articles live on edition_items
// and are untouched — both the umbrella and its storylines reference them.
//
// Run dry:   node --env-file=.env.local --import tsx scripts/split-storylines.ts
// Run apply: node --env-file=.env.local --import tsx scripts/split-storylines.ts --apply
import { db } from "../modules/shared/db";
import { config } from "../modules/shared/config";
import {
  storylineFacets,
  matchStorylines,
  shouldPromote,
  mergeEntities,
  insertThread,
  linkThreadItems,
} from "../modules/threads";

const PROFILE_ID = process.argv.find((a) => a.startsWith("--profile="))?.split("=")[1]
  ?? "ec194dfb-0725-4ff0-bb7c-e8e3a2091786"; // Siem
const APPLY = process.argv.includes("--apply");

interface LinkedItem {
  linkId: string;
  itemId: string;
  editionId: string | null;
  entities: string[];
}

/** A big thread's linked items (via thread_items ⋈ items), with display entities. */
async function loadUmbrellaItems(threadId: string): Promise<LinkedItem[]> {
  const links = (await db()
    .from("thread_items")
    .select("id, item_id, edition_id, items(scan_meta)")
    .eq("thread_id", threadId)).data as unknown as {
    id: string;
    item_id: string;
    edition_id: string | null;
    items: { scan_meta: { entities?: string[] } | null } | null;
  }[];
  return (links ?? []).map((l) => ({
    linkId: l.id,
    itemId: l.item_id,
    editionId: l.edition_id,
    entities: l.items?.scan_meta?.entities ?? [],
  }));
}

async function main() {
  const now = new Date().toISOString();

  const bigThreads = (await db()
    .from("threads")
    .select("id, title, anchor_entity, topic_id, category_id, entities")
    .eq("profile_id", PROFILE_ID)
    .is("parent_thread_id", null)
    .neq("status", "closed")
    .not("anchor_entity", "is", null)).data as unknown as {
    id: string;
    title: string;
    anchor_entity: string;
    topic_id: string | null;
    category_id: string | null;
    entities: string[];
  }[];

  // Facets already spun off, so a re-run doesn't duplicate them.
  const existing = (await db()
    .from("threads")
    .select("parent_thread_id, anchor_entity")
    .eq("profile_id", PROFILE_ID)
    .not("parent_thread_id", "is", null)).data as unknown as {
    parent_thread_id: string;
    anchor_entity: string | null;
  }[];
  const haveByBig = new Map<string, Set<string>>();
  for (const t of existing ?? []) {
    if (!t.anchor_entity) continue;
    const s = haveByBig.get(t.parent_thread_id) ?? new Set<string>();
    s.add(t.anchor_entity);
    haveByBig.set(t.parent_thread_id, s);
  }

  console.log(
    `${APPLY ? "APPLY" : "DRY RUN"} — profile ${PROFILE_ID}\n` +
      `facetMinItems=${config.threads.facetMinItems} promoteMinFacets=${config.threads.promoteMinFacets}\n` +
      `${(bigThreads ?? []).length} big threads\n`,
  );

  // Other big anchors are sibling umbrellas — never a sub-storyline of each other.
  const bigAnchorSet = new Set((bigThreads ?? []).map((b) => b.anchor_entity));

  let threadsSplit = 0;
  let storylinesCreated = 0;
  let itemsMoved = 0;

  for (const big of bigThreads ?? []) {
    const items = await loadUmbrellaItems(big.id);
    const facets = storylineFacets(big.anchor_entity, items, config.threads.facetMinItems, bigAnchorSet);
    if (!shouldPromote(facets, config.threads.promoteMinFacets)) continue;

    threadsSplit++;
    console.log(`▚ ${big.title}  [${big.anchor_entity}]  ${items.length} items`);
    const have = haveByBig.get(big.id) ?? new Set<string>();

    // Create the storyline children (or report them), then map facet → thread id.
    const facetThreadId = new Map<string, string>();
    for (const f of facets) {
      if (have.has(f.entity)) {
        console.log(`   · ${f.display}  (${f.count})  — already exists`);
        continue;
      }
      console.log(`   → ${f.display}  (${f.count} items)`);
      if (APPLY) {
        const id = await insertThread({
          profileId: PROFILE_ID,
          topicId: big.topic_id,
          categoryId: big.category_id,
          title: f.display,
          entities: mergeEntities([big.anchor_entity, f.entity], []),
          status: "active",
          lastEditionId: null, // set on the next real edition touch
          lastSeenAt: now,
          anchorEntity: f.entity,
          parentThreadId: big.id,
        });
        facetThreadId.set(f.entity, id);
        storylinesCreated++;
      }
    }

    if (!APPLY) continue;

    // Reload the full child set (existing + freshly created) for matching.
    const children = (await db()
      .from("threads")
      .select("id, anchor_entity")
      .eq("parent_thread_id", big.id)).data as unknown as {
      id: string;
      anchor_entity: string | null;
    }[];

    // Move each matching item's link from the umbrella to its storyline(s).
    for (const it of items) {
      const matched = matchStorylines(it.entities, children ?? []);
      if (matched.length === 0) continue; // stays on the umbrella (general bucket)
      await linkThreadItems(
        matched.map((sid) => ({ threadId: sid, itemId: it.itemId, editionId: it.editionId })),
      );
      await db().from("thread_items").delete().eq("id", it.linkId);
      itemsMoved++;
    }
  }

  console.log(
    `\n${APPLY ? "Applied" : "Would split"}: ${threadsSplit} big threads → ` +
      `${APPLY ? storylinesCreated : "…"} storylines, ${APPLY ? itemsMoved : "…"} items moved.` +
      (APPLY ? "" : "\nRe-run with --apply to write."),
  );
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
