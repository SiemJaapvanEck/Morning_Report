"use client";

// Developer-paneel (Instellingen): quick pipeline test, oude test-edities
// seeden en testdata opruimen. De pipeline-test draait tick() in een lus —
// exact dezelfde code als de ochtend-scheduler, met live log.

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TickResult {
  editionsCreated: number;
  stepsRun: { kind: string; status: "done" | "failed"; ms: number; error?: string }[];
  pending: boolean;
}

async function devActie<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/dev", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
  return data;
}

export function DevPaneel() {
  const router = useRouter();
  const [bezig, setBezig] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  function schrijf(regel: string) {
    setLog((prev) => [...prev.slice(-40), regel]);
  }

  async function quickPipelineTest() {
    setBezig("pipeline");
    setLog([]);
    schrijf("▶ Quick pipeline test — ticks draaien tot er geen werk meer is…");
    try {
      for (let ronde = 1; ronde <= 60; ronde++) {
        const result = await devActie<TickResult>({ action: "tick" });
        if (result.editionsCreated > 0) {
          schrijf(`✦ ${result.editionsCreated} editie(s) aangemaakt`);
        }
        for (const stap of result.stepsRun) {
          schrijf(
            `${stap.status === "done" ? "✓" : "✗"} ${stap.kind} (${stap.ms}ms)` +
              (stap.error ? ` — ${stap.error}` : ""),
          );
        }
        if (!result.pending) {
          schrijf("■ Klaar — geen openstaande stappen meer.");
          break;
        }
        if (result.stepsRun.length === 0) {
          schrijf("■ Geen claimbare stappen (geblokkeerd of max pogingen).");
          break;
        }
      }
      router.refresh();
    } catch (err) {
      schrijf(`✗ Fout: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBezig(null);
    }
  }

  async function seedOud() {
    setBezig("seed");
    schrijf("▶ Oude test-edities seeden…");
    try {
      const result = await devActie<{ datums: string[]; artikelen: number }>({
        action: "seed_oud",
        dagen: 4,
      });
      schrijf(
        result.datums.length > 0
          ? `✓ ${result.datums.length} editie(s) geseed (${result.datums.join(", ")}) — ${result.artikelen} artikelen`
          : "■ Niets geseed — er bestonden al edities op die datums.",
      );
      router.refresh();
    } catch (err) {
      schrijf(`✗ Fout: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBezig(null);
    }
  }

  async function opruimen() {
    setBezig("opruimen");
    schrijf("▶ Testdata opruimen…");
    try {
      const result = await devActie<{ edities: number; items: number }>({ action: "opruimen" });
      schrijf(`✓ ${result.edities} test-editie(s) en ${result.items} test-artikel(en) verwijderd.`);
      router.refresh();
    } catch (err) {
      schrijf(`✗ Fout: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBezig(null);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-stone-300 p-4 dark:border-stone-700">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={quickPipelineTest}
          disabled={bezig !== null}
          className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900"
        >
          {bezig === "pipeline" ? "Pipeline draait…" : "⚡ Quick pipeline test"}
        </button>
        <button
          type="button"
          onClick={seedOud}
          disabled={bezig !== null}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-stone-700"
        >
          {bezig === "seed" ? "Seeden…" : "Oude edities seeden (4 dagen)"}
        </button>
        <button
          type="button"
          onClick={opruimen}
          disabled={bezig !== null}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-500 disabled:opacity-40 dark:border-stone-700"
        >
          {bezig === "opruimen" ? "Opruimen…" : "Testdata opruimen"}
        </button>
      </div>
      <p className="mt-2 text-xs text-stone-400">
        De pipeline-test draait exact dezelfde stappenmachine als &apos;s ochtends
        (let op: echte AI-calls, dus echte — kleine — kosten). Geseedde edities
        zijn gratis testdata en altijd weer op te ruimen.
      </p>
      {log.length > 0 && (
        <pre className="mt-3 max-h-56 overflow-y-auto rounded-lg bg-stone-100 p-3 font-mono text-xs leading-relaxed dark:bg-stone-900">
          {log.join("\n")}
        </pre>
      )}
    </div>
  );
}
