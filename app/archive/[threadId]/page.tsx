// Story detail (Phase B stub; Phase C fleshes this out into the full drill-in).
// Shows the storyline's meta, its accumulated state prose, and the linked events
// (newest first) with whatever update was written for each.

import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { hasDbConfig } from "@/modules/shared/db";
import { getStoryDetail } from "@/app/lib/queries";
import { categoryColor, STATUS_BADGE, spanDays } from "@/app/lib/stories";

export const dynamic = "force-dynamic";

const fmtDay = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

export default async function StoryDetailPagina({ params }: { params: Promise<{ threadId: string }> }) {
  if (!hasDbConfig()) {
    return <p className="text-sm text-stone-500">Supabase is nog niet gekoppeld — zie docs/setup.md.</p>;
  }
  const { threadId } = await params;
  const cookieStore = await cookies();
  const profileId = cookieStore.get("mr_profile")?.value;
  if (!profileId) {
    return (
      <p className="text-sm text-stone-500">
        Kies eerst een profiel op de <Link href="/" className="underline">voorpagina</Link>.
      </p>
    );
  }

  const story = await getStoryDetail(profileId, threadId);
  if (!story) notFound();

  const color = categoryColor(story.category?.slug);
  const badge = STATUS_BADGE[story.status];

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/archive"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
      >
        ← Alle verhalen
      </Link>

      <header className="mt-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {story.category && <span className="text-stone-500">{story.category.label}</span>}
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{story.title}</h1>
        <p className="mt-2 text-sm text-stone-500">
          {spanDays(story)} dagen · {story.eventCount} gebeurtenissen
          {story.firstDate && story.lastDate ? ` · ${fmtDay(story.firstDate)} → ${fmtDay(story.lastDate)}` : ""}
        </p>
      </header>

      {story.state && (
        <section className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-5 text-[15px] leading-relaxed dark:border-stone-700 dark:bg-stone-800/40">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-400">Stand van het verhaal</h2>
          {story.state.split("\n\n").map((p, i) => (
            <p key={i} className="mt-2 first:mt-0">
              {p}
            </p>
          ))}
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">Tijdlijn</h2>
        <ol className="space-y-5 border-l border-stone-200 pl-5 dark:border-stone-700">
          {story.events.map((e, i) => (
            <li key={i} className="relative">
              <span
                className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                {e.date ? fmtDay(e.date) : "—"}
              </div>
              <h3 className="mt-0.5 font-bold leading-snug">{e.title}</h3>
              {e.body && <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{e.body}</p>}
            </li>
          ))}
        </ol>
        {story.events.length === 0 && (
          <p className="text-sm text-stone-400">Nog geen gebeurtenissen aan deze verhaallijn gekoppeld.</p>
        )}
      </section>
    </div>
  );
}
