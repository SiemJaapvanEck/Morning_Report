// Archief: alle eerdere edities van het gekozen profiel.

import Link from "next/link";
import { cookies } from "next/headers";
import { hasDbConfig } from "@/modules/shared/db";
import { listEditions } from "@/app/lib/queries";

export const dynamic = "force-dynamic";

export default async function ArchiefPagina() {
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

  const editions = await listEditions(profileId);

  return (
    <div>
      <h1 className="text-xl font-semibold">Archief</h1>
      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {editions.map((edition) => {
          const datum = new Date(edition.date + "T00:00:00").toLocaleDateString("nl-NL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          return (
            <li key={edition.id}>
              <Link
                href={`/editie/${edition.date}`}
                className="flex items-baseline justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
              >
                <span className="capitalize">{datum}</span>
                <span className="text-xs text-stone-400">
                  {edition.status === "done" ? "✓" : edition.status}
                </span>
              </Link>
            </li>
          );
        })}
        {editions.length === 0 && (
          <li className="text-sm text-stone-400">Nog geen edities.</li>
        )}
      </ul>
    </div>
  );
}
