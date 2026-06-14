"use client";

// Themakiezer: kleurstippen in de koptekst. Keuze landt in localStorage
// ('mr_thema'); het anti-flits-script in layout.tsx past hem bij laden toe.

import { useSyncExternalStore } from "react";

export const THEMAS = [
  { id: "krant", label: "Krant", dot: "#fafaf9", donker: false },
  { id: "sepia", label: "Sepia", dot: "#e8d5b5", donker: false },
  { id: "mint", label: "Mint", dot: "#cfe5d6", donker: false },
  { id: "nacht", label: "Nacht", dot: "#1c1917", donker: true },
] as const;

export type ThemaId = (typeof THEMAS)[number]["id"];

export function pasThemaToe(id: ThemaId) {
  const html = document.documentElement;
  const thema = THEMAS.find((t) => t.id === id) ?? THEMAS[0];
  html.dataset.theme = thema.id;
  html.classList.toggle("dark", thema.donker);
  localStorage.setItem("mr_thema", thema.id);
  window.dispatchEvent(new Event("mr-thema"));
}

function abonneer(callback: () => void) {
  window.addEventListener("mr-thema", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("mr-thema", callback);
    window.removeEventListener("storage", callback);
  };
}

function huidigThema(): ThemaId {
  return (
    (localStorage.getItem("mr_thema") as ThemaId | null) ??
    (document.documentElement.classList.contains("dark") ? "nacht" : "krant")
  );
}

export function ThemaKiezer() {
  // null tijdens SSR/hydratie: dan is er nog geen actieve-ring (geen mismatch)
  const actief = useSyncExternalStore(abonneer, huidigThema, () => null);

  return (
    <span className="inline-flex items-center gap-1.5" role="group" aria-label="Kleurthema">
      {THEMAS.map((thema) => (
        <button
          key={thema.id}
          type="button"
          title={thema.label}
          aria-label={`Thema ${thema.label}`}
          onClick={() => pasThemaToe(thema.id)}
          className={`h-4 w-4 rounded-full border transition-shadow ${
            actief === thema.id
              ? "border-amber-500 ring-2 ring-amber-300/60"
              : "border-stone-300 hover:ring-2 hover:ring-stone-300/60 dark:border-stone-600"
          }`}
          style={{ backgroundColor: thema.dot }}
        />
      ))}
    </span>
  );
}
