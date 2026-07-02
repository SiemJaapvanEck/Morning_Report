// Stap-handlers van de stappenmachine.
//
// Elke handler doet één afgebakend stuk werk, ruim binnen 10 seconden, en is
// idempotent: opnieuw draaien na een crash mag nooit dubbele data opleveren.
// De plan-stap bepaalt welke stappen een editie krijgt; latere stappen kunnen
// geen stappen toevoegen (strakke volgorde = voorspelbaar herstel).

import { db, unwrap } from "../shared/db";
import { currentBudgetMode, budgetPolicy } from "../shared/budget";
import { config, todayLocal } from "../shared/config";
import { fetchWeather } from "../weather";
import { fetchMarkten } from "../markten";
import { activeSources, ingestSource } from "../ingest";
import { scanBatch, loadScoreContext, priority, distributeBands, selectForScan, isUserSelected } from "../rank";
import type { CategoryBands } from "../rank";
import { summarizeSection, deepArticle, flattenArticle, generateThreadUpdate } from "../generate";
import { searchTavily, buildQuery, tavilyEnabled } from "../tavily";
import { assembleUserContext, composeDailyPaper, composeSectionIntros, type DigestTopic } from "../redactie";
import { dedupeForEdition, archivePrimer } from "../archive";
import { buildAgendaRows, persistAgendaRows, type AgendaItemInput } from "../calendar";
import {
  loadActiveThreads,
  loadLinkedItemIds,
  loadEditionCandidates,
  insertThread,
  linkThreadItems,
  touchThread,
  normalizeEntity,
  mergeEntities,
  selectLenses,
  orderThreads,
  nextThreadUpdateJob,
  applyThreadUpdate,
  fillBlankThreadDeepItems,
  detectAnchors,
  bigTopicAnchors,
  personalAnchors,
  mergeAnchors,
  matchByAnchor,
  resolveThreadMeta,
  isAnchorableEntity,
  canAnchorUmbrella,
  loadEntityDays,
  loadRegistry,
  storylineFacets,
  matchStorylines,
  shouldPromote,
  loadThreadItemEntities,
} from "../threads";
import { buildRegistry, mergeRegistryEntry, buildEntityById, expandWithParents, clusterByActor } from "../entities";
import type { EntityRow } from "../entities";
import type { Edition, Item, PipelineStep, Band, MarktSnapshot, DailyPaperArticle, Entity, EntityConfidence } from "../shared/types";

export interface StepContext {
  edition: Edition;
  step: PipelineStep;
}

export type StepHandler = (ctx: StepContext) => Promise<Record<string, unknown>>;

/**
 * Vervolgstap-patroon: stappen die meer werk hebben dan in ~7s past, doen één
 * begrensde portie en plannen zichzelf opnieuw in (zelfde positie, ronde+1).
 * Latere stappen blijven wachten tot alle rondes klaar zijn. De ronde-limiet
 * voorkomt eindeloos doorplannen.
 */
async function requeue(step: PipelineStep, maxRondes: number): Promise<boolean> {
  const ronde = Number(step.payload.ronde ?? 0) + 1;
  if (ronde >= maxRondes) return false;
  const { error } = await db().from("pipeline_steps").insert({
    edition_id: step.edition_id,
    kind: step.kind,
    payload: { ...step.payload, ronde },
    position: step.position,
  });
  if (error) throw new Error(`Requeue ${step.kind}: ${error.message}`);
  return true;
}

// ============================================================
// plan — stappenlijst voor de editie opbouwen
// ============================================================

const planStep: StepHandler = async ({ edition }) => {
  const sources = await activeSources();

  // ingest in batches van 4 bronnen per stap (~4-6s per stap)
  const batchSize = 4;
  const ingestSteps = [];
  for (let i = 0; i < sources.length; i += batchSize) {
    ingestSteps.push({
      kind: "ingest",
      payload: { source_ids: sources.slice(i, i + batchSize).map((s) => s.id) },
    });
  }

  const steps = [
    { kind: "weather", payload: {} },
    { kind: "markten", payload: {} },
    ...ingestSteps,
    { kind: "scan_rank", payload: {} },
    { kind: "select", payload: {} },
    { kind: "threads", payload: {} },
    { kind: "agenda", payload: {} },
    { kind: "generate", payload: {} },
    { kind: "daily_paper", payload: {} },
    { kind: "finalize", payload: {} },
  ];

  const rows = steps.map((step, i) => ({
    edition_id: edition.id,
    kind: step.kind,
    payload: step.payload,
    position: i + 1, // plan zelf is position 0
  }));

  const { error } = await db().from("pipeline_steps").insert(rows);
  if (error) throw new Error(`Plan: ${error.message}`);
  return { stappen: rows.length };
};

// ============================================================
// weather
// ============================================================

const weatherStep: StepHandler = async ({ edition }) => {
  const profile = unwrap(
    await db().from("profiles").select("*").eq("id", edition.profile_id).single(),
  );
  const settings = profile.settings ?? {};
  const weather = await fetchWeather(settings.lat, settings.lon, settings.plaats);

  // upsert-gedrag: oude weersectie van deze editie eerst weg (idempotent)
  await db().from("edition_sections").delete().eq("edition_id", edition.id).eq("kind", "weather");
  const { error } = await db().from("edition_sections").insert({
    edition_id: edition.id,
    kind: "weather",
    title: `Het weer in ${weather.plaats}`,
    position: 0,
    payload: weather as unknown as Record<string, unknown>,
  });
  if (error) throw new Error(`Weer: ${error.message}`);
  return { weer: weather.omschrijving, temp: weather.temp_nu };
};

