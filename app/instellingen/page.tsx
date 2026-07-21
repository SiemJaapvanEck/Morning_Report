// Instellingen: tabbed shell — Account · Financiën · Pipeline-rapport.
// Account hosts the pre-existing preferences content (onderwerp toevoegen,
// interesses/VoorkeurenKiezer, bronnen, developer-paneel), unchanged.
// Financiën and Pipeline-rapport are placeholders their integration phases
// (MOR-17, MOR-16) fill in — the shell ships independently of those.
// See docs/prd/settings-tabs.md (Phase 1).

import Link from "next/link";
import { cookies } from "next/headers";
import { db, hasDbConfig, unwrap } from "@/modules/shared/db";
import { getVoorkeurenData } from "@/app/lib/voorkeuren";
import { InstellingenTabs } from "@/app/components/InstellingenTabs";
import { InstellingenAccountTab } from "@/app/components/InstellingenAccountTab";
import { InstellingenLeegState } from "@/app/components/InstellingenLeegState";
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
        pipeline={
          <InstellingenLeegState
            titel="Pipeline-rapport"
            beschrijving="Wat de pipeline vandaag opleverde en kostte — artikelen, bronnen, kosten, Sol-stukken — plus 7- en 30-daagse trends."
            volgende="Wordt gevuld in een volgende fase (MOR-16)."
          />
        }
      />
    </div>
  );
}
