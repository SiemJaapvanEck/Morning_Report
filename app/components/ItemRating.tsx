"use client";

// Het hoofdgebaar van de interessemotor: een gegradeerde rating van −2 tot +2
// (schets 2026-06-11) plus een aparte volg-markering. Intern blijft de schaal
// 1–5 (API en ratingToDelta ongewijzigd): UI-waarde + 3.

import { useState } from "react";

interface Props {
  targetType: "item" | "topic" | "category" | "source";
  targetId: string;
}

const SCHAAL = [-2, -1, 0, 1, 2] as const;

export function ItemRating({ targetType, targetId }: Props) {
  const [given, setGiven] = useState<number | null>(null);
  const [following, setFollowing] = useState(false);

  async function rate(value: number) {
    setGiven(value);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rating",
        target_type: targetType,
        target_id: targetId,
        rating: value + 3, // −2..+2 → 1..5
      }),
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
    <span className="inline-flex items-center gap-px text-stone-400">
      {SCHAAL.map((value) => (
        <button
          key={value}
          onClick={() => rate(value)}
          title={value > 0 ? `+${value}` : `${value}`}
          className={`min-w-6 rounded px-1 py-0.5 text-xs font-medium leading-none transition-colors ${
            given === value
              ? value > 0
                ? "bg-amber-100 text-amber-600 dark:bg-amber-950"
                : value < 0
                  ? "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                  : "bg-stone-100 text-stone-500 dark:bg-stone-800"
              : "hover:text-amber-500"
          }`}
        >
          {value > 0 ? `+${value}` : value}
        </button>
      ))}
      <button
        onClick={volg}
        title={following ? "Niet meer volgen" : "Actief volgen"}
        className={`ml-1.5 text-sm leading-none transition-colors hover:text-sky-500 ${
          following ? "text-sky-500" : ""
        }`}
      >
        ◉
      </button>
    </span>
  );
}