// ============================================================
// markten — beurssnapshot per regio (gratis bron, €0/call)
// ============================================================

const marktenStep: StepHandler = async () => {
  // niet-blokkerend: fetchMarkten slaat falende indices over en gooit nooit;
  // de snapshot komt in het stap-result en wordt bij finalize in front_page gezet
  const snapshot = await fetchMarkten();
  return { markten: snapshot, opgehaald: snapshot.indices.length };
};

// ============================================================
// ingest — batch van bronnen binnenhalen
// ============================================================

const ingestStep: StepHandler = async ({ step }) => {
  const sourceIds = (step.payload.source_ids as string[]) ?? [];
  const sources = unwrap(await db().from("sources").select("*").in("id", sourceIds));

  const results = [];
  for (const source of sources) {
    results.push(await ingestSource(source));
  }
  return {
    bronnen: results.map((r) => ({ naam: r.sourceName, nieuw: r.nieuw, fout: r.fout })),
  };
};

// ============================================================
// scan_rank — nieuwe items classificeren (belang + reclame)
// ============================================================

const scanRankStep: StepHandler = async ({ edition, step }) => {
  // Fresh, still-unscanned items from the last 48h, newest first — a bounded
  // candidate pool, not the whole firehose.
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const candidates: Item[] = unwrap(
    await db()
      .from("items")
      .select("*")
      .is("importance", null)
      .eq("is_ad", false)
      .gte("fetched_at", cutoff)
      .order("published_at", { ascending: false })
      .limit(config.scan.candidatePool),
  );

  // Pre-scan gate: rank candidates by free signals (source weight × recency ×
  // interest) and only LLM-scan what clears the threshold. Items the reader
  // actively follows are always scanned, so their relevant news is never
  // gated away. Skipped items keep importance=null and age out of the window.
  const scoreCtx = await loadScoreContext(edition.profile_id);
  const userCtx = await assembleUserContext(edition.profile_id);
  const qualifying = selectForScan(
    candidates,
    scoreCtx,
    userCtx.followedTopicIds,
    userCtx.followedCategoryIds,
    config.scan.preRankThreshold,
  );
  const batch = qualifying.slice(0, config.scan.batchSize);

  // topiclijst voor de toewijzing: zo werken topic-voorkeuren (ook eigen,
  // heel specifieke topics) door in priority() → Sol's match-score
  const topics = unwrap(
    await db().from("topics").select("id, name, query_text"),
  ) as { id: string; name: string; query_text: string | null }[];

  const vastTopic = new Map(batch.map((item) => [item.id, item.topic_id]));
  // bestaande scan_meta bewaren (bv. media van media-bronnen) bij de update
  const existingMeta = new Map(batch.map((item) => [item.id, item.scan_meta ?? {}]));

  // Phase F2: load entity registry for type priming and write-back.
  const entityRows = unwrap(
    await db().from("entities").select("*"),
  ) as Entity[];
  const registry = buildRegistry(entityRows);

  let scanned = 0;
  if (batch.length > 0) {
    const verdicts = await scanBatch(batch, edition.id, step.id, topics, registry);

    // Write-back: collect typed entities across all verdicts and upsert to the
    // registry. Idempotent on norm_key; mergeRegistryEntry preserves higher-
    // confidence entries (seed > ai_high > ai_low).
    const toUpsert = new Map<string, EntityRow>();
    for (const [, verdict] of verdicts) {
      for (const normKey of Object.keys(verdict.entity_types)) {
        if (toUpsert.has(normKey)) continue;
        const aiConf = verdict.entity_confidence[normKey] ?? "low";
        const entityConf: EntityConfidence = aiConf === "high" ? "ai_high" : "ai_low";
        const displayName = verdict.entity_display[normKey] ?? normKey;
        const existing = registry.get(normKey);
        const existingRow: EntityRow | undefined = existing
          ? {
              canonical_name: existing.canonical_name,
              norm_key: existing.norm_key,
              type: existing.type,
              aliases: existing.aliases,
              confidence: existing.confidence,
              parent_entity_id: existing.parent_entity_id,
              first_seen_edition: existing.first_seen_edition,
            }
          : undefined;
        // F4: resolve an inferred product→actor parent to its registry id, but
        // only when the actor is already a known row (the FK requires it). New
        // actors link on a later edition once they've been written — idempotent
        // and convergent; mergeRegistryEntry never nulls a link once set.
        const parentKey = verdict.entity_parents[normKey];
        const parentId = parentKey ? (registry.get(parentKey)?.id ?? null) : null;
        const incoming: EntityRow = {
          canonical_name: displayName,
          norm_key: normKey,
          type: verdict.entity_types[normKey],
          aliases: [],
          confidence: entityConf,
          parent_entity_id: parentId,
          first_seen_edition: edition.id,
        };
        toUpsert.set(normKey, mergeRegistryEntry(existingRow, incoming));
      }
    }
    if (toUpsert.size > 0) {
      const upsertRows = [...toUpsert.values()].map((r) => ({
        canonical_name: r.canonical_name,
        norm_key: r.norm_key,
        type: r.type,
        aliases: r.aliases,
        confidence: r.confidence,
        parent_entity_id: r.parent_entity_id,
        first_seen_edition: r.first_seen_edition,
        updated_at: new Date().toISOString(),
      }));
      await db().from("entities").upsert(upsertRows, { onConflict: "norm_key" });
    }

    for (const [itemId, verdict] of verdicts) {
      await db()
        .from("items")
        .update({
          importance: verdict.belang,
          is_ad: verdict.isReclame,
          // een bron-gekoppeld topic (gezet bij ingestie) wint van de AI-gok
          topic_id: vastTopic.get(itemId) ?? verdict.topicId,
          // wereldregio voor de "waar komt het nieuws vandaan"-kaart, de
          // kernentiteiten voor thread-matching (fase 3) en de gedateerde
          // toekomst-events voor de agenda-stap (Phase B); merge zodat eerder
          // gezette velden (bv. media) niet verloren gaan
          scan_meta: {
            ...existingMeta.get(itemId),
            regio: verdict.regio,
            entities: verdict.entities,
            entity_types: verdict.entity_types,
            events: verdict.events,
          },
        })
        .eq("id", itemId);
      scanned++;
    }
  }

  // More qualifying items than fit this batch? Plan the next round. The scanned
  // items now have importance set, so they drop out of the pool next tick.
  let vervolg = false;
  if (qualifying.length > batch.length) {
    vervolg = await requeue(step, config.scan.maxRounds);
  }
  return {
    geclassificeerd: scanned,
    gekwalificeerd: qualifying.length,
    kandidaten: candidates.length,
    vervolg,
  };
};

