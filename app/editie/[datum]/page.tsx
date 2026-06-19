// Eén editie uit het archief (datum = YYYY-MM-DD), getoond als hetzelfde
// Atlas-dashboard als de homepage, met kalendernavigatie. Een datum zonder
// editie toont een lege staat (geen 404) zodat je vrij kunt bladeren; de
// volledige krant staat op /editie/[datum]/krant.

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { hasDbConfig } from "@/modules/shared/db";
import { todayLocal } from "@/modules/shared/config";
import { isRegioCode } from "@/modules/shared/regios";
import { getEdition, getProfiles, listEditionSummaries, getUpcomingAgenda } from "@/app/lib/queries";
import { EditionScreen, parseView } from "@/app/components/EditionScreen";

export const dynamic = "force-dynamic";

export default async function EditiePagina({
  params,
  searchParams,
}: {
  params: Promise<{ datum: string }>;
  searchParams: Promise<{ regio?: string; view?: string }>;
}) {
  const { datum } = await params;
  if (!hasDbConfig() || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) notFound();

  const cookieStore = await cookies();
  const profileId = cookieStore.get("mr_profile")?.value;
  if (!profileId) notFound();

  const profiles = await getProfiles();
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) notFound();

  const { regio, view } = await searchParams;
  const selectedRegio = isRegioCode(regio) ? regio : null;

  const today = todayLocal();
  const [editionView, summaries, agenda] = await Promise.all([
    getEdition(profileId, datum),
    listEditionSummaries(profileId),
    getUpcomingAgenda(profileId),
  ]);

  return (
    <EditionScreen
      date={datum}
      today={today}
      view={parseView(view)}
      profileName={profile.name}
      selectedRegio={selectedRegio}
      editionView={editionView}
      summaries={summaries}
      agenda={agenda}
    />
  );
}
