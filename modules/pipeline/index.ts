// De stappenmachine zelf: tick() is het enige publieke aanspreekpunt.
//
// Een externe scheduler (of de dev-runner) roept tick() elke ~2 minuten aan
// tussen 06:30 en 08:15. Elke tick:
//   1. zorgt dat de edities van vandaag bestaan (met een plan-stap)
//   2. claimt en draait stappen totdat het tijdbudget (~7s) op is
//
// Valt een stap om, dan wordt hij gemarkeerd als failed en pakt een volgende
// tick hem opnieuw op (tot max_attempts). De machine komt dus altijd verder —
// nooit een half rapport dat handmatig herstel nodig heeft.

import { db, unwrap } from "../shared/db";
import { config, todayLocal } from "../shared/config";
import { stepRegistry } from "./steps";
import type { Edition, PipelineStep } from "../shared/types";

export interface TickResult {
  editionsCreated: number;
  stepsRun: { kind: string; status: "done" | "failed"; ms: number; error?: string }[];
  /** true zolang er nog werk open staat */
  pending: boolean;
}

/** Edities van vandaag aanmaken voor alle profielen die er nog geen hebben. */
async function ensureEditions(date: string): Promise<number> {
  const profiles = unwrap(await db().from("profiles").select("id"));
  let created = 0;

  for (const profile of profiles) {
    const existing = await db()
      .from("editions")
      .select("id")
      .eq("profile_id", profile.id)
      .eq("date", date)
      .maybeSingle();
    if (existing.data) continue;

    const edition = unwrap(
      await db()
        .from("editions")
        .insert({ profile_id: profile.id, date, status: "running" })
        .select()
        .single(),
    );
    await db().from("pipeline_steps").insert({
      edition_id: edition.id,
      kind: "plan",
      position: 0,
    });
    created++;
  }
  return created;
}

/** Eén stap claimen en uitvoeren. Geeft null terug als er niets open staat. */
async function runOneStep(): Promise<TickResult["stepsRun"][number] | null> {
  const { data, error } = await db().rpc("claim_next_step", {
    max_attempts: config.pipeline.maxAttempts,
  });
  if (error) throw new Error(`claim_next_step: ${error.message}`);
  const step = (data as PipelineStep[] | null)?.[0];
  if (!step) return null;

  const edition: Edition = unwrap(
    await db().from("editions").select("*").eq("id", step.edition_id).single(),
  );

  const handler = stepRegistry[step.kind];
  const start = Date.now();

  if (!handler) {
    await db()
      .from("pipeline_steps")
      .update({ status: "failed", error: `Onbekende stap: ${step.kind}`, finished_at: new Date().toISOString() })
      .eq("id", step.id);
    return { kind: step.kind, status: "failed", ms: 0, error: "onbekende stap" };
  }

  try {
    const result = await handler({ edition, step });
    await db()
      .from("pipeline_steps")
      .update({ status: "done", result, error: null, finished_at: new Date().toISOString() })
      .eq("id", step.id);
    return { kind: step.kind, status: "done", ms: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const definitief = step.attempts >= config.pipeline.maxAttempts;
    await db()
      .from("pipeline_steps")
      .update({
        // na de laatste poging: skipped, zodat de editie niet eeuwig blokkeert
        status: definitief ? "skipped" : "failed",
        error: message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", step.id);
    return { kind: step.kind, status: "failed", ms: Date.now() - start, error: message };
  }
}

/** Eén scheduler-tick: edities garanderen + stappen draaien binnen het tijdbudget. */
export async function tick(): Promise<TickResult> {
  const date = todayLocal();
  const editionsCreated = await ensureEditions(date);

  const stepsRun: TickResult["stepsRun"] = [];
  const deadline = Date.now() + config.pipeline.tickBudgetMs;

  while (Date.now() < deadline) {
    const result = await runOneStep();
    if (!result) break; // niets meer open
    stepsRun.push(result);
    if (result.status === "failed") break; // niet doorrennen op een fout; volgende tick retryt
  }

  const open = await db()
    .from("pipeline_steps")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "failed"]);

  return { editionsCreated, stepsRun, pending: (open.count ?? 0) > 0 };
}