// ============================================================
// select — kostenpoort: items kiezen en banden toewijzen
// ============================================================

const selectStep: StepHandler = async ({ edition }) => {
  const mode = await currentBudgetMode(edition.id);
  const ctx = await loadScoreContext(edition.profile_id);

  const cutoff = new Date(
    Date.now() - config.select.freshWindowHours * 60 * 60 * 1000,
  ).toISOString();
  const fresh: Item[] = unwrap(
    await db()
      .from("items")
      .select("*")
      .eq("is_ad", false)
      .not("importance", "is", null)
      .gte("fetched_at", cutoff)
      .order("published_at", { ascending: false })
      .limit(config.select.freshPoolLimit),
  );

  const unique = await dedupeForEdition(edition.profile_id, fresh);

  // groepeer per categorie, rangschik binnen elke categorie op prioriteit
  const categories = unwrap(await db().from("categories").select("*").order("position"));
  let sectionPosition = 1; // 0 = weer

  // idempotent: bestaande categorie-secties + items van deze editie opruimen
  const oldSections = unwrap(
    await db()
      .from("edition_sections")
      .select("id")
      .eq("edition_id", edition.id)
      .eq("kind", "category"),
  );
  if (oldSections.length > 0) {
    await db().from("edition_items").delete().eq("edition_id", edition.id);
    await db()
      .from("edition_sections")
      .delete()
      .in("id", oldSections.map((s: { id: string }) => s.id));
  }

  // Pass 1: rank each category, then distribute the deep budget GLOBALLY so
  // depth spreads across categories instead of 2-per-busy-section (Phase 4).
  const followedIds = new Set(
    unique
      .filter((item) => isUserSelected(item, ctx.followedTopicIds, ctx.followedCategoryIds))
      .map((item) => item.id),
  );
  const perCategory = categories
    .map((category) => {
      const inCategory = unique.filter((item) => item.category_id === category.id);
      const ranked = inCategory
        .map((item) => ({
          id: item.id,
          priority: priority(item, ctx),
          topicId: item.topic_id ?? null,
        }))
        .sort((a, b) => b.priority - a.priority)
        .slice(0, config.select.maxPerCategory);
      return { category, ranked };
    })
    .filter((c) => c.ranked.length > 0);

  const cats: CategoryBands[] = perCategory.map((c) => ({
    categoryId: c.category.id,
    ranked: c.ranked,
  }));
  const bands = distributeBands(cats, mode, {
    maxSummaries: config.select.maxSummariesPerSection,
    globalDeepCap: config.generate.maxDeepTopics,
    perCategoryDeepCap: config.generate.maxDeepPerCategory,
    deepFloor: config.generate.deepFloor,
    topicSummaryFloor: config.select.topicSummaryFloor,
    followedIds,
  });

  // Pass 2: create each section and insert its items with the assigned bands.
  let placed = 0;
  for (const { category, ranked } of perCategory) {
    const section = unwrap(
      await db()
        .from("edition_sections")
        .insert({
          edition_id: edition.id,
          kind: "category",
          category_id: category.id,
          title: category.name,
          position: sectionPosition++,
        })
        .select()
        .single(),
    );

    const rows = ranked.map((entry, i) => ({
      edition_id: edition.id,
      section_id: section.id,
      item_id: entry.id,
      band: bands.get(entry.id) ?? ("headline" as Band),
      position: i,
      // prioriteit kan boven 1 uitkomen (interesse × bron-gewicht); voor het
      // match-percentage op de kaarten clampen we naar 0..1
      match_score: Math.max(0, Math.min(1, entry.priority)),
    }));
    const { error } = await db().from("edition_items").insert(rows);
    if (error) throw new Error(`Select: ${error.message}`);
    placed += rows.length;
  }

  return { items: placed, budget_modus: mode };
};

// ============================================================
// threads — koppel editie-items aan blijvende verhaallijnen (geen AI)
// ============================================================
//
// Plaatst tussen select en generate. Elke thread is één zelfstandig verhaal,
// verankerd op één entiteit (Ford, PlayStation, Israël). Een thread ontstaat
// als zijn entiteit (a) over meerdere dagen terugkomt, (b) als groot cross-bron
// verhaal losbarst, of (c) door de lezer wordt gevolgd/gevolgd-als-thread.
// Items koppelen door simpelweg de anker-entiteit te bevatten. Geen AI → ruim
// binnen 7s, één doorloop. Idempotent: al gekoppelde items worden overgeslagen
// en thread_items heeft unique(thread_id,item_id) — opnieuw draaien is een no-op.

