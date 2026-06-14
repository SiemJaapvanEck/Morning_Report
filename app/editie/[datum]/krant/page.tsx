// De volledige krant van één editie: alle secties met al hun items (de diepste
// leeslaag). Bereikbaar via de "Lees de krant"-knop op het dag-dashboard.
// De Daily Paper-synthese (Redactie) komt hier later tussen als depth-2.

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
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

  return (
    <div>
      <Link
        href={`/editie/${datum}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
      >
        ← Terug naar het dashboard
      </Link>
      <EditieWeergave view={view} />
    </div>
  );
}
