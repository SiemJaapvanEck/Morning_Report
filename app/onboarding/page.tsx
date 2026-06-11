// Onboarding: voorkeuren instellen bij een (nieuw) profiel. De standaardset
// staat voorgeselecteerd; de keuzes worden de beginscores van de
// interessemotor (Sol's match-percentage).

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasDbConfig } from "@/modules/shared/db";
import { getVoorkeurenData } from "@/app/lib/voorkeuren";
import { VoorkeurenKiezer } from "@/app/components/VoorkeurenKiezer";

export const dynamic = "force-dynamic";

export default async function OnboardingPagina() {
  if (!hasDbConfig()) redirect("/");

  const cookieStore = await cookies();
  const profileId = cookieStore.get("mr_profile")?.value;
  if (!profileId) redirect("/");

  const { categories, topics, sources, initieel } = await getVoorkeurenData(profileId);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-xl font-semibold">Wat wil je volgen?</h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-500">
        Vink aan wat je interesseert en geef de relevantie aan (−2…+2). Sol gebruikt
        dit als startpunt voor het match-percentage op je artikelen; je ratings
        stellen het daarna vanzelf bij. Alles is later aan te passen onder
        Instellingen.
      </p>
      <div className="mt-6">
        <VoorkeurenKiezer
          categories={categories}
          topics={topics}
          sources={sources}
          initieel={initieel}
          modus="onboarding"
        />
      </div>
    </div>
  );
}
