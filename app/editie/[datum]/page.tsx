// Eén specifieke editie uit het archief (datum = YYYY-MM-DD).

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { hasDbConfig } from "@/modules/shared/db";
import { getEdition } from "@/app/lib/queries";
import { EditieWeergave } from "@/app/components/EditieWeergave";

export const dynamic = "force-dynamic";

export default async function EditiePagina({
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

  return <EditieWeergave view={view} />;
}
