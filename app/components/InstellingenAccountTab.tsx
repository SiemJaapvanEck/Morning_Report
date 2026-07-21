// Account tab content: onderwerp toevoegen, interesses (VoorkeurenKiezer,
// unchanged), bronnen-overzicht, developer-paneel. This is the pre-existing
// /instellingen page content, relocated into the Account tab as-is (MOR-15
// Phase 1) — no behavior change. A later phase (MOR-18) adds "Mijn onderzoek"
// here alongside these sections.

import { CaptureFormulier } from "@/app/components/CaptureFormulier";
import { VoorkeurenKiezer } from "@/app/components/VoorkeurenKiezer";
import { DevPaneel } from "@/app/components/DevPaneel";
import type { Category, Source, Topic } from "@/modules/shared/types";

export function InstellingenAccountTab({
  sources,
  categories,
  topics,
  voorkeurenSources,
  initieel,
}: {
  sources: Source[];
  categories: Category[];
  topics: Topic[];
  voorkeurenSources: Source[];
  initieel: Record<string, { volgen: boolean; relevantie: number; track: boolean }>;
}) {
  return (
    <div className="grid items-start gap-x-12 gap-y-10 lg:grid-cols-2">
      <div className="space-y-10">
        <section>
          <h2 className="font-semibold">Onderwerp toevoegen</h2>
          <p className="mt-1 text-sm text-stone-500">
            Vrije onderwerpen zonder feed worden &apos;s ochtends actief opgezocht.
          </p>
          <div className="mt-3">
            <CaptureFormulier />
          </div>
        </section>

        <section>
          <h2 className="font-semibold">Interesses</h2>
          <p className="mt-1 text-sm text-stone-500">
            Wat je volgt en hoe relevant (−2…+2) — het startpunt van Sol&apos;s
            match-percentage; je ratings stellen het daarna bij.
          </p>
          <div className="mt-3">
            <VoorkeurenKiezer
              categories={categories}
              topics={topics}
              sources={voorkeurenSources}
              initieel={initieel}
              modus="instellingen"
            />
          </div>
        </section>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="font-semibold">Bronnen</h2>
          <ul className="mt-3 divide-y divide-stone-200 text-sm dark:divide-stone-800">
            {sources.map((source) => (
              <li key={source.id} className="flex items-baseline justify-between py-2">
                <span className={source.active ? "" : "text-stone-400 line-through"}>
                  {source.name}
                </span>
                <span className="text-xs text-stone-400">
                  {source.last_error
                    ? `⚠ ${source.last_error.slice(0, 60)}`
                    : source.last_fetched_at
                      ? `laatst: ${new Date(source.last_fetched_at).toLocaleString("nl-NL")}`
                      : "nog niet opgehaald"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-semibold">Developer</h2>
          <p className="mt-1 text-sm text-stone-500">
            Testgereedschap: pipeline direct draaien en testdata beheren.
          </p>
          <div className="mt-3">
            <DevPaneel />
          </div>
        </section>
      </div>
    </div>
  );
}
