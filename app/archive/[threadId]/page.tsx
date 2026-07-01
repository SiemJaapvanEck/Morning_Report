// Thread detail (Phase C + E): a thin server wrapper — auth + fetch — that
// branches on the thread's shape. An umbrella (a big thread with child
// storylines) renders the Phase E hub: hero + multi-line chart. A leaf thread
// renders the Phase C drill-in (sticky scrubber + deep article + context rail).

import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { hasDbConfig } from "@/modules/shared/db";
import { getStoryDetail, getUmbrella } from "@/app/lib/queries";
import { StoryDetailView } from "@/app/components/StoryDetailView";
import { UmbrellaHero } from "@/app/components/UmbrellaHero";
import { UmbrellaReader } from "@/app/components/UmbrellaReader";

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

  // An umbrella (thread with children) gets the Phase E hub; getUmbrella returns
  // null for a leaf, so we fall back to the Phase C single-storyline view.
  const umbrella = await getUmbrella(profileId, threadId);
  if (umbrella) {
    return (
      <div>
        <UmbrellaHero umbrella={umbrella} />
        <div className="mt-6">
          <UmbrellaReader lines={umbrella.lines} />
        </div>
      </div>
    );
  }

  const story = await getStoryDetail(profileId, threadId);
  if (!story) notFound();

  return <StoryDetailView story={story} />;
}
