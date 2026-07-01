// Story detail (Phase C): the full drill-in for one storyline. A thin server
// wrapper — auth + fetch — that hands the enriched StoryDetail to the interactive
// client view (sticky timeline scrubber + changing deep article + context rail).

import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { hasDbConfig } from "@/modules/shared/db";
import { getStoryDetail } from "@/app/lib/queries";
import { StoryDetailView } from "@/app/components/StoryDetailView";

export const dynamic = "force-dynamic";

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

  return <StoryDetailView story={story} />;
}
