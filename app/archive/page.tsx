// Archive — "Alle verhalen" (Phase B). A flat list of every anchor thread as a
// self-contained story timeline. Coexists with the calendar /archief (saved Daily
// Papers by date); this page is the storylines index. A row links to its detail
// page (/archive/[threadId], Phase C).

import Link from "next/link";
import { cookies } from "next/headers";
import { hasDbConfig } from "@/modules/shared/db";
import { listStories } from "@/app/lib/queries";
import { StoriesList } from "@/app/components/StoriesList";

export const dynamic = "force-dynamic";

export default async function ArchivePagina() {
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

  const stories = await listStories(profileId);

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
      >
        ← Terug naar het dashboard
      </Link>

      <div className="mt-5">
        {stories.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-400 dark:border-stone-700">
            Nog geen verhaallijnen. Zodra een onderwerp meerdere dagen terugkomt of groot wordt, verschijnt het hier.
          </p>
        ) : (
          <StoriesList stories={stories} />
        )}
      </div>
    </div>
  );
}
