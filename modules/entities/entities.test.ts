import { describe, it, expect } from "vitest";
import {
  buildRegistry,
  typeOf,
  isUmbrellaType,
  isFacetType,
  resolveCanonical,
  mergeRegistryEntry,
  type EntityRegistry,
  type EntityRow,
} from "./index";
import type { Entity } from "../shared/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEntity(overrides: Partial<Entity> & Pick<Entity, "norm_key" | "type">): Entity {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    canonical_name: overrides.norm_key,
    aliases: [],
    confidence: "seed",
    first_seen_edition: null,
    created_at: "2026-07-02T00:00:00Z",
    updated_at: "2026-07-02T00:00:00Z",
    ...overrides,
  };
}

const SEED_ROWS: Entity[] = [
  makeEntity({ norm_key: "anthropic",       type: "actor",   canonical_name: "Anthropic" }),
  makeEntity({ norm_key: "trump",           type: "person",  canonical_name: "Trump",     aliases: ["donald trump", "trump administration"] }),
  makeEntity({ norm_key: "claude",          type: "product", canonical_name: "Claude",    aliases: ["claude science", "claude sonnet 5"] }),
  makeEntity({ norm_key: "fable",           type: "product", canonical_name: "Fable",     aliases: ["claude fable 5", "fable 5"] }),
  makeEntity({ norm_key: "us",              type: "place",   canonical_name: "US" }),
  makeEntity({ norm_key: "federal reserve", type: "actor",   canonical_name: "Federal Reserve", aliases: ["fed"] }),
];

let registry: EntityRegistry;

// ---------------------------------------------------------------------------
// buildRegistry
// ---------------------------------------------------------------------------

