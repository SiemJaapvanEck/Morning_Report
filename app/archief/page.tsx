// Archief: alle eerdere edities van het gekozen profiel.

import Link from "next/link";
import { cookies } from "next/headers";
import { hasDbConfig } from "@/modules/shared/db";
import { listEditions } from "@/app/lib/queries";

export const dynamic = "force-dynamic";

export default async function ArchiefPagina() {
  if (!hasDbConfig()) {
    return (
      <p className="text-sm text-muted">Supabase is nog niet gekoppeld — zie docs/setup.md.</p>
    );
  }

  const cookieStore = await cookies();
  const profileId = cookieStore.get("mr_profile")?.value;
  if (!profileId) {
    return (
      <p className="text-sm text-muted">
        Kies eerst een profiel op de{" "}
        <Link href="/" className="text-blue underline">
          voorpagina
        </Link>
        .
      </p>
    );
  }

  const editions = await listEditions(profileId);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Archief</h1>
        <span className="flex-1" />
        <p className="mr-kicker text-faint">
          {editions.length} {editions.length === 1 ? "editie" : "edities"}
        </p>
      </div>
      <ul className="mt-6 divide-y">
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
                className="group -mx-3 flex items-baseline justify-between rounded-lg px-3 py-3 transition-colors hover:bg-card"
              >
                <span className="font-bold capitalize tracking-tight transition-colors group-hover:text-blue">
                  {datum}
                </span>
                <span
                  className={`mr-kicker ${edition.status === "done" ? "text-green" : "text-faint"}`}
                >
                  {edition.status === "done" ? "✓" : edition.status}
                </span>
              </Link>
            </li>
          );
        })}
        {editions.length === 0 && <li className="py-3 text-sm text-faint">Nog geen edities.</li>}
      </ul>
    </div>
  );
}