const threadsStep: StepHandler = async ({ edition }) => {
  const [candidates, threads, linked, userCtx, entityDays, registry] = await Promise.all([
    loadEditionCandidates(edition.id),
    loadActiveThreads(edition.profile_id),
    loadLinkedItemIds(edition.id),
    assembleUserContext(edition.profile_id),
    loadEntityDays(edition.profile_id, config.threads.anchorWindowDays),
    loadRegistry(),
  ]);

  const now = new Date().toISOString();

  // Phase F4: expand each candidate's entities with the actor every product/event
  // belongs to (product→actor link from the registry), so an item that names only
  // "Claude" also carries "anthropic" and thus flows into the Anthropic umbrella —
  // the connective tissue F3's co-occurrence heuristic couldn't provide. The
  // parent key is appended last, so a directly-named actor still outranks an
  // inferred one in matchByAnchor. Empty/parent-less registry ⇒ identity (no-op).
  const byId = buildEntityById(registry);
  for (const c of candidates) {
    c.entities = expandWithParents(c.entities, registry, byId, normalizeEntity);
  }

  // Entities that actually have news today — a recurring anchor only spawns or
  // links on a day it has something to say, so every new thread gets a seed item.
  const todayEntities = new Set<string>();
  for (const c of candidates) {
    for (const e of c.entities) {
      const n = normalizeEntity(e);
      if (n) todayEntities.add(n);
    }
  }

  // Qualifying anchors from each birth path, merged by entity (priority order).
  const recurring = detectAnchors(entityDays, config.threads.anchorMinDays, config.threads.anchorMinItems)
    .filter((a) => todayEntities.has(a.entity))
    .map((a) => ({ entity: a.entity, display: a.display, reason: "recurring" as const }));
  const big = bigTopicAnchors(
    candidates.map((c) => ({ id: c.itemId, entities: c.entities })),
    config.threads.bigTopicMinOverlap,
    config.threads.bigTopicMinCluster,
    registry,
  );
  const personal = personalAnchors(
    candidates,
    userCtx.followedTopicIds,
    userCtx.followedCategoryIds,
    userCtx.trackedTopicIds,
    registry,
  );
  // Drop bare datelines (US, France…) so they don't open catch-all threads, and
  // (Phase F3) product/event entities so a product never opens a sibling umbrella
  // next to its actor — it becomes a storyline facet instead. Lenient: untyped
  // ('other') entities still anchor, so new/untyped actors aren't starved.
  const anchors = mergeAnchors(recurring, big, personal).filter(
    (a) => isAnchorableEntity(a.entity) && canAnchorUmbrella(a.entity, registry),
  );

  // Existing BIG-thread anchors (umbrellas, parent_thread_id null) — the only
  // threads items match against as an anchor. Storyline children carry an
  // anchor_entity too (their facet) but must never be matched as a big anchor.
  const existingAnchors = new Set(
    threads.filter((t) => t.anchor_entity && !t.parent_thread_id).map((t) => t.anchor_entity as string),
  );

  // Open a big thread for each qualifying anchor that doesn't have one yet;
  // topic/category come from today's items carrying that anchor (so the archive
  // can filter it). The seed item is linked in the matching pass below.
  let created = 0;
  for (const a of anchors) {
    if (existingAnchors.has(a.entity)) continue;
    const meta = resolveThreadMeta(a.entity, candidates);
    await insertThread({
      profileId: edition.profile_id,
      topicId: meta.topicId,
      categoryId: meta.categoryId,
      title: a.display,
      entities: mergeEntities([a.entity], []),
      status: "active",
      lastEditionId: edition.id,
      lastSeenAt: now,
      anchorEntity: a.entity,
    });
    created++;
  }

  // Reload; big threads (umbrellas) are what candidates match against.
  const allThreads = await loadActiveThreads(edition.profile_id);
  const bigThreads = allThreads.filter((t) => t.anchor_entity && !t.parent_thread_id);

  // Assign each candidate to its single best big thread (anchor containment).
  const bigByItem = new Map<string, string>();
  for (const c of candidates) {
    const id = matchByAnchor(c.entities, bigThreads);
    if (id) bigByItem.set(c.itemId, id);
  }

  // --- Storyline splitting ------------------------------------------------
  // For each big thread with news today, detect the recurring secondary facets
  // over its full linked history plus today's fresh items; once >= promoteMinFacets
  // emerge, spawn a child storyline per new facet (inheriting the umbrella's
  // topic/category). Below the bar the thread stays flat, as before.
  const anchorById = new Map(bigThreads.map((t) => [t.id, t.anchor_entity as string]));
  // Other big anchors are sibling umbrellas — never a sub-storyline of each other.
  const bigAnchorSet = new Set(bigThreads.map((t) => t.anchor_entity as string));
  const touchedBigIds = new Set(bigByItem.values());
  const history = await loadThreadItemEntities([...touchedBigIds]);
  const existingFacetsByBig = new Map<string, Set<string>>();
  for (const t of allThreads) {
    if (t.parent_thread_id && t.anchor_entity) {
      const s = existingFacetsByBig.get(t.parent_thread_id) ?? new Set<string>();
      s.add(t.anchor_entity);
      existingFacetsByBig.set(t.parent_thread_id, s);
    }
  }

  let storylinesCreated = 0;
  for (const bigId of touchedBigIds) {
    const anchor = anchorById.get(bigId)!;
    // Today's contribution counts only unlinked items so a re-run (where today's
    // items already sit in `history`) doesn't double-count and inflate facets.
    const todayEnts = candidates
      .filter((c) => bigByItem.get(c.itemId) === bigId && !linked.has(c.itemId))
      .map((c) => ({ entities: c.entities }));
    const histEnts = (history.get(bigId) ?? []).map((entities) => ({ entities }));
    const facets = storylineFacets(anchor, [...histEnts, ...todayEnts], config.threads.facetMinItems, bigAnchorSet, registry);
    if (!shouldPromote(facets, config.threads.promoteMinFacets)) continue;
    const parent = bigThreads.find((t) => t.id === bigId)!;
    const have = existingFacetsByBig.get(bigId) ?? new Set<string>();
    for (const f of facets) {
      if (have.has(f.entity)) continue;
      await insertThread({
        profileId: edition.profile_id,
        topicId: parent.topic_id,
        categoryId: parent.category_id,
        title: f.display,
        entities: mergeEntities([anchor, f.entity], []),
        status: "active",
        lastEditionId: edition.id,
        lastSeenAt: now,
        anchorEntity: f.entity,
        parentThreadId: bigId,
      });
      storylinesCreated++;
    }
  }

  // Reload once more so storylines spawned this edition are linkable now.
  const finalThreads = storylinesCreated > 0 ? await loadActiveThreads(edition.profile_id) : allThreads;
  const storylinesByBig = new Map<string, { id: string; anchor_entity: string | null }[]>();
  for (const t of finalThreads) {
    if (t.parent_thread_id && t.anchor_entity) {
      const arr = storylinesByBig.get(t.parent_thread_id) ?? [];
      arr.push({ id: t.id, anchor_entity: t.anchor_entity });
      storylinesByBig.set(t.parent_thread_id, arr);
    }
  }

  // --- Linking (many-to-many at the storyline level) ----------------------
  // Each new item links to the specific storyline(s) whose facet it carries. If
  // its big thread has storylines but the item matches none, it links to the
  // umbrella (a general bucket); an unpromoted big thread links flat, as before.
  // Idempotent: items already linked this edition are skipped, and the upsert
  // ignores duplicates.
  const links: { threadId: string; itemId: string; editionId: string }[] = [];
  const addedByThread = new Map<string, string[]>();
  const addLink = (threadId: string, c: (typeof candidates)[number]) => {
    links.push({ threadId, itemId: c.itemId, editionId: edition.id });
    addedByThread.set(threadId, [...(addedByThread.get(threadId) ?? []), ...c.entities]);
  };
  for (const c of candidates) {
    if (linked.has(c.itemId)) continue;
    const bigId = bigByItem.get(c.itemId);
    if (!bigId) continue;
    const children = storylinesByBig.get(bigId) ?? [];
    const matched = children.length ? matchStorylines(c.entities, children) : [];
    if (matched.length) {
      for (const sid of matched) addLink(sid, c);
    } else {
      addLink(bigId, c);
    }
  }
  await linkThreadItems(links);

  // Merge entities + mark seen on every touched thread (big or storyline).
  const entById = new Map(finalThreads.map((t) => [t.id, t.entities]));
  for (const [threadId, addEnts] of addedByThread) {
    const existing = entById.get(threadId) ?? [];
    await touchThread(threadId, mergeEntities(existing, addEnts), edition.id, now);
  }

  return {
    kandidaten: candidates.length,
    gekoppeld: links.length,
    nieuwe_threads: created,
    nieuwe_verhaallijnen: storylinesCreated,
    overgeslagen: linked.size,
    ankers: anchors.length,
  };
};

