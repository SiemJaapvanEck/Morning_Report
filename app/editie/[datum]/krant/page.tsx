// The full krant of one edition: every section with all its items (the deepest
// reading layer). Reached via the "Lees de krant" button on the day dashboard.

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { hasDbConfig } from "@/modules/shared/db";
import { getEdition } from "@/app/lib/queries";
import { EditieWeergave } from "@/app/components/EditieWeergave";

export const dynamic = "force-dynamic";

export default async function KrantPagina({
  params,
}: {
  params: Promise<{ datum: string }>;
}) {
  const { datum } = await params;
  if (!hasDbConfig() || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) notFound();

  const cookieStore = await cookies();
  const profileId = cookieStore.get("mr_profile")?.value;
  if (!profileId) notFound();

  const view = await getEdition(profileId, datum);
  if (!view) notFound();

  // Full-bleed: EditieWeergave breaks out of the app shell and brings its own
  // utility bar (with the back link to the dashboard).
  return <EditieWeergave view={view} />;
}
