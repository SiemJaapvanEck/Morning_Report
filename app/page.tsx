// Voorpagina: de editie van vandaag voor het gekozen profiel.
// Geen profiel-cookie → profielkiezer. Geen Supabase-config → setupscherm.

import { cookies } from "next/headers";
import { hasDbConfig } from "@/modules/shared/db";
import { todayLocal } from "@/modules/shared/config";
import { getProfiles, getEdition } from "@/app/lib/queries";
import { ProfielKiezer } from "@/app/components/ProfielKiezer";
import { EditieWeergave } from "@/app/components/EditieWeergave";

export const dynamic = "force-dynamic";

export default async function Home() {
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

  if (!profileId || !profiles.some((profile) => profile.id === profileId)) {
    return <ProfielKiezer profiles={profiles} />;
  }

  const view = await getEdition(profileId, todayLocal());

  if (!view) {
    return (
      <div className="mx-auto mt-12 max-w-md text-center">
        <h1 className="text-xl font-semibold">Nog geen editie voor vandaag</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500">
          De pipeline draait &apos;s ochtends tussen 06:30 en 08:15. Lokaal kun je hem
          starten met <code>npm run pipeline</code>.
        </p>
      </div>
    );
  }

  if (view.edition.status !== "done") {
    return (
      <div>
        <div className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Deze editie is nog in de maak — wat je ziet groeit nog aan.
        </div>
        <EditieWeergave view={view} />
      </div>
    );
  }

  return <EditieWeergave view={view} />;
}