// ============================================================
// generate — samenvattingen + deep-dives per sectie
// ============================================================

const generateStep: StepHandler = async ({ edition, step }) => {
  const mode = await currentBudgetMode(edition.id);
  const allowDeep = budgetPolicy[mode].deepDivesPerSectie > 0;

  // Items linked to a thread this edition: their deep band is written by the
  // thread-update path below, so the per-section deep-dive branch skips them.
  const threadLinkedItems = await loadLinkedItemIds(edition.id);

  // One work unit per call (~5-8s); the rest via requeue. Priority: a thread
  // update first (it builds on stored state), otherwise one section unit.
  let generated = 0;
  let didWork = false;

  if (allowDeep) {
    const job = await nextThreadUpdateJob(edition.id, edition.profile_id, config.generate.maxThreadUpdates);
    if (job) {
      const lenses = selectLenses(job.categorySlug, job.topicName, job.threadEntities);
      const primer = await archivePrimer(edition.profile_id, job.topicId, job.categoryId);
      // already-scheduled (non-prediction) events on this thread — extra grounding
      const scheduledRows = unwrap(
        await db()
          .from("calendar_events")
          .select("title, date, certainty, meta")
          .eq("thread_id", job.threadId)
          .gte("date", todayLocal()),
      ) as { title: string; date: string; certainty: string; meta: Record<string, unknown> | null }[];
      const scheduledEvents = scheduledRows
        .filter((e) => e.meta?.prediction !== true)
        .map((e) => ({ title: e.title, date: e.date, certainty: e.certainty }));
      // Phase 5 — web grounding: enrich thin RSS source with real article text
      // before synthesis, so ripples have something concrete to stand on. The
      // call never throws (empty grounding on any failure), so it's safe inline.
      const grounding = tavilyEnabled()
        ? await searchTavily(buildQuery(job.title, job.threadEntities))
        : undefined;
      const update = await generateThreadUpdate(
        {
          thread: { title: job.title, state: job.state },
          newItems: job.newItems.map((n) => ({ title: n.title, summary: n.summary, content: n.content, url: n.url })),
          lenses,
          archivePrimer: primer,
          scheduledEvents,
          grounding,
          storyline: job.facet && job.umbrellaTitle ? { umbrella: job.umbrellaTitle, facet: job.facet } : undefined,
        },
        mode,
        edition.id,
        step.id,
      );
      if (update) {
        await applyThreadUpdate(job.deepEditionItemIds, job.threadId, edition.profile_id, edition.id, update);
      } else {
        // defensive (unreachable while allowDeep): never loop on a blank gate
        const fallback = job.newItems[0]?.summary || job.title;
        for (const id of job.deepEditionItemIds) {
          await db().from("edition_items").update({ summary_text: fallback }).eq("id", id);
        }
      }
      generated++;
      didWork = true;
    }
  }

  if (!didWork) {
    // Phase D3 overflow: no deep thread-update ran this tick — threads past the
    // per-edition cap, shared deep items no storyline claimed, or a degraded
    // budget (minimaal/stop) that skips deep AI. Give any blank thread-linked
    // deep card a no-AI fallback body so it's never blank and this loop
    // terminates. Runs in every budget mode (it costs nothing); idempotent.
    const filled = await fillBlankThreadDeepItems(edition.id);
    if (filled > 0) {
      generated += filled;
      didWork = true;
    }
  }

  if (!didWork) {
    const sections = unwrap(
      await db()
        .from("edition_sections")
        .select("*")
        .eq("edition_id", edition.id)
        .eq("kind", "category")
        .order("position"),
    );

    for (const section of sections) {
      const editionItems = unwrap(
        await db()
          .from("edition_items")
          .select("*, items(*)")
          .eq("section_id", section.id)
          .order("position"),
      ) as unknown as ({ id: string; band: Band; summary_text: string | null; items: Item })[];

      // idempotent: items met al een summary_text overslaan; thread-items vallen
      // onder de thread-update-tak hierboven, niet onder de losse deep-dive
      const summaryItems = editionItems
        .filter((entry) => entry.band === "summary" && !entry.summary_text)
        .map((entry) => entry.items);
      const deepItems = editionItems.filter(
        (entry) =>
          entry.band === "deep" && !entry.summary_text && !threadLinkedItems.has(entry.items.id),
      );

      if (summaryItems.length === 0 && deepItems.length === 0) continue;

      if (summaryItems.length > 0) {
        const summaries = await summarizeSection(section.title, summaryItems, mode, edition.id, step.id);
        for (const summary of summaries) {
          await db()
            .from("edition_items")
            .update({ summary_text: summary.text })
            .eq("edition_id", edition.id)
            .eq("item_id", summary.itemId);
          generated++;
        }
      } else {
        const entry = deepItems[0];
        // Phase 4: a non-storyline deep item gets the SAME two-layer article
        // (lead + ripples) as a thread update, stored as both flat text (card)
        // and structured jsonb (krant), so every deep topic has real depth.
        // Phase 5: ground it with web search first (entities from scan_meta, when
        // present) so a one-off deep topic gets the same enrichment as a thread.
        const entities = Array.isArray(entry.items.scan_meta?.entities)
          ? (entry.items.scan_meta!.entities as string[])
          : [];
        const grounding = tavilyEnabled()
          ? await searchTavily(buildQuery(entry.items.title, entities))
          : undefined;
        const article = await deepArticle(entry.items, mode, edition.id, step.id, grounding);
        if (article) {
          await db()
            .from("edition_items")
            .update({ summary_text: flattenArticle(article), article })
            .eq("id", entry.id);
          generated++;
        }
      }
      didWork = true;
      break; // one section unit per call
    }
  }

  // Requeue while this tick did work; the first tick that finds nothing stops.
  const vervolg = didWork ? await requeue(step, 60) : false;
  return { gegenereerd: generated, budget_modus: mode, vervolg };
};

