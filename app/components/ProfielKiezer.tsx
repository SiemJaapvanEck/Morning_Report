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
      <p className="mr-kicker font-bold text-blue">Daily paper</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Wie ben je?</h1>
      <p className="mt-2 text-sm text-muted">Je keuze wordt op dit apparaat onthouden.</p>

      <div className="mt-7 flex flex-col gap-2.5">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => kies(profile.id)}
            disabled={busy}
            className="mr-card mr-lift flex items-center gap-3 px-4 py-3 text-left font-bold disabled:opacity-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue text-xs font-bold text-card">
              {profile.name.slice(0, 2).toUpperCase()}
            </span>
            {profile.name}
          </button>
        ))}
      </div>

      <form onSubmit={maakAan} className="mt-7 flex gap-2">
        <input
          value={naam}
          onChange={(event) => setNaam(event.target.value)}
          placeholder="Nieuw profiel…"
          className="min-w-0 flex-1 rounded-lg border bg-card px-3 py-2 text-sm placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={busy || !naam.trim()}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-paper disabled:opacity-50"
        >
          Aanmaken
        </button>
      </form>
    </div>
  );
}
