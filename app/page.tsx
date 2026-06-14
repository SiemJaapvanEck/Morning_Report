// Voorpagina: dashboard met weer/stats, editie-punten, de Daily paper-kaart
// en Sol's selectie (schets 2026-06-11). De volledige krant leeft op
// /editie/[datum]. Geen profiel-cookie → profielkiezer. Geen Supabase-config
// → setupscherm.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasDbConfig } from "@/modules/shared/db";
import { todayLocal } from "@/modules/shared/config";
import { isRegioCode } from "@/modules/shared/regios";
import { getProfiles, getEdition, listEditions } from "@/app/lib/queries";
import { ProfielKiezer } from "@/app/components/ProfielKiezer";
import { VoorpaginaAtlas } from "@/app/components/VoorpaginaAtlas";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ regio?: string }>;
}) {
  if (!hasDbConfig()) {
    return (
      <div className="mx-auto mt-12 max-w-md text-center">
        <h1 className="text-xl font-semibold">Bijna klaar voor de eerste editie</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500">
          Supabase is nog niet gekoppeld. Volg <code>docs/setup.md</code>: maak een
          Supabase-project aan, draai de migraties en zet de variabelen in{" "}
          <code>.env.local</code>.
        </p>
      </div>
    );
  }

  const cookieStore = await cookies();
  const profileId = cookieStore.get("mr_profile")?.value;
  const profiles = await getProfiles();

  const profile = profiles.find((p) => p.id === profileId);
  if (!profileId || !profile) {
    return <ProfielKiezer profiles={profiles} />;
  }

  // eerst voorkeuren instellen — die zijn het startpunt van Sol's match-score
  if (!profile.settings?.voorkeuren_ingesteld) {
    redirect("/onboarding");
  }

  const { regio } = await searchParams;
  const selectedRegio = isRegioCode(regio) ? regio : null;

  const today = todayLocal();
  const [view, editions] = await Promise.all([
    getEdition(profileId, today),
    listEditions(profileId, 10),
  ]);

  return (
    <div>
      {view && view.edition.status !== "done" && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Deze editie is nog in de maak — wat je ziet groeit nog aan.
        </div>
      )}
      <VoorpaginaAtlas view={view} editions={editions} today={today} profileName={profile.name} selectedRegio={selectedRegio} />
    </div>
  );
}