// ============================================================
// daily_paper — one neutral, topic-driven cross-reference synthesis
// ============================================================

const dailyPaperStep: StepHandler = async ({ edition, step }) => {
  const mode = await currentBudgetMode(edition.id);
  const ctx = await assembleUserContext(edition.profile_id);

  // Today's edition items, grouped by their category section. The section
  // title is the category name; only categories that actually have items today
  // become topics — that is what keeps the digest topic-driven.
  const rows = unwrap(
    await db()
      .from("edition_items")
      .select("position, items(title, topic_id, category_id), edition_sections(title)")
      .eq("edition_id", edition.id)
      .order("position"),
  ) as unknown as {
    items: { title: string; topic_id: string | null; category_id: string | null } | null;
    edition_sections: { title: string } | null;
  }[];

  const byCategory = new Map<string, DigestTopic>();
  for (const row of rows) {
    const name = row.edition_sections?.title;
    if (!name || !row.items) continue;
    const followed = Boolean(
      (row.items.topic_id && ctx.followedTopicIds.has(row.items.topic_id)) ||
        (row.items.category_id && ctx.followedCategoryIds.has(row.items.category_id)),
    );
    const topic = byCategory.get(name) ?? { name, followed: false, headlines: [] };
    topic.followed = topic.followed || followed;
    if (topic.headlines.length < 4) topic.headlines.push(row.items.title); // a few headlines per topic
    byCategory.set(name, topic);
  }

  const topics: DigestTopic[] = [...byCategory.values()];

  // This edition's thread updates become the Daily Paper's lead articles
  // (reused from generate — not rewritten). Deep items linked to a thread carry
  // the update body; the thread carries the headline/state.
  const links = unwrap(
    await db().from("thread_items").select("thread_id, item_id").eq("edition_id", edition.id),
  ) as { thread_id: string; item_id: string }[];
  const threadByItem = new Map(links.map((l) => [l.item_id, l.thread_id]));
  const deltaByThread = new Map<string, number>();
  for (const l of links) deltaByThread.set(l.thread_id, (deltaByThread.get(l.thread_id) ?? 0) + 1);

  const deepRows = unwrap(
    await db()
      .from("edition_items")
      .select("item_id, summary_text, article, items(image_url)")
      .eq("edition_id", edition.id)
      .eq("band", "deep"),
  ) as unknown as {
    item_id: string;
    summary_text: string | null;
    article: import("../shared/types").DeepArticle | null;
    items: { image_url: string | null } | null;
  }[];

  const threadIds = [...new Set(deepRows.map((d) => threadByItem.get(d.item_id)).filter(Boolean))] as string[];
  const threads = threadIds.length
    ? (unwrap(
        await db().from("threads").select("id, title, topic_id, category_id, entities, prediction").in("id", threadIds),
      ) as {
        id: string;
        title: string;
        topic_id: string | null;
        category_id: string | null;
        entities: string[];
        prediction: import("../shared/types").ThreadPrediction | null;
      }[])
    : [];
  const cats = unwrap(await db().from("categories").select("id, slug")) as { id: string; slug: string }[];
  const catSlug = new Map(cats.map((c) => [c.id, c.slug]));
  const topicNames = threads.some((t) => t.topic_id)
    ? (unwrap(
        await db().from("topics").select("id, name").in("id", threads.map((t) => t.topic_id).filter(Boolean) as string[]),
      ) as { id: string; name: string }[])
    : [];
  const topicName = new Map(topicNames.map((t) => [t.id, t.name]));

  const ranked = orderThreads(
    threads
      .map((thread) => {
        const deep = deepRows.find((d) => threadByItem.get(d.item_id) === thread.id && d.summary_text);
        if (!deep) return null;
        const followed = Boolean(
          (thread.topic_id && ctx.followedTopicIds.has(thread.topic_id)) ||
            (thread.category_id && ctx.followedCategoryIds.has(thread.category_id)),
        );
        const lenses = selectLenses(
          thread.category_id ? catSlug.get(thread.category_id) ?? null : null,
          thread.topic_id ? topicName.get(thread.topic_id) ?? null : null,
          thread.entities,
        );
        // Phase-1 editions carry the structured article; older ones only have
        // the flat summary_text, which becomes the lead with no ripples.
        const deepArticle = deep.article ?? { lead: deep.summary_text ?? "", ripples: [] };
        const article: DailyPaperArticle = {
          thread_id: thread.id,
          headline: thread.title,
          lead: deepArticle.lead,
          ripples: deepArticle.ripples ?? [],
          followed,
          image_url: deep.items?.image_url ?? null,
          destep_lenses: lenses,
          is_update: true,
          prediction: thread.prediction ?? null,
        };
        return { followed, deltaSize: deltaByThread.get(thread.id) ?? 1, article };
      })
      .filter((x): x is { followed: boolean; deltaSize: number; article: DailyPaperArticle } => x !== null),
  );

  const dp_articles: DailyPaperArticle[] = ranked.map((r) => r.article);

  // Actor through-lines (F5): fold today's threads' entities up to their umbrella
  // actor so the digest can cross-reference at the actor level, not just topic
  // level. Empty/parent-less registry ⇒ [] (no-op).
  const registry = await loadRegistry();
  const actorClusters = clusterByActor(
    threads.map((t) => ({ title: t.title, entities: t.entities })),
    registry,
    normalizeEntity,
  );

  // The editorial wrapper: summary + intro + one broad general roundup.
  const parts = await composeDailyPaper(
    dp_articles.map((a) => a.headline),
    topics,
    mode,
    edition.id,
    step.id,
    actorClusters,
  );

  // Sol's per-section editorial text: caption + small summary for each category.
  const dp_sections = await composeSectionIntros(topics, mode, edition.id, step.id);
  if (parts) {
    dp_articles.push({
      thread_id: null,
      headline: parts.generalHeadline,
      lead: parts.generalBody,
      ripples: [],
      followed: false,
      image_url: null,
      destep_lenses: [],
      is_update: false,
      prediction: null,
    });
  }

  return {
    dp_summary: parts?.summary ?? null,
    dp_intro: parts?.intro ?? null,
    dp_articles,
    dp_sections,
    // back-compat for finalize/BriefingHero until Phase 5b renders dp_*
    daily_paper: parts?.generalBody ?? null,
    intro: parts?.summary ?? null,
    topics: topics.length,
    threads: ranked.length,
  };
};

