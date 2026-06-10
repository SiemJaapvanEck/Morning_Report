"use client";

// Het hoofdgebaar van de interessemotor: een gegradeerde rating (1-5) plus
// een aparte volg-markering. Iconen/vormgeving zijn v1 — de design-ronde
// (ontwerp §7) verfijnt dit later.

import { useState } from "react";

interface Props {
  targetType: "item" | "topic" | "category" | "source";
  targetId: string;
}

export function ItemRating({ targetType, targetId }: Props) {
  const [given, setGiven] = useState<number | null>(null);
  const [following, setFollowing] = useState(false);

  async function rate(rating: number) {
    setGiven(rating);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rating", target_type: targetType, target_id: targetId, rating }),
    });
  }

  async function volg() {
    const next = !following;
    setFollowing(next);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "volgen", target_type: targetType, target_id: targetId, active: next }),
    });
  }

  return (
    <span className="inline-flex items-center gap-1 text-stone-400">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          onClick={() => rate(value)}
          title={`${value} van 5`}
          className={`text-sm leading-none transition-colors hover:text-amber-500 ${
            given !== null && value <= given ? "text-amber-500" : ""
          }`}
        >
          ★
        </button>
      ))}
      <button
        onClick={volg}
        title={following ? "Niet meer volgen" : "Actief volgen"}
        className={`ml-2 text-sm leading-none transition-colors hover:text-sky-500 ${
          following ? "text-sky-500" : ""
        }`}
      >
        ◉
      </button>
    </span>
  );
}
