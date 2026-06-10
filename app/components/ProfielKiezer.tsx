"use client";

// Profielkiezer: geen login, je kiest wie je bent en dat wordt in een cookie
// onthouden. Nieuwe profielen aanmaken kan hier ook.

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  profiles: { id: string; name: string }[];
}

export function ProfielKiezer({ profiles }: Props) {
  const router = useRouter();
  const [naam, setNaam] = useState("");
  const [busy, setBusy] = useState(false);

  async function kies(profileId: string) {
    setBusy(true);
    await fetch("/api/profiel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId }),
    });
    router.refresh();
  }

  async function maakAan(event: React.FormEvent) {
    event.preventDefault();
    if (!naam.trim()) return;
    setBusy(true);
    await fetch("/api/profiel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: naam }),
    });
    router.refresh();
  }

  return (
    <div className="mx-auto mt-12 max-w-sm text-center">
      <h1 className="text-xl font-semibold">Wie ben je?</h1>
      <p className="mt-2 text-sm text-stone-500">
        Je keuze wordt op dit apparaat onthouden.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => kies(profile.id)}
            disabled={busy}
            className="rounded-lg border border-stone-300 px-4 py-3 text-left font-medium hover:bg-stone-100 disabled:opacity-50 dark:border-stone-700 dark:hover:bg-stone-900"
          >
            {profile.name}
          </button>
        ))}
      </div>

      <form onSubmit={maakAan} className="mt-6 flex gap-2">
        <input
          value={naam}
          onChange={(event) => setNaam(event.target.value)}
          placeholder="Nieuw profiel…"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
        />
        <button
          type="submit"
          disabled={busy || !naam.trim()}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900"
        >
          Aanmaken
        </button>
      </form>
    </div>
  );
}
