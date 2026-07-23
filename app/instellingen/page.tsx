// Instellingen: tabbed shell — Account · Financiën · Pipeline-rapport.
// Account hosts the pre-existing preferences content (onderwerp toevoegen,
// interesses/VoorkeurenKiezer, bronnen, developer-paneel), unchanged.
// Pipeline-rapport mounts today's edition report + trends (MOR-16, Phase 2 —
// see getPipelineReport() in app/lib/queries.ts). Financiën is still a
// placeholder its integration phase (MOR-17) fills in.
// See docs/prd/settings-tabs.md (Phases 1-2).
//
// "Mijn onderzoek" (Research Tracking PRD, Phase 4 — MOR-13) is mounted below
// as a temporary section, deliberately OUTSIDE InstellingenTabs and without
// touching InstellingenAccountTab.tsx — folding it into the Account tab is
// MOR-18's job (Settings P4), which depends on this component existing.

import Link from "next/link";
import { cookies } from "next/headers";
import { db, hasDbConfig, unwrap } from "@/modules/shared/db";
import { getVoorkeurenData } from "@/app/lib/voorkeuren";
import { getPipelineReport, getResearch } from "@/app/lib/queries";
import { InstellingenTabs } from "@/app/components/InstellingenTabs";
import { InstellingenAccountTab } from "@/app/components/InstellingenAccountTab";
import { InstellingenPipelineTab } from "@/app/components/InstellingenPipelineTab";
import { InstellingenLeegState } from "@/app/components/InstellingenLeegState";
import { MijnOnderzoek } from "@/app/components/MijnOnderzoek";
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
  const pipelineReport = await getPipelineReport(profileId);
  const research = await getResearch(profileId);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-semibold">Instellingen</h1>
        <p className="mt-1 text-sm text-stone-500">
          Scores zijn zichtbaar en groeien mee met je ratings — geen black box.
        </p>
      </section>

      <InstellingenTabs
        account={
          <InstellingenAccountTab
            sources={sources}
            categories={categories}
            topics={topics}
            voorkeurenSources={voorkeuren.sources}
            initieel={voorkeuren.initieel}
          />
        }
        financien={
          <InstellingenLeegState
            titel="Financiën"
            beschrijving="Beleggingen, doelen, holdings-snelkoppelingen en kerncijfers verschijnen hier zodra deze tab gevuld wordt."
            volgende="Wordt gevuld in een volgende fase (MOR-17)."
          />
        }
        pipeline={<InstellingenPipelineTab report={pipelineReport} />}
      />

      {/* Temporary mount (MOR-13) — MOR-18 folds this into the Account tab. */}
      <section className="border-t border-[var(--line)] pt-10">
        <MijnOnderzoek initial={research} />
      </section>
    </div>
  );
}
