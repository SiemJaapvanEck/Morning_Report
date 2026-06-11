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

  const categories: Category[] = unwrap(await db().from("categories").select("*").order("position"));
  const topics: Topic[] = unwrap(await db().from("topics").select("*").order("name"));
  const sources: Source[] = unwrap(await db().from("sources").select("*").order("name"));
  const scores: TopicScore[] = unwrap(
    await db().from("topic_scores").select("*").eq("profile_id", profileId),
  );

  const scoreFor = (type: string, id: string) =>
    scores.find((s) => s.target_type === type && s.target_id === id)?.score ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight">Instellingen</h1>
        <p className="mt-1.5 text-sm text-muted">
          Scores zijn zichtbaar en groeien mee met je ratings — geen black box.
        </p>
      </section>

      <section>
        <h2 className="text-base font-extrabold tracking-tight">Onderwerp toevoegen</h2>
        <p className="mt-1 text-sm text-muted">
          Vrije onderwerpen zonder feed worden &apos;s ochtends actief opgezocht.
        </p>
        <div className="mt-3">
          <CaptureFormulier />
        </div>
      </section>

      <section>
        <h2 className="text-base font-extrabold tracking-tight">Interesses</h2>
        <div className="mt-4 space-y-5">
          {categories.map((category) => (
            <div key={category.id}>
              <h3 className="flex items-baseline gap-2 text-sm font-bold tracking-tight">
                {category.name}
                <ScoreBadge score={scoreFor("category", category.id)} />
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {topics
                  .filter((topic) => topic.category_id === category.id)
                  .map((topic) => (
                    <li
                      key={topic.id}
                      className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs"
                    >
                      {topic.name}
                      <span className="mr-kicker text-faint">
                        {topic.cadence.replace("_", " ")}
                      </span>
                      <ScoreBadge score={scoreFor("topic", topic.id)} />
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-extrabold tracking-tight">Bronnen</h2>
        <ul className="mt-3 divide-y text-sm">
          {sources.map((source) => (
            <li key={source.id} className="flex items-baseline justify-between gap-3 py-2.5">
              <span className={source.active ? "font-medium" : "text-faint line-through"}>
                {source.name}
              </span>
              <span
                className={`mr-kicker text-right ${source.last_error ? "text-red" : "text-faint"}`}
              >
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
      className={`rounded-tag border border-current px-1 font-mono text-[10px] font-bold ${
        positive ? "text-green" : "text-red"
      }`}
    >
      {positive ? "+" : ""}
      {score.toFixed(2)}
    </span>
  );
}
