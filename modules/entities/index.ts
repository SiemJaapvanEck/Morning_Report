// Entity registry helpers — pure, framework-agnostic, no DB calls.
// Phase F1: storage + pure logic only; no pipeline wiring yet.
//
// The registry is a Map<norm_key, Entity> built from the `entities` DB table.
// Callers supply a pre-normalized string (basic normalize pass: lowercase, no
// diacritics, punctuation → spaces) and the registry answers the type / canonical.

import type { Entity, EntityConfidence, EntityType } from "../shared/types";

/** In-memory registry: norm_key → Entity. Build with buildRegistry(). */
export type EntityRegistry = Map<string, Entity>;

/** Build an in-memory registry from a flat row array (e.g. a DB select result). */
export function buildRegistry(rows: Entity[]): EntityRegistry {
  return new Map(rows.map((r) => [r.norm_key, r]));
}

/** The type of a known entity; 'other' when the norm_key is not in the registry. */
export function typeOf(normKey: string, registry: EntityRegistry): EntityType {
  return registry.get(normKey)?.type ?? "other";
}

/** True for entity types that anchor umbrella threads: actor or person. */
export function isUmbrellaType(type: EntityType): boolean {
  return type === "actor" || type === "person";
}

/** True for entity types that become storyline facets: product or event. */
export function isFacetType(type: EntityType): boolean {
  return type === "product" || type === "event";
}

/**
 * Resolve a pre-normalized string to its canonical norm_key via the registry.
 * Checks direct key membership first; then scans aliases. Returns the input
 * unchanged when no match is found (unknown entity stays as its own key).
 *
 * The caller is responsible for the basic normalize pass (lowercase, diacritics
 * stripped, punctuation → spaces). This function adds only the registry layer.
 */
export function resolveCanonical(normKey: string, registry: EntityRegistry): string {
  if (registry.has(normKey)) return normKey;
  for (const [key, entry] of registry) {
    if (entry.aliases.includes(normKey)) return key;
  }
  return normKey;
}

/** A registry entry without the DB-managed fields (used for upsert payloads). */
export type EntityRow = Pick<
  Entity,
  "canonical_name" | "norm_key" | "type" | "aliases" | "confidence" | "first_seen_edition"
>;

/**
 * Build a compact primer string for the scan prompt.
 * Format: "Anthropic=actor, Claude=product, ..."
 * Seeds come first (most trusted), then ai_high, then ai_low. Capped at
 * `limit` entries so the prompt stays within the token budget for large registries.
 */
export function buildRegistryPriming(registry: EntityRegistry, limit = 60): string {
  if (registry.size === 0) return "";
  return [...registry.values()]
    .sort((a, b) => CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence])
    .slice(0, limit)
    .map((e) => `${e.canonical_name}=${e.type}`)
    .join(", ");
}

// Confidence levels ranked lowest-ordinal-wins (seed is most trusted).
const CONFIDENCE_RANK: Record<EntityConfidence, number> = {
  seed: 0,
  ai_high: 1,
  ai_low: 2,
};

/**
 * Merge an incoming (AI-written) registry entry with the existing one.
 * Rules:
 * - Higher-confidence entry keeps its type and confidence (seed beats ai_high).
 * - Aliases are unioned.
 * - canonical_name and norm_key are kept from the existing row.
 * - first_seen_edition keeps the earliest non-null value (existing wins).
 * When `existing` is undefined (new entity), the incoming row is returned as-is.
 */
export function mergeRegistryEntry(
  existing: EntityRow | undefined,
  incoming: EntityRow,
): EntityRow {
  if (!existing) return incoming;
  const keepExisting =
    CONFIDENCE_RANK[existing.confidence] <= CONFIDENCE_RANK[incoming.confidence];
  return {
    canonical_name: existing.canonical_name,
    norm_key: existing.norm_key,
    type: keepExisting ? existing.type : incoming.type,
    aliases: Array.from(new Set([...existing.aliases, ...incoming.aliases])),
    confidence: keepExisting ? existing.confidence : incoming.confidence,
    // first_seen_edition is immutable once set; seeds carry null ("pre-dates all editions")
    // and must not be overwritten by an ai_* entry's edition id.
    first_seen_edition: existing.first_seen_edition,
  };
}
