// Stap-handlers van de stappenmachine.
//
// Elke handler doet één afgebakend stuk werk, ruim binnen 10 seconden, en is
// idempotent: opnieuw draaien na een crash mag nooit dubbele data opleveren.
// De plan-stap bepaalt welke stappen een editie krijgt; latere stappen kunnen
// geen stappen toevoegen (strakke volgorde = voorspelbaar herstel).

import { db, unwrap } from "../shared/db";
import { currentBudgetMode } from "../shared/budget";
import { fetchWeather } from "../weather";
import { activeSources, ingestSource } from "../ingest";
import { scanBatch, loadScoreContext, priority, assignBands } from "../rank";
import { summarizeSection, deepDive } from "../generate";
import { writeIntro } from "../sol";
import { dedupeForEdition } from "../archive";
import type { Edition, Item, PipelineStep, Band } from "../shared/types";

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
    ...ingestSteps,
    { kind: "scan_rank", payload: {} },
    { kind: "select", payload: {} },
    { kind: "generate", payload: {} },
    { kind: "sol_intro", payload: {} },
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
  // items van de afgelopen 48u die nog geen belang-score hebben;
  // max 2 batches (~50 items) per aanroep i.v.m. de 10s-limiet
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const items: Item[] = unwrap(
    await db()
      .from("items")
      .select("*")
      .is("importance", null)
      .eq("is_ad", false)
      .gte("fetched_at", cutoff)
      .order("published_at", { ascending: false })
      .limit(50),
  );

  let scanned = 0;
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    const verdicts = await scanBatch(batch, edition.id, step.id);
    for (const [itemId, verdict] of verdicts) {
      await db()
        .from("items")
        .update({ importance: verdict.belang, is_ad: verdict.isReclame })
        .eq("id", itemId);
      scanned++;
    }
  }

  // meer ongescande items? volgende ronde inplannen (max 6 ≈ 300 items)
  let vervolg = false;
  if (items.length === 50) {
    vervolg = await requeue(step, 6);
  }
  return { geclassificeerd: scanned, vervolg };
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
    }));
    const { error } = await db().from("edition_items").insert(rows);
    if (error) throw new Error(`Select: ${error.message}`);
    placed += rows.length;
  }

  return { items: placed, budget_modus: mode };
};

// ============================================================
// generate — samenvattingen + deep-dives per sectie
// ============================================================

const generateStep: StepHandler = async ({ edition, step }) => {
  const mode = await currentBudgetMode(edition.id);

  const sections = unwrap(
    await db()
      .from("edition_sections")
      .select("*")
      .eq("edition_id", edition.id)
      .eq("kind", "category")
      .order("position"),
  );

  // één werkeenheid per aanroep — de samenvattingsbatch van één sectie, óf
  // één deep-dive — zodat elke aanroep ~5-8s blijft; de rest via vervolgstappen
  let generated = 0;
  let didWork = false;
  let workRemains = false;

  for (const section of sections) {
    const editionItems = unwrap(
      await db()
        .from("edition_items")
        .select("*, items(*)")
        .eq("section_id", section.id)
        .order("position"),
    ) as unknown as ({ id: string; band: Band; summary_text: string | null; items: Item })[];

    // idempotent: items met al een summary_text overslaan
    const summaryItems = editionItems
      .filter((entry) => entry.band === "summary" && !entry.summary_text)
      .map((entry) => entry.items);
    const deepItems = editionItems.filter((entry) => entry.band === "deep" && !entry.summary_text);

    if (summaryItems.length === 0 && deepItems.length === 0) continue;

    if (didWork) {
      workRemains = true;
      break;
    }

    if (summaryItems.length > 0) {
      // werkeenheid: de samenvattingsbatch van deze sectie
      const summaries = await summarizeSection(section.title, summaryItems, mode, edition.id, step.id);
      for (const summary of summaries) {
        await db()
          .from("edition_items")
          .update({ summary_text: summary.text })
          .eq("edition_id", edition.id)
          .eq("item_id", summary.itemId);
        generated++;
      }
      if (deepItems.length > 0) workRemains = true;
    } else {
      // werkeenheid: één deep-dive
      const entry = deepItems[0];
      const text = await deepDive(entry.items, mode, edition.id, step.id);
      if (text) {
        await db().from("edition_items").update({ summary_text: text }).eq("id", entry.id);
        generated++;
      }
      if (deepItems.length > 1) workRemains = true;
    }
    didWork = true;
  }

  let vervolg = false;
  if (workRemains) {
    vervolg = await requeue(step, 40); // ruim boven het max aantal werkeenheden
  }
  return { gegenereerd: generated, budget_modus: mode, vervolg };
};

// ============================================================
// sol_intro
// ============================================================

const solIntroStep: StepHandler = async ({ edition, step }) => {
  const mode = await currentBudgetMode(edition.id);

  const topRows = unwrap(
    await db()
      .from("edition_items")
      .select("band, position, items(title), edition_sections(title)")
      .eq("edition_id", edition.id)
      .in("band", ["deep", "summary"])
      .order("position")
      .limit(8),
  ) as unknown as { items: { title: string }; edition_sections: { title: string } | null }[];

  const topItems = topRows.map((row) => ({
    title: row.items.title,
    sectionTitle: row.edition_sections?.title ?? "",
  }));

  const intro = await writeIntro(edition.profile_id, edition.id, topItems, step.id, mode);
  return { intro_geschreven: Boolean(intro), intro };
};

// ============================================================
// finalize — voorpagina samenstellen, editie afronden
// ============================================================

const finalizeStep: StepHandler = async ({ edition }) => {
  // intro uit de sol_intro-stap halen
  const solStep = unwrap(
    await db()
      .from("pipeline_steps")
      .select("result")
      .eq("edition_id", edition.id)
      .eq("kind", "sol_intro")
      .single(),
  );
  const intro = (solStep.result?.intro as string | undefined) ?? null;

  const weather = await db()
    .from("edition_sections")
    .select("payload")
    .eq("edition_id", edition.id)
    .eq("kind", "weather")
    .maybeSingle();

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

  const frontPage = {
    intro,
    weather: weather.data?.payload ?? null,
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
  ingest: ingestStep,
  scan_rank: scanRankStep,
  select: selectStep,
  generate: generateStep,
  sol_intro: solIntroStep,
  finalize: finalizeStep,
};
