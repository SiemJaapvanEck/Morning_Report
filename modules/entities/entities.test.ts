import { describe, it, expect } from "vitest";
import {
  buildRegistry,
  typeOf,
  isUmbrellaType,
  isFacetType,
  resolveCanonical,
  mergeRegistryEntry,
  buildRegistryPriming,
  buildEntityById,
  parentActorKey,
  expandWithParents,
  clusterByActor,
  type EntityRegistry,
  type EntityRow,
} from "./index";
import type { Entity } from "../shared/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let entityIdSeq = 1;
function makeEntity(overrides: Partial<Entity> & Pick<Entity, "norm_key" | "type">): Entity {
  return {
    id: `00000000-0000-0000-0000-${String(entityIdSeq++).padStart(12, "0")}`,
    canonical_name: overrides.norm_key,
    aliases: [],
    confidence: "seed",
    parent_entity_id: null,
    first_seen_edition: null,
    created_at: "2026-07-02T00:00:00Z",
    updated_at: "2026-07-02T00:00:00Z",
    ...overrides,
  };
}

const ANTHROPIC_ID = "00000000-0000-0000-0000-0000000000a1";
const SEED_ROWS: Entity[] = [
  makeEntity({ norm_key: "anthropic",       type: "actor",   canonical_name: "Anthropic", id: ANTHROPIC_ID }),
  makeEntity({ norm_key: "trump",           type: "person",  canonical_name: "Trump",     aliases: ["donald trump", "trump administration"] }),
  makeEntity({ norm_key: "claude",          type: "product", canonical_name: "Claude",    aliases: ["claude science", "claude sonnet 5"], parent_entity_id: ANTHROPIC_ID }),
  makeEntity({ norm_key: "fable",           type: "product", canonical_name: "Fable",     aliases: ["claude fable 5", "fable 5"], parent_entity_id: ANTHROPIC_ID }),
  makeEntity({ norm_key: "us",              type: "place",   canonical_name: "US" }),
  makeEntity({ norm_key: "federal reserve", type: "actor",   canonical_name: "Federal Reserve", aliases: ["fed"] }),
];

let registry: EntityRegistry;

// ---------------------------------------------------------------------------
// buildRegistryPriming
// ---------------------------------------------------------------------------