// ============================================================
// finalize — voorpagina samenstellen, editie afronden
// ============================================================

const finalizeStep: StepHandler = async ({ edition }) => {
  // Daily digest + the short lead derived from it (from the daily_paper step).
  // Take the latest done one, so a re-run never trips over an earlier row.
  const dpRow = await db()
    .from("pipeline_steps")
    .select("result")
    .eq("edition_id", edition.id)
    .eq("kind", "daily_paper")
    .eq("status", "done")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const daily_paper = (dpRow.data?.result?.daily_paper as string | undefined) ?? null;
  const intro = (dpRow.data?.result?.intro as string | undefined) ?? null;
  const dp_summary = (dpRow.data?.result?.dp_summary as string | undefined) ?? null;
  const dp_intro = (dpRow.data?.result?.dp_intro as string | undefined) ?? null;
  const dp_articles = (dpRow.data?.result?.dp_articles as DailyPaperArticle[] | undefined) ?? null;
  const dp_sections =
    (dpRow.data?.result?.dp_sections as import("../shared/types").DailyPaperSection[] | undefined) ?? null;

  const weather = await db()
    .from("edition_sections")
    .select("payload")
    .eq("edition_id", edition.id)
    .eq("kind", "weather")
    .maybeSingle();

  // beurssnapshot uit de markten-stap halen (kan ontbreken → null)
  const marktenRow = await db()
    .from("pipeline_steps")
    .select("result")
    .eq("edition_id", edition.id)
    .eq("kind", "markten")
    .maybeSingle();
  const markten = (marktenRow.data?.result?.markten as MarktSnapshot | undefined) ?? null;

  const topRows = unwrap(
    await db()
      .from("edition_items")
      .select("item_id, items(title), edition_sections(title)")
      .eq("edition_id", edition.id)
      .eq("band", "deep")
      .limit(5),
  ) as unknown as {
    item_id: string;
    items: { title: string };
    edition_sections: { title: string } | null;
  }[];

  // regio-telling voor de "waar komt het nieuws vandaan"-kaart: tel de items
  // van deze editie per wereldregio (scan_meta.regio, gezet in scan_rank)
  const geoRows = unwrap(
    await db().from("edition_items").select("items(scan_meta)").eq("edition_id", edition.id),
  ) as unknown as { items: { scan_meta: { regio?: string | null } | null } | null }[];

  const regios: Record<string, number> = {};
  for (const row of geoRows) {
    const regio = row.items?.scan_meta?.regio;
    if (regio && regio !== "geen") regios[regio] = (regios[regio] ?? 0) + 1;
  }

  const frontPage = {
    intro,
    daily_paper,
    dp_summary,
    dp_intro,
    dp_articles,
    dp_sections,
    weather: weather.data?.payload ?? null,
    markten,
    regios,
    top_items: topRows.map((row) => ({
      item_id: row.item_id,
      title: row.items.title,
      section_title: row.edition_sections?.title ?? "",
    })),
  };

  const { error } = await db()
    .from("editions")
    .update({ status: "done", front_page: frontPage, finished_at: new Date().toISOString() })
    .eq("id", edition.id);
  if (error) throw new Error(`Finalize: ${error.message}`);
  return { klaar: true };
};

