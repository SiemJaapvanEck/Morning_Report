// Instellingen: interesses (zichtbare scores), bronnen en invoer.
// v1 toont de kern; fase 4 (interessemotor compleet) bouwt de score-tuning uit.

import Link from "next/link";
import { cookies } from "next/headers";
import { db, hasDbConfig, unwrap } from "@/modules/shared/db";
import { CaptureFormulier } from "@/app/components/CaptureFormulier";
import type { Category, Source, Topic, TopicScore } from "@/modules/shared/types";

export const dynamic = "force-dynamic";

export default async function InstellingenPagina() {
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

  const categories: Category[] = unwrap(await db().from("categories").select("*").order("position"));
  const topics: Topic[] = unwrap(await db().from("topics").select("*").order("name"));
  const sources: Source[] = unwrap(await db().from("sources").select("*").order("name"));
  const scores: TopicScore[] = unwrap(
    await db().from("topic_scores").select("*").eq("profile_id", profileId),
  );

  const scoreFor = (type: string, id: string) =>
    scores.find((s) => s.target_type === type && s.target_id === id)?.score ?? 0;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-semibold">Instellingen</h1>
        <p className="mt-1 text-sm text-stone-500">
          Scores zijn zichtbaar en groeien mee met je ratings — geen black box.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">Onderwerp toevoegen</h2>
        <p className="mt-1 text-sm text-stone-500">
          Vrije onderwerpen zonder feed worden &apos;s ochtends actief opgezocht.
        </p>
        <div className="mt-3">
          <CaptureFormulier />
        </div>
      </section>

      <section>
        <h2 className="font-semibold">Interesses</h2>
        <div className="mt-3 space-y-4">
          {categories.map((category) => (
            <div key={category.id}>
              <h3 className="flex items-baseline gap-2 text-sm font-medium">
                {category.name}
                <ScoreBadge score={scoreFor("category", category.id)} />
              </h3>
              <ul className="mt-1 flex flex-wrap gap-2">
                {topics
                  .filter((topic) => topic.category_id === category.id)
                  .map((topic) => (
                    <li
                      key={topic.id}
                      className="flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-xs dark:border-stone-700"
                    >
                      {topic.name}
                      <span className="text-stone-400">·</span>
                      <span className="text-stone-400">{topic.cadence.replace("_", " ")}</span>
                      <ScoreBadge score={scoreFor("topic", topic.id)} />
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold">Bronnen</h2>
        <ul className="mt-3 divide-y divide-stone-200 text-sm dark:divide-stone-800">
          {sources.map((source) => (
            <li key={source.id} className="flex items-baseline justify-between py-2">
              <span className={source.active ? "" : "text-stone-400 line-through"}>
                {source.name}
              </span>
              <span className="text-xs text-stone-400">
                {source.last_error
                  ? `⚠ ${source.last_error.slice(0, 60)}`
                  : source.last_fetched_at
                    ? `laatst: ${new Date(source.last_fetched_at).toLocaleString("nl-NL")}`
                    : "nog niet opgehaald"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  if (score === 0) return null;
  const positive = score > 0;
  return (
    <span
      className={`rounded px-1 text-[10px] font-medium ${
        positive
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
      }`}
    >
      {positive ? "+" : ""}
      {score.toFixed(2)}
    </span>
  );
}