describe("buildRegistry", () => {
  it("builds a map keyed by norm_key", () => {
    registry = buildRegistry(SEED_ROWS);
    expect(registry.size).toBe(6);
    expect(registry.has("anthropic")).toBe(true);
    expect(registry.has("unknown")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// typeOf
// ---------------------------------------------------------------------------

describe("typeOf", () => {
  it("returns the entity type for known norm keys", () => {
    const reg = buildRegistry(SEED_ROWS);
    expect(typeOf("anthropic", reg)).toBe("actor");
    expect(typeOf("trump", reg)).toBe("person");
    expect(typeOf("claude", reg)).toBe("product");
    expect(typeOf("us", reg)).toBe("place");
  });

  it("returns 'other' for unknown keys", () => {
    const reg = buildRegistry(SEED_ROWS);
    expect(typeOf("unknown-entity", reg)).toBe("other");
    expect(typeOf("", reg)).toBe("other");
  });
});

// ---------------------------------------------------------------------------
// isUmbrellaType
// ---------------------------------------------------------------------------

describe("isUmbrellaType", () => {
  it("is true for actor and person", () => {
    expect(isUmbrellaType("actor")).toBe(true);
    expect(isUmbrellaType("person")).toBe(true);
  });

  it("is false for everything else", () => {
    expect(isUmbrellaType("product")).toBe(false);
    expect(isUmbrellaType("event")).toBe(false);
    expect(isUmbrellaType("place")).toBe(false);
    expect(isUmbrellaType("other")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isFacetType
// ---------------------------------------------------------------------------

describe("isFacetType", () => {
  it("is true for product and event", () => {
    expect(isFacetType("product")).toBe(true);
    expect(isFacetType("event")).toBe(true);
  });

  it("is false for everything else", () => {
    expect(isFacetType("actor")).toBe(false);
    expect(isFacetType("person")).toBe(false);
    expect(isFacetType("place")).toBe(false);
    expect(isFacetType("other")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveCanonical
// ---------------------------------------------------------------------------

describe("resolveCanonical", () => {
  it("returns the key unchanged when it is already canonical", () => {
    const reg = buildRegistry(SEED_ROWS);
    expect(resolveCanonical("anthropic", reg)).toBe("anthropic");
    expect(resolveCanonical("claude", reg)).toBe("claude");
  });

  it("resolves an alias to its canonical key", () => {
    const reg = buildRegistry(SEED_ROWS);
    expect(resolveCanonical("donald trump", reg)).toBe("trump");
    expect(resolveCanonical("trump administration", reg)).toBe("trump");
    expect(resolveCanonical("claude science", reg)).toBe("claude");
    expect(resolveCanonical("claude sonnet 5", reg)).toBe("claude");
    expect(resolveCanonical("claude fable 5", reg)).toBe("fable");
    expect(resolveCanonical("fable 5", reg)).toBe("fable");
    expect(resolveCanonical("fed", reg)).toBe("federal reserve");
  });

  it("returns the input unchanged for unknown keys and aliases", () => {
    const reg = buildRegistry(SEED_ROWS);
    expect(resolveCanonical("openai", reg)).toBe("openai");
    expect(resolveCanonical("some new entity", reg)).toBe("some new entity");
  });
});

// ---------------------------------------------------------------------------
// mergeRegistryEntry
// ---------------------------------------------------------------------------

describe("mergeRegistryEntry", () => {
  it("returns incoming when existing is undefined (new entity)", () => {
    const incoming: EntityRow = {
      canonical_name: "OpenAI",
      norm_key: "openai",
      type: "actor",
      aliases: [],
      confidence: "ai_high",
      first_seen_edition: "edition-1",
    };
    expect(mergeRegistryEntry(undefined, incoming)).toEqual(incoming);
  });

  it("keeps existing type and confidence when existing is higher confidence", () => {
    const existing: EntityRow = {
      canonical_name: "Anthropic",
      norm_key: "anthropic",
      type: "actor",
      aliases: [],
      confidence: "seed",
      first_seen_edition: null,
    };
    const incoming: EntityRow = {
      canonical_name: "Anthropic Inc",
      norm_key: "anthropic",
      type: "other",        // AI guessed wrong
      aliases: ["anthropic inc"],
      confidence: "ai_low",
      first_seen_edition: "edition-1",
    };
    const merged = mergeRegistryEntry(existing, incoming);
    expect(merged.type).toBe("actor");       // seed wins
    expect(merged.confidence).toBe("seed");
    expect(merged.canonical_name).toBe("Anthropic"); // existing canonical name kept
    expect(merged.aliases).toEqual(["anthropic inc"]); // aliases unioned
    expect(merged.first_seen_edition).toBeNull();      // existing (null) kept
  });

  it("adopts incoming type when incoming has higher confidence", () => {
    const existing: EntityRow = {
      canonical_name: "Fable",
      norm_key: "fable",
      type: "other",         // bad ai_low guess previously stored
      aliases: [],
      confidence: "ai_low",
      first_seen_edition: "edition-0",
    };
    const incoming: EntityRow = {
      canonical_name: "Fable",
      norm_key: "fable",
      type: "product",
      aliases: ["fable 5"],
      confidence: "ai_high",
      first_seen_edition: "edition-1",
    };
    const merged = mergeRegistryEntry(existing, incoming);
    expect(merged.type).toBe("product");     // ai_high beats ai_low
    expect(merged.confidence).toBe("ai_high");
    expect(merged.first_seen_edition).toBe("edition-0"); // existing kept
  });

  it("unions aliases from both sides and deduplicates", () => {
    const existing: EntityRow = {
      canonical_name: "Claude",
      norm_key: "claude",
      type: "product",
      aliases: ["claude science", "claude sonnet"],
      confidence: "seed",
      first_seen_edition: null,
    };
    const incoming: EntityRow = {
      canonical_name: "Claude",
      norm_key: "claude",
      type: "product",
      aliases: ["claude sonnet", "claude sonnet 4"],  // "claude sonnet" is a dupe
      confidence: "ai_high",
      first_seen_edition: "edition-1",
    };
    const merged = mergeRegistryEntry(existing, incoming);
    expect(merged.aliases).toEqual(["claude science", "claude sonnet", "claude sonnet 4"]);
  });

  it("equal confidence keeps existing (seed = seed is a tie)", () => {
    const existing: EntityRow = {
      canonical_name: "Trump",
      norm_key: "trump",
      type: "person",
      aliases: ["donald trump"],
      confidence: "seed",
      first_seen_edition: null,
    };
    const incoming: EntityRow = {
      canonical_name: "Trump",
      norm_key: "trump",
      type: "actor",   // different guess at same confidence
      aliases: ["trump admin"],
      confidence: "seed",
      first_seen_edition: "edition-1",
    };
    const merged = mergeRegistryEntry(existing, incoming);
    expect(merged.type).toBe("person"); // tie → existing wins
  });
});
