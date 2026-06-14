"use client";

// Het hoofdgebaar van de interessemotor: een gegradeerde rating van −2 tot +2
// (schets 2026-06-11) plus een aparte volg-markering. Intern blijft de schaal
// 1–5 (API en ratingToDelta ongewijzigd): UI-waarde + 3.
// Stijl: Dispatch-tokens — positief groen, negatief rood, volgen blauw.

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
    <span className="inline-flex items-center gap-px font-mono text-faint">
      {SCHAAL.map((value) => (
        <button
          key={value}
          onClick={() => rate(value)}
          title={value > 0 ? `+${value}` : `${value}`}
          className={`min-w-6 rounded-tag border px-1 py-0.5 text-[11px] leading-none transition-colors ${
            given === value
              ? value > 0
                ? "border-current font-bold text-green"
                : value < 0
                  ? "border-current font-bold text-red"
                  : "border-current font-bold text-muted"
              : "border-transparent hover:text-blue"
          }`}
        >
          {value > 0 ? `+${value}` : value}
        </button>
      ))}
      <button
        onClick={volg}
        title={following ? "Niet meer volgen" : "Actief volgen"}
        className={`ml-1.5 text-sm leading-none transition-colors hover:text-blue ${
          following ? "text-blue" : ""
        }`}
      >
        ◉
      </button>
    </span>
  );
}
