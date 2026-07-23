// Voorpagina = de editie van vandaag, als Atlas-dashboard met kalendernavigatie.
// Bladeren naar andere dagen gebeurt via /editie/[datum] (zelfde scherm).
// Geen profiel-cookie → profielkiezer. Geen Supabase-config → setupscherm.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasDbConfig } from "@/modules/shared/db";
import { todayLocal } from "@/modules/shared/config";
import { isRegioCode } from "@/modules/shared/regios";
import { getProfiles, getEdition, listEditionSummaries, getUpcomingAgenda } from "@/app/lib/queries";
import { getFinanceDashboardSnapshot } from "@/app/lib/financeDashboard";
import { ProfielKiezer } from "@/app/components/ProfielKiezer";
import { EditionScreen, parseView } from "@/app/components/EditionScreen";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ regio?: string; view?: string }>;
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

  const { regio, view } = await searchParams;
  const selectedRegio = isRegioCode(regio) ? regio : null;
  const calendarView = parseView(view);

  const today = todayLocal();
  // The homepage is always today's edition, so the finance snapshot is always
  // fetched here (never for a historical date — see app/editie/[datum]/page.tsx).
  const [editionView, summaries, agenda, financeSnapshot] = await Promise.all([
    getEdition(profileId, today),
    listEditionSummaries(profileId),
    getUpcomingAgenda(profileId),
    getFinanceDashboardSnapshot(profileId),
  ]);

  return (
    <div>
      {calendarView === "day" && editionView && editionView.edition.status !== "done" && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Deze editie is nog in de maak — wat je ziet groeit nog aan.
        </div>
      )}
      <EditionScreen
        date={today}
        today={today}
        view={calendarView}
        profileName={profile.name}
        selectedRegio={selectedRegio}
        editionView={editionView}
        summaries={summaries}
        agenda={agenda}
        financeSnapshot={financeSnapshot}
      />
    </div>
  );
}
