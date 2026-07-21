// Phase F4 dry-run: preview product→actor re-parenting + variant canonicalization
// over the registry + item history, WITHOUT touching live data by default.
//
// F4's live pipeline only sets a product's parent_entity_id when the scan
// explicitly infers it ("Claude, Anthropic's model…"). Plenty of already-known
// products never got an explicit parent phrase. This script back-fills those
// links from evidence we already have: for each parent-less product/event in the
// registry, it counts which registry ACTOR co-occurs with it most often across
// item scan_meta, and proposes that actor as its parent.
//
// It also flags likely variant collapses: a registry entity whose norm_key is a
// prefix-variant of another canonical entity of the same type (e.g. "claude code"
// vs "claude") — candidates to fold into an alias list. These are PRINTED ONLY;
// per Siem's 2 Jul 2026 call, variant merging stays a reviewed operation, so even
// --apply here only writes parent links, never merges entities.
//
// Run dry:   node --env-file=.env.local --import tsx scripts/reparent-entities.ts
// Run apply: node --env-file=.env.local --import tsx scripts/reparent-entities.ts --apply
//   (--apply writes parent_entity_id for high-confidence suggestions only)
import { db } from "../modules/shared/db";
import { normalizeEntity } from "../modules/threads";
import { buildRegistry, resolveCanonical, isFacetType } from "../modules/entities";
import type { Entity } from "../modules/shared/types";

const APPLY = process.argv.includes("--apply");
// A suggestion needs at least this many co-occurrences to be "high-confidence".
const MIN_COOCCUR = 3;

async function loadRegistry(): Promise<Entity[]> {
  return ((await db().from("entities").select("*")).data ?? []) as Entity[];
}

/** All item entity lists (display strings) across scan_meta — the co-occurrence corpus. */
async function loadItemEntitySets(): Promise<string[][]> {
  const rows = (await db().from("items").select("scan_meta")).data as
    | { scan_meta: { entities?: string[] } | null }[]
    | null;
  return (rows ?? [])
    .map((r) => r.scan_meta?.entities ?? [])
    .filter((e) => e.length > 0);
}

async function main() {
  const rows = await loadRegistry();
  const registry = buildRegistry(rows);
  const actorKeys = new Set(rows.filter((r) => r.type === "actor").map((r) => r.norm_key));

  const itemSets = await loadItemEntitySets();

  // --- 1. Re-parenting suggestions ---------------------------------------
  const parentless = rows.filter((r) => isFacetType(r.type) && !r.parent_entity_id);
  console.log(`\n=== Re-parenting: ${parentless.length} parent-less products/events ===`);

  const suggestions: { product: Entity; actorKey: string; count: number }[] = [];
  for (const product of parentless) {
    const coCount = new Map<string, number>();
    for (const set of itemSets) {
      const norm = new Set(set.map((e) => resolveCanonical(normalizeEntity(e), registry)));
      if (!norm.has(product.norm_key)) continue;
      for (const key of norm) {
        if (key !== product.norm_key && actorKeys.has(key)) {
          coCount.set(key, (coCount.get(key) ?? 0) + 1);
        }
      }
    }
    const best = [...coCount.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) {
      suggestions.push({ product, actorKey: best[0], count: best[1] });
      const flag = best[1] >= MIN_COOCCUR ? "✓" : "·";
      console.log(`  ${flag} ${product.canonical_name} → ${best[0]} (${best[1]}× co-occurrence)`);
    } else {
      console.log(`  ? ${product.canonical_name} → (no actor co-occurs)`);
    }
  }

  // --- 2. Variant-collapse candidates (printed only) ---------------------
  console.log(`\n=== Variant candidates (review only, never auto-merged) ===`);
  const sorted = [...rows].sort((a, b) => a.norm_key.length - b.norm_key.length);
  for (const a of sorted) {
    for (const b of rows) {
      if (a.id === b.id || a.type !== b.type) continue;
      if (b.norm_key.startsWith(a.norm_key + " ")) {
        console.log(`  "${b.norm_key}" looks like a variant of "${a.norm_key}" (${a.type})`);
      }
    }
  }

  // --- 3. Apply (parent links only) --------------------------------------
  if (!APPLY) {
    console.log(`\nDry run — nothing written. Re-run with --apply to write parent links.`);
    return;
  }
  const toApply = suggestions.filter((s) => s.count >= MIN_COOCCUR);
  console.log(`\n=== Applying ${toApply.length} high-confidence parent links ===`);
  for (const s of toApply) {
    const actor = registry.get(s.actorKey);
    if (!actor) continue;
    await db()
      .from("entities")
      .update({ parent_entity_id: actor.id, updated_at: new Date().toISOString() })
      .eq("id", s.product.id);
    console.log(`  set ${s.product.canonical_name}.parent = ${actor.canonical_name}`);
  }
  console.log(`Done. Variant merges were NOT applied (reviewed operation).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