describe("buildRegistryPriming", () => {
  it("returns empty string for an empty registry", () => {
    expect(buildRegistryPriming(new Map())).toBe("");
  });

  it("formats entries as 'Name=type' pairs joined by ', '", () => {
    const reg = buildRegistry([
      makeEntity({ norm_key: "anthropic", type: "actor", canonical_name: "Anthropic", confidence: "seed" }),
      makeEntity({ norm_key: "claude",    type: "product", canonical_name: "Claude",  confidence: "seed" }),
    ]);
    const priming = buildRegistryPriming(reg);
    expect(priming).toContain("Anthropic=actor");
    expect(priming).toContain("Claude=product");
  });

  it("puts seed entries before ai_high before ai_low", () => {
    const reg = buildRegistry([
      makeEntity({ norm_key: "b", type: "actor",   canonical_name: "B", confidence: "ai_low"  }),
      makeEntity({ norm_key: "c", type: "product", canonical_name: "C", confidence: "ai_high" }),
      makeEntity({ norm_key: "a", type: "place",   canonical_name: "A", confidence: "seed"    }),
    ]);
    const priming = buildRegistryPriming(reg);
    expect(priming.indexOf("A=place")).toBeLessThan(priming.indexOf("C=product"));
    expect(priming.indexOf("C=product")).toBeLessThan(priming.indexOf("B=actor"));
  });

  it("caps output at the given limit", () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      makeEntity({ norm_key: `e${i}`, type: "other", canonical_name: `E${i}`, confidence: "seed" }),
    );
    const reg = buildRegistry(rows);
    const priming = buildRegistryPriming(reg, 3);
    // 3 entries → 2 commas
    expect(priming.split(", ")).toHaveLength(3);
  });
});

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
      parent_entity_id: null,
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
      parent_entity_id: null,
      first_seen_edition: null,
    };
    const incoming: EntityRow = {
      canonical_name: "Anthropic Inc",
      norm_key: "anthropic",
      type: "other",        // AI guessed wrong
      aliases: ["anthropic inc"],
      confidence: "ai_low",
      parent_entity_id: null,
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
      parent_entity_id: null,
      first_seen_edition: "edition-0",
    };
    const incoming: EntityRow = {
      canonical_name: "Fable",
      norm_key: "fable",
      type: "product",
      aliases: ["fable 5"],
      confidence: "ai_high",
      parent_entity_id: null,
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
      parent_entity_id: null,
      first_seen_edition: null,
    };
    const incoming: EntityRow = {
      canonical_name: "Claude",
      norm_key: "claude",
      type: "product",
      aliases: ["claude sonnet", "claude sonnet 4"],  // "claude sonnet" is a dupe
      confidence: "ai_high",
      parent_entity_id: null,
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
      parent_entity_id: null,
      first_seen_edition: null,
    };
    const incoming: EntityRow = {
      canonical_name: "Trump",
      norm_key: "trump",
      type: "actor",   // different guess at same confidence
      aliases: ["trump admin"],
      confidence: "seed",
      parent_entity_id: null,
      first_seen_edition: "edition-1",
    };
    const merged = mergeRegistryEntry(existing, incoming);
    expect(merged.type).toBe("person"); // tie → existing wins
  });

  // Phase F4 — parent_entity_id (product→actor link)
  it("keeps an existing parent link even when incoming omits it (null)", () => {
    const existing: EntityRow = {
      canonical_name: "Claude",
      norm_key: "claude",
      type: "product",
      aliases: [],
      confidence: "seed",
      parent_entity_id: ANTHROPIC_ID,
      first_seen_edition: null,
    };
    const incoming: EntityRow = {
      canonical_name: "Claude",
      norm_key: "claude",
      type: "product",
      aliases: [],
      confidence: "ai_high",
      parent_entity_id: null,        // scan didn't infer a parent this time
      first_seen_edition: "edition-1",
    };
    const merged = mergeRegistryEntry(existing, incoming);
    expect(merged.parent_entity_id).toBe(ANTHROPIC_ID); // link is the registry's memory
  });

  it("fills an unset parent link from an inferred incoming parent", () => {
    const existing: EntityRow = {
      canonical_name: "Mythos",
      norm_key: "mythos",
      type: "product",
      aliases: [],
      confidence: "ai_high",
      parent_entity_id: null,
      first_seen_edition: "edition-0",
    };
    const incoming: EntityRow = {
      canonical_name: "Mythos",
      norm_key: "mythos",
      type: "product",
      aliases: [],
      confidence: "ai_low",
      parent_entity_id: ANTHROPIC_ID, // scan spotted "Mythos, Anthropic's…"
      first_seen_edition: "edition-1",
    };
    const merged = mergeRegistryEntry(existing, incoming);
    expect(merged.parent_entity_id).toBe(ANTHROPIC_ID); // unset link gets filled
  });
});

// ---------------------------------------------------------------------------
// Phase F4 — parent helpers (product→actor connective tissue)
// ---------------------------------------------------------------------------

describe("buildEntityById", () => {
  it("indexes every entity by its id", () => {
    const reg = buildRegistry(SEED_ROWS);
    const byId = buildEntityById(reg);
    expect(byId.get(ANTHROPIC_ID)?.norm_key).toBe("anthropic");
    expect(byId.size).toBe(reg.size);
  });
});

describe("parentActorKey", () => {
  it("resolves a product to its actor's norm_key", () => {
    const reg = buildRegistry(SEED_ROWS);
    const byId = buildEntityById(reg);
    expect(parentActorKey("claude", reg, byId)).toBe("anthropic");
    expect(parentActorKey("fable", reg, byId)).toBe("anthropic");
  });

  it("follows an alias to the canonical product's parent", () => {
    const reg = buildRegistry(SEED_ROWS);
    const byId = buildEntityById(reg);
    // "claude sonnet 5" is an alias of claude, whose parent is anthropic
    expect(parentActorKey("claude sonnet 5", reg, byId)).toBe("anthropic");
  });

  it("returns undefined for an actor (no parent) or an unknown entity", () => {
    const reg = buildRegistry(SEED_ROWS);
    const byId = buildEntityById(reg);
    expect(parentActorKey("anthropic", reg, byId)).toBeUndefined();
    expect(parentActorKey("someone new", reg, byId)).toBeUndefined();
  });
});

