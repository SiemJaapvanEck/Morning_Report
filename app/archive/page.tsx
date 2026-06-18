// Archive — the storylines view (Phase 5c). Coexists with the calendar /archief
// (saved Daily Papers by date); this page shows the mega-threads as timelines:
// a topic's news-volume line with its child storylines as clickable dots.

import Link from "next/link";
import { cookies } from "next/headers";
import { hasDbConfig } from "@/modules/shared/db";
import { getThreadArchive } from "@/app/lib/queries";
import { ThreadTimeline } from "@/app/components/ThreadTimeline";

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

  const megas = await getThreadArchive(profileId);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
      >
        ← Terug naar het dashboard
      </Link>

      <header className="mt-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Archive — Storylines</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
          De grote verhaallijnen die over meerdere dagen terugkomen. Elke lijn toont hoeveel nieuws
          er per dag was; elke stip is een onderliggend verhaal — klik erop om het te lezen.
        </p>
      </header>

      {megas.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-400 dark:border-stone-700">
          Nog geen grote verhaallijnen. Zodra een onderwerp meerdere dagen terugkomt, verschijnt het hier.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {megas.map((mega) => (
            <ThreadTimeline key={mega.id} title={mega.title} volume={mega.volume} dots={mega.dots} />
          ))}
        </div>
      )}
    </div>
  );
}
