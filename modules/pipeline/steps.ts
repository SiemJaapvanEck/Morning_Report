// Stap-handlers van de stappenmachine.
//
// Elke handler doet één afgebakend stuk werk, ruim binnen 10 seconden, en is
// idempotent: opnieuw draaien na een crash mag nooit dubbele data opleveren.
// De plan-stap bepaalt welke stappen een editie krijgt; latere stappen kunnen
// geen stappen toevoegen (strakke volgorde = voorspelbaar herstel).

import { db, unwrap } from "../shared/db";
import { currentBudgetMode, budgetPolicy } from "../shared/budget";
import { config } from "../shared/config";
import { fetchWeather } from "../weather";
import { fetchMarkten } from "../markten";
import { activeSources, ingestSource } from "../ingest";
import { scanBatch, loadScoreContext, priority, assignBands, selectForScan } from "../rank";
import { summarizeSection, deepDive, generateThreadUpdate } from "../generate";
import { assembleUserContext, composeDailyPaper, type DigestTopic } from "../redactie";
import { dedupeForEdition, archivePrimer } from "../archive";
import {
  loadActiveThreads,
  loadLinkedItemIds,
  loadEditionCandidates,
  insertThread,
  linkThreadItems,
  touchThread,
  planThreadActions,
  mergeEntities,
  selectLenses,
  orderThreads,
  nextThreadUpdateJob,
  applyThreadUpdate,
  detectAnchors,
  assignMegaThreads,
  loadEntityDays,
  findOrCreateMegaThread,
  setThreadParent,
  clearThreadParents,
  deleteChildlessMegaThreads,
} from "../threads";
import type { Edition, Item, PipelineStep, Band, MarktSnapshot, DailyPaperArticle } from "../shared/types";

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

  let scanned = 0;
  if (batch.length > 0) {
    const verdicts = await scanBatch(batch, edition.id, step.id, topics);
    for (const [itemId, verdict] of verdicts) {
      await db()
        .from("items")
        .update({
          importance: verdict.belang,
          is_ad: verdict.isReclame,
          // een bron-gekoppeld topic (gezet bij ingestie) wint van de AI-gok
          topic_id: vastTopic.get(itemId) ?? verdict.topicId,
          // wereldregio voor de "waar komt het nieuws vandaan"-kaart + de
          // kernentiteiten voor thread-matching (fase 3); merge zodat eerder
          // gezette velden (bv. media) niet verloren gaan
          scan_meta: { ...existingMeta.get(itemId), regio: verdict.regio, entities: verdict.entities },
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

  const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
  const fresh: Item[] = unwrap(
    await db()
      .from("items")
      .select("*")
      .eq("is_ad", false)
      .not("importance", "is", null)
      .gte("fetched_at", cutoff)
      .order("published_at", { ascending: false })
      .limit(200),
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

  let placed = 0;
  for (const category of categories) {
    const inCategory = unique.filter((item) => item.category_id === category.id);
    if (inCategory.length === 0) continue;

    const ranked = inCategory
      .map((item) => ({ id: item.id, priority: priority(item, ctx) }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10); // max 10 items per sectie

    const bands = assignBands(ranked, mode);

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
// Plaatst tussen select en generate. Matcht elk editie-item op bestaande
// threads (gratis entity-overlap), opent een nieuwe thread alleen voor wat de
// lezer volgt of voor een groot cross-bron-verhaal, en mergt entities terug op
// geraakte threads. Geen AI → ruim binnen 7s, één doorloop (geen vervolgstap).
// Idempotent: items die deze editie al gekoppeld zijn worden overgeslagen, en
// thread_items heeft unique(thread_id,item_id) — opnieuw draaien verandert niets.

const threadsStep: StepHandler = async ({ edition }) => {
  const [candidates, threads, linked, userCtx] = await Promise.all([
    loadEditionCandidates(edition.id),
    loadActiveThreads(edition.profile_id),
    loadLinkedItemIds(edition.id),
    assembleUserContext(edition.profile_id),
  ]);

  // Items match/link to normal threads only; mega-threads (anchor_entity set)
  // are containers, never matched directly — their children absorb the news.
  const matchPool = threads.filter((t) => !t.anchor_entity);
  const actions = planThreadActions(
    candidates,
    matchPool,
    linked,
    userCtx.followedTopicIds,
    userCtx.followedCategoryIds,
    {
      matchMinOverlap: config.threads.matchMinOverlap,
      bigTopicMinOverlap: config.threads.bigTopicMinOverlap,
      bigTopicMinCluster: config.threads.bigTopicMinCluster,
    },
  );

  const now = new Date().toISOString();

  // Open the new storylines and link their seed items.
  let created = 0;
  for (const nt of actions.newThreads) {
    const threadId = await insertThread({
      profileId: edition.profile_id,
      topicId: nt.topicId,
      categoryId: nt.categoryId,
      title: nt.seedTitle,
      entities: mergeEntities(nt.entities, []), // normalize + dedupe + cap
      status: "active",
      lastEditionId: edition.id,
      lastSeenAt: now,
    });
    await linkThreadItems(
      nt.memberItemIds.map((itemId) => ({ threadId, itemId, editionId: edition.id })),
    );
    created++;
  }

  // Link items into their existing threads, then merge entities + touch each one.
  await linkThreadItems(
    actions.links.map((l) => ({ threadId: l.threadId, itemId: l.itemId, editionId: edition.id })),
  );

  const candidateById = new Map(candidates.map((c) => [c.itemId, c]));
  const threadById = new Map(threads.map((t) => [t.id, t]));
  const addedByThread = new Map<string, string[]>();
  for (const l of actions.links) {
    const ents = candidateById.get(l.itemId)?.entities ?? [];
    addedByThread.set(l.threadId, [...(addedByThread.get(l.threadId) ?? []), ...ents]);
  }
  for (const [threadId, addEnts] of addedByThread) {
    const existing = threadById.get(threadId)?.entities ?? [];
    await touchThread(threadId, mergeEntities(existing, addEnts), edition.id, now);
  }

  // Mega-threads: an anchor entity that recurs across days AND spans several
  // child threads graduates into a parent that absorbs them (its timeline dots).
  // The whole structure is re-derived deterministically each run: assign every
  // child to its single best anchor, detach stragglers, drop orphan parents.
  // Reload threads so this edition's freshly-created children are included.
  const entityDays = await loadEntityDays(edition.profile_id, config.threads.anchorWindowDays);
  const anchors = detectAnchors(entityDays, config.threads.anchorMinDays);
  const afterThreads = await loadActiveThreads(edition.profile_id);
  const assignments = assignMegaThreads(anchors, afterThreads, config.threads.anchorMinChildren);

  const keep = new Set<string>();
  let absorbed = 0;
  for (const a of assignments) {
    const megaId = await findOrCreateMegaThread(
      edition.profile_id,
      a.entity,
      a.display,
      edition.id,
      now,
    );
    const children = a.childIds.filter((id) => id !== megaId);
    await setThreadParent(children, megaId);
    for (const id of children) keep.add(id);
    absorbed += children.length;
  }
  // Detach normal threads that are parented to a mega but no longer assigned.
  const stale = afterThreads
    .filter((t) => !t.anchor_entity && t.parent_thread_id && !keep.has(t.id))
    .map((t) => t.id);
  await clearThreadParents(stale);
  // Remove mega-threads left without children.
  const orphansRemoved = await deleteChildlessMegaThreads(edition.profile_id);

  return {
    kandidaten: candidates.length,
    gekoppeld: actions.links.length,
    nieuwe_threads: created,
    overgeslagen: linked.size,
    mega_threads: assignments.length,
    geabsorbeerd: absorbed,
    wees_verwijderd: orphansRemoved,
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
    const job = await nextThreadUpdateJob(edition.id);
    if (job) {
      const lenses = selectLenses(job.categorySlug, job.topicName, job.threadEntities);
      const primer = await archivePrimer(edition.profile_id, job.topicId, job.categoryId);
      const update = await generateThreadUpdate(
        {
          thread: { title: job.title, state: job.state },
          newItems: job.newItems.map((n) => ({ title: n.title, summary: n.summary, url: n.url })),
          lenses,
          archivePrimer: primer,
        },
        mode,
        edition.id,
        step.id,
      );
      if (update) {
        await applyThreadUpdate(job.deepEditionItemIds, job.threadId, update);
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
        const text = await deepDive(entry.items, mode, edition.id, step.id);
        if (text) {
          await db().from("edition_items").update({ summary_text: text }).eq("id", entry.id);
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
      .select("item_id, summary_text, items(image_url)")
      .eq("edition_id", edition.id)
      .eq("band", "deep"),
  ) as unknown as { item_id: string; summary_text: string | null; items: { image_url: string | null } | null }[];

  const threadIds = [...new Set(deepRows.map((d) => threadByItem.get(d.item_id)).filter(Boolean))] as string[];
  const threads = threadIds.length
    ? (unwrap(
        await db().from("threads").select("id, title, topic_id, category_id, entities").in("id", threadIds),
      ) as { id: string; title: string; topic_id: string | null; category_id: string | null; entities: string[] }[])
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
        const article: DailyPaperArticle = {
          thread_id: thread.id,
          headline: thread.title,
          body: deep.summary_text as string,
          followed,
          image_url: deep.items?.image_url ?? null,
          destep_lenses: lenses,
          is_update: true,
        };
        return { followed, deltaSize: deltaByThread.get(thread.id) ?? 1, article };
      })
      .filter((x): x is { followed: boolean; deltaSize: number; article: DailyPaperArticle } => x !== null),
  );

  const dp_articles: DailyPaperArticle[] = ranked.map((r) => r.article);

  // The editorial wrapper: summary + intro + one broad general roundup.
  const parts = await composeDailyPaper(dp_articles.map((a) => a.headline), topics, mode, edition.id, step.id);
  if (parts) {
    dp_articles.push({
      thread_id: null,
      headline: parts.generalHeadline,
      body: parts.generalBody,
      followed: false,
      image_url: null,
      destep_lenses: [],
      is_update: false,
    });
  }

  return {
    dp_summary: parts?.summary ?? null,
    dp_intro: parts?.intro ?? null,
    dp_articles,
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
  generate: generateStep,
  daily_paper: dailyPaperStep,
  finalize: finalizeStep,
};
