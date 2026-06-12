// Instellingen: interesses (bewerkbaar, zelfde kiezer als de onboarding),
// bronnen en invoer.

import Link from "next/link";
import { cookies } from "next/headers";
import { db, hasDbConfig, unwrap } from "@/modules/shared/db";
import { getVoorkeurenData } from "@/app/lib/voorkeuren";
import { CaptureFormulier } from "@/app/components/CaptureFormulier";
import { VoorkeurenKiezer } from "@/app/components/VoorkeurenKiezer";
import { DevPaneel } from "@/app/components/DevPaneel";
import type { Source } from "@/modules/shared/types";

export const dynamic = "force-dynamic";

export default async function InstellingenPagina() {
  if (!hasDbConfig()) {
    return <p className="text-sm text-stone-500">Supabase is nog niet gekoppeld — zie docs/setup.md.</p>;
  }

  const cookieStore = await cookies();
  const profileId = cookieStore.get("mr_profile")?.value;
  if (!profileId) {
    return (
      <p className="text-sm text-stone-500">
        Kies eerst een profiel op de <Link href="/" className="underline">voorpagina</Link>.
      </p>
    );
  }

  const sources: Source[] = unwrap(await db().from("sources").select("*").order("name"));
  const voorkeuren = await getVoorkeurenData(profileId);
  const { categories, topics } = voorkeuren;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-semibold">Instellingen</h1>
        <p className="mt-1 text-sm text-stone-500">
          Scores zijn zichtbaar en groeien mee met je ratings — geen black box.
        </p>
      </section>

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
            sources={voorkeuren.sources}
            initieel={voorkeuren.initieel}
            modus="instellingen"
          />
        </div>
      </section>

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
  );
}
