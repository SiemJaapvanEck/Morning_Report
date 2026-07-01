"use client";

// The umbrella hero (Phase E): the big thread's header above its multi-line
// chart. Shows the short label, the aggregated read-side state (umbrella general
// + each storyline, from aggregateUmbrellaState), the bundle window, and the
// broad "Volg heel verhaal" bell that follows the whole umbrella. Narrow
// per-storyline follows live on the chart legend (UmbrellaChart).

import { useState } from "react";
import Link from "next/link";
import { Archivo, Space_Mono } from "next/font/google";
import type { UmbrellaView } from "@/app/lib/queries";
import { categoryColor, STATUS_BADGE } from "@/app/lib/stories";
import { FollowBell } from "./UmbrellaReader";

const archivo = Archivo({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-archivo" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

const fmtShort = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" }).toUpperCase();

export function UmbrellaHero({ umbrella }: { umbrella: UmbrellaView }) {
  const badge = STATUS_BADGE[umbrella.status];
  const color = categoryColor(umbrella.category?.slug);
  const storylineCount = umbrella.lines.filter((l) => !l.general).length;

  const [following, setFollowing] = useState(umbrella.followed);
  const [pending, setPending] = useState(false);
  async function toggleFollow() {
    const next = !following;
    setFollowing(next);
    setPending(true);
    try {
      const res = await fetch("/api/threads/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: umbrella.id, active: next }),
      });
      if (!res.ok) setFollowing(!next);
    } catch {
      setFollowing(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`${archivo.variable} ${spaceMono.variable}`}>
      <Link
        href="/archive"
        className="inline-flex items-center gap-1.5 font-[family-name:var(--font-space-mono)] text-[11px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
      >
        ← Alle verhalen
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-space-mono)] text-[11px] uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5 text-stone-500">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {umbrella.category?.label ?? "—"}
            </span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-[#2f6df0] ring-1 ring-inset ring-[#2f6df0]/40">
              ▨ {storylineCount} verhaallijnen
            </span>
          </div>
          <h1 className="mt-2 font-[family-name:var(--font-archivo)] text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl">
            {umbrella.label}
          </h1>
          {umbrella.windowStart && umbrella.windowEnd && (
            <p className="mt-2 font-[family-name:var(--font-space-mono)] text-[11px] uppercase tracking-wider text-stone-400">
              {fmtShort(umbrella.windowStart)} → {fmtShort(umbrella.windowEnd)}
            </p>
          )}
        </div>
        <button
          onClick={toggleFollow}
          disabled={pending}
          className={`flex flex-none items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
            following
              ? "border border-[#2f6df0] text-[#2f6df0] hover:bg-[#2f6df0]/5"
              : "bg-[#2f6df0] text-white hover:bg-[#2558c8]"
          }`}
        >
          <FollowBell on={following} pending={pending} />
          {following ? "Heel verhaal gevolgd" : "Volg heel verhaal"}
        </button>
      </header>

      {umbrella.state && (
        <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <span className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-widest text-stone-500">
            Stand van zaken
          </span>
          <div className="mt-2.5 space-y-2.5 text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
            {umbrella.state.split(/\n\n+/).map((para, i) => {
              const m = para.match(/^([^:\n]{1,40}):\s*([\s\S]*)$/);
              return (
                <p key={i}>
                  {m ? (
                    <>
                      <strong className="font-[family-name:var(--font-archivo)] font-extrabold text-stone-900 dark:text-stone-100">
                        {m[1]}:
                      </strong>{" "}
                      {m[2]}
                    </>
                  ) : (
                    para
                  )}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