// ============================================================
// agenda — gedateerde toekomst-events uit de scan in de kalender zetten
// ============================================================
//
// Loopt na `threads` zodat een event de verhaallijn van zijn bronitem erft. De
// scan heeft per item al de expliciet gedateerde gebeurtenissen in
// scan_meta.events gezet; hier filteren we op scope (gevolgd óf in een thread),
// valideren we (echte toekomstdatum, bekende soort) en schrijven we ze per
// profiel weg, gekoppeld aan bronitem en thread. Idempotent: de events van deze
// editie-items worden eerst verwijderd en daarna opnieuw opgebouwd.

const agendaStep: StepHandler = async ({ edition }) => {
  const rows = unwrap(
    await db()
      .from("edition_items")
      .select("item_id, items(url, topic_id, category_id, scan_meta)")
      .eq("edition_id", edition.id),
  ) as unknown as {
    item_id: string;
    items: {
      url: string | null;
      topic_id: string | null;
      category_id: string | null;
      scan_meta: { events?: AgendaItemInput["events"] } | null;
    } | null;
  }[];

  const userCtx = await assembleUserContext(edition.profile_id);
  const threadByItem = new Map(
    (
      unwrap(
        await db().from("thread_items").select("thread_id, item_id").eq("edition_id", edition.id),
      ) as { thread_id: string; item_id: string }[]
    ).map((r) => [r.item_id, r.thread_id]),
  );

  const inputs: AgendaItemInput[] = rows
    .filter((r) => r.items != null)
    .map((r) => {
      const item = r.items!;
      const followed =
        (item.topic_id != null && userCtx.followedTopicIds.has(item.topic_id)) ||
        (item.category_id != null && userCtx.followedCategoryIds.has(item.category_id));
      return {
        itemId: r.item_id,
        topicId: item.topic_id,
        followed,
        threadId: threadByItem.get(r.item_id) ?? null,
        source: item.url,
        events: item.scan_meta?.events ?? [],
      };
    });

  const eligibleItemIds = inputs
    .filter((i) => i.followed || i.threadId != null)
    .map((i) => i.itemId);
  const agendaRows = buildAgendaRows(edition.profile_id, inputs, todayLocal());

  await persistAgendaRows(eligibleItemIds, agendaRows);
  return { events: agendaRows.length, kandidaatItems: eligibleItemIds.length };
};

// ============================================================
// Registry
// ============================================================

export const stepRegistry: Record<string, StepHandler> = {
  plan: planStep,
  weather: weatherStep,
  markten: marktenStep,
  ingest: ingestStep,
  scan_rank: scanRankStep,
  select: selectStep,
  threads: threadsStep,
  agenda: agendaStep,
  generate: generateStep,
  daily_paper: dailyPaperStep,
  finalize: finalizeStep,
};