describe("expandWithParents", () => {
  const normalize = (s: string) => s.toLowerCase();

  it("appends the parent norm_key, de-duped and originals-first", () => {
    const reg = buildRegistry(SEED_ROWS);
    const byId = buildEntityById(reg);
    const out = expandWithParents(["Claude", "Fable"], reg, byId, normalize);
    expect(out.slice(0, 2)).toEqual(["Claude", "Fable"]); // originals preserved, in order
    expect(out).toContain("anthropic");                    // parent appended once
    expect(out.filter((e) => e === "anthropic")).toHaveLength(1);
  });

  it("does not duplicate a parent already present in the item", () => {
    const reg = buildRegistry(SEED_ROWS);
    const byId = buildEntityById(reg);
    const out = expandWithParents(["anthropic", "Claude"], reg, byId, normalize);
    expect(out.filter((e) => e === "anthropic")).toHaveLength(1);
  });

  it("is the identity map when the registry is empty (back-compat)", () => {
    const empty: EntityRegistry = new Map();
    const out = expandWithParents(["Claude", "Fable"], empty, new Map(), normalize);
    expect(out).toEqual(["Claude", "Fable"]);
  });
});

// ---------------------------------------------------------------------------
// clusterByActor
// ---------------------------------------------------------------------------

describe("clusterByActor", () => {
  const normalize = (s: string) => s.toLowerCase();

  it("returns [] for an empty registry (no-op)", () => {
    const out = clusterByActor(
      [{ title: "t", entities: ["Claude"] }],
      new Map(),
      normalize,
    );
    expect(out).toEqual([]);
  });

  it("folds products to their parent actor and clusters across threads", () => {
    const reg = buildRegistry(SEED_ROWS);
    const out = clusterByActor(
      [
        { title: "Claude Science ships", entities: ["Claude"] },
        { title: "Fable 5 launches", entities: ["Fable"] },
      ],
      reg,
      normalize,
    );
    expect(out).toHaveLength(1);
    expect(out[0].actor).toBe("Anthropic");
    expect(out[0].type).toBe("actor");
    expect(out[0].items).toEqual(["Claude Science ships", "Fable 5 launches"]);
  });

  it("anchors directly on actor/person entities", () => {
    const reg = buildRegistry(SEED_ROWS);
    const out = clusterByActor(
      [
        { title: "Trump signs order", entities: ["Trump"] },
        { title: "Trump on tariffs", entities: ["donald trump"] },
      ],
      reg,
      normalize,
    );
    expect(out).toHaveLength(1);
    expect(out[0].actor).toBe("Trump");
    expect(out[0].type).toBe("person");
    expect(out[0].items).toHaveLength(2);
  });

  it("drops actors that span only a single thread (not a through-line)", () => {
    const reg = buildRegistry(SEED_ROWS);
    const out = clusterByActor(
      [{ title: "Claude only", entities: ["Claude"] }],
      reg,
      normalize,
    );
    expect(out).toEqual([]);
  });

  it("counts a thread once per actor even when it names both product and actor", () => {
    const reg = buildRegistry(SEED_ROWS);
    const out = clusterByActor(
      [
        { title: "Anthropic ships Claude", entities: ["Anthropic", "Claude"] },
        { title: "Fable 5 launches", entities: ["Fable"] },
      ],
      reg,
      normalize,
    );
    expect(out).toHaveLength(1);
    expect(out[0].items).toEqual(["Anthropic ships Claude", "Fable 5 launches"]);
  });

  it("ignores places and unknown entities", () => {
    const reg = buildRegistry(SEED_ROWS);
    const out = clusterByActor(
      [
        { title: "US story A", entities: ["US", "Something Unknown"] },
        { title: "US story B", entities: ["US"] },
      ],
      reg,
      normalize,
    );
    expect(out).toEqual([]);
  });

  it("sorts by cluster size descending", () => {
    const reg = buildRegistry(SEED_ROWS);
    const out = clusterByActor(
      [
        { title: "Fed A", entities: ["Fed"] },
        { title: "Fed B", entities: ["federal reserve"] },
        { title: "Anthropic X", entities: ["Claude"] },
        { title: "Anthropic Y", entities: ["Fable"] },
        { title: "Anthropic Z", entities: ["Anthropic"] },
      ],
      reg,
      normalize,
    );
    expect(out.map((c) => c.actor)).toEqual(["Anthropic", "Federal Reserve"]);
    expect(out[0].items).toHaveLength(3);
    expect(out[1].items).toHaveLength(2);
  });
});
