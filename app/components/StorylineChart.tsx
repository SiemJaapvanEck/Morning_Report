"use client";

// The archive's headline view (Phase 5c-3): every mega-thread as one line on a
// single full-width chart — X = date over time, Y = that story's daily news
// volume, colored by its primary DESTEP sector. Pick a storyline (its line or
// its chip), then read its article directly underneath, at the same width as
// the Daily Paper block on the dashboard. The active line carries the child-
// story dots — click a dot to switch which article you're reading.

import { useState } from "react";
import { Archivo, Space_Mono } from "next/font/google";
import type { DestepLens } from "@/modules/shared/types";
import type { ArchiveMega } from "@/app/lib/queries";

const archivo = Archivo({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-archivo" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

// DESTEP → color. Six distinct hues; the #2f6df0 interaction blue stays
// reserved for the drill-down (the clickable child-story dots).
const SECTOR_COLOR: Record<DestepLens, string> = {
  politiek: "#dc2626", // red
  economisch: "#d97706", // amber
  technologisch: "#7c3aed", // violet
  sociaal: "#db2777", // fuchsia
  ecologisch: "#16a34a", // green
  demografisch: "#0891b2", // cyan
};
const SECTOR_LABEL: Record<DestepLens, string> = {
  politiek: "Politiek",
  economisch: "Economisch",
  technologisch: "Technologisch",
  sociaal: "Sociaal",
  ecologisch: "Ecologisch",
  demografisch: "Demografisch",
};
const SECTOR_ORDER: DestepLens[] = [
  "politiek", "economisch", "technologisch", "sociaal", "ecologisch", "demografisch",
];

const dayNum = (d: string) => Math.floor(new Date(d + "T00:00:00Z").getTime() / 86_400_000);
const fmtDay = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

export function StorylineChart({ megas }: { megas: ArchiveMega[] }) {
  // default to the biggest storyline (and its latest article) so the panel is filled
  const totals = megas.map((m) => m.volume.reduce((s, v) => s + v.count, 0));
  const initialMega = Math.max(0, totals.indexOf(Math.max(...totals, 0)));
  const [selMega, setSelMega] = useState(initialMega);
  const [selDot, setSelDot] = useState(Math.max(0, (megas[initialMega]?.dots.length ?? 1) - 1));

  const pickMega = (i: number) => {
    setSelMega(i);
    setSelDot(Math.max(0, megas[i].dots.length - 1)); // latest article of that storyline
  };

  const withDays = megas.filter((m) => m.volume.length > 0 || m.dots.length > 0);
  if (withDays.length === 0) return null;

  const allDays = megas.flatMap((m) => [...m.volume.map((v) => v.date), ...m.dots.map((d) => d.date)]).map(dayNum);
  const minD = Math.min(...allDays);
  const maxD = Math.max(...allDays);
  const span = Math.max(1, maxD - minD);
  const maxCount = Math.max(1, ...megas.flatMap((m) => m.volume.map((v) => v.count)));

  const W = 1000, H = 340, padL = 44, padR = 18, padT = 18, padB = 34;
  const innerW = W - padL - padR, chartH = H - padT - padB;
  const x = (d: number) => padL + ((d - minD) / span) * innerW;
  const y = (c: number) => padT + chartH - (c / maxCount) * chartH;

  // Each mega draws only across its own active window; gap days dip to baseline.
  const countByDayOf = (m: ArchiveMega) => new Map(m.volume.map((v) => [dayNum(v.date), v.count]));
  const linePts = (m: ArchiveMega): [number, number][] => {
    if (m.volume.length === 0) return [];
    const days = m.volume.map((v) => dayNum(v.date));
    const first = Math.min(...days), last = Math.max(...days);
    const byDay = countByDayOf(m);
    const pts: [number, number][] = [];
    for (let d = first; d <= last; d++) pts.push([x(d), y(byDay.get(d) ?? 0)]);
    return pts;
  };
  const toPath = (pts: [number, number][]) =>
    pts.map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

  // Y gridlines + X date ticks
  const yTicks = [0, Math.round(maxCount / 2), maxCount].filter((v, i, a) => a.indexOf(v) === i);
  const xTickCount = Math.min(5, span + 1);
  const xTicks = Array.from({ length: xTickCount }, (_, i) =>
    Math.round(minD + (span * i) / Math.max(1, xTickCount - 1)),
  );

  const presentSectors = SECTOR_ORDER.filter((s) => megas.some((m) => m.primarySector === s));
  const selectedMega = megas[selMega];
  const selectedDot = selectedMega?.dots[selDot] ?? null;
  const activeByDay = selectedMega ? countByDayOf(selectedMega) : new Map<number, number>();

  return (
    <div className={`${archivo.variable} ${spaceMono.variable}`} style={{ overflowAnchor: "none" }}>
      {/* ── on top of the graph: sector color legend + the storyline selector ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {presentSectors.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SECTOR_COLOR[s] }} />
            <span className="font-[family-name:var(--font-space-mono)] text-[10.5px] font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              {SECTOR_LABEL[s]}
            </span>
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {megas.map((m, i) => {
          const active = i === selMega;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => pickMega(i)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-[family-name:var(--font-space-mono)] text-[11px] font-bold tracking-wide transition ${
                active
                  ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
                  : "border-stone-200 text-stone-600 hover:border-stone-400 dark:border-stone-700 dark:text-stone-300"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SECTOR_COLOR[m.primarySector] }} />
              {m.title}
            </button>
          );
        })}
      </div>

      {/* ── the big chart, full width ── */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full"
        role="img"
        aria-label="Alle verhaallijnen door de tijd, per sector gekleurd"
      >
        {yTicks.map((c) => (
          <g key={`y${c}`}>
            <line x1={padL} x2={W - padR} y1={y(c)} y2={y(c)} className="stroke-stone-200 dark:stroke-stone-800" strokeWidth={1} />
            <text x={padL - 8} y={y(c) + 3} textAnchor="end" fontSize={10} className="fill-stone-400" style={{ fontFamily: "var(--font-space-mono)" }}>
              {c}
            </text>
          </g>
        ))}
        {xTicks.map((d, i) => (
          <text
            key={`x${d}`}
            x={x(d)}
            y={H - 9}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            fontSize={10}
            className="fill-stone-400"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            {fmtDay(new Date(d * 86_400_000).toISOString().slice(0, 10))}
          </text>
        ))}

        {/* one line per mega + small sector-colored dots at child-story positions */}
        {megas.map((m, i) => {
          const pts = linePts(m);
          if (pts.length === 0) return null;
          const color = SECTOR_COLOR[m.primarySector];
          const isMegaActive = i === selMega;
          const d = toPath(pts);
          const byDay = countByDayOf(m);
          return (
            <g key={m.id}>
              {/* hit-area + line */}
              <g className="cursor-pointer" onClick={() => pickMega(i)}>
                <title>{m.title}</title>
                <path d={d} fill="none" stroke="transparent" strokeWidth={16} />
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={isMegaActive ? 3 : 2}
                  strokeOpacity={isMegaActive ? 1 : 0.4}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
              {/* inactive lines: small sector-colored dots — click jumps straight to that dot */}
              {!isMegaActive &&
                m.dots.map((dot, j) => {
                  const cx = x(dayNum(dot.date));
                  const cy = y(byDay.get(dayNum(dot.date)) ?? 0);
                  return (
                    <g
                      key={dot.childId}
                      className="cursor-pointer"
                      onClick={() => { setSelMega(i); setSelDot(j); }}
                    >
                      <title>{dot.headline}</title>
                      <circle cx={cx} cy={cy} r={12} fill="transparent" />
                      <circle cx={cx} cy={cy} r={3} fill={color} fillOpacity={0.5} />
                    </g>
                  );
                })}
            </g>
          );
        })}

        {/* active storyline's child-story dots — sector-colored, interactive, rendered on top */}
        {selectedMega &&
          selectedMega.dots.map((dot, j) => {
            const cx = x(dayNum(dot.date));
            const cy = y(activeByDay.get(dayNum(dot.date)) ?? 0);
            const isDotActive = j === selDot;
            const color = SECTOR_COLOR[selectedMega.primarySector];
            return (
              <g key={dot.childId} className="cursor-pointer" onClick={() => setSelDot(j)}>
                <title>{dot.headline}</title>
                <circle cx={cx} cy={cy} r={14} fill="transparent" />
                <circle
                  cx={cx}
                  cy={cy}
                  r={isDotActive ? 6.5 : 4.5}
                  fill={isDotActive ? "transparent" : color}
                  stroke={color}
                  strokeWidth={isDotActive ? 2.5 : 0}
                />
              </g>
            );
          })}
      </svg>

      {/* ── the article, underneath, at the Daily Paper block's width (col-span-7) ── */}
      {selectedDot && (
        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <article className="rounded-2xl border border-stone-200 p-5 dark:border-stone-800 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-[family-name:var(--font-space-mono)] text-[10.5px] font-bold uppercase tracking-wide text-[#2f6df0]">
                {selectedMega.title} · {fmtDay(selectedDot.date)}
              </span>
              {selectedDot.lenses.map((lens) => (
                <span
                  key={lens}
                  className="rounded-full bg-stone-100 px-2.5 py-0.5 font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                >
                  {lens}
                </span>
              ))}
            </div>
            <h3 className="mt-1.5 font-[family-name:var(--font-archivo)] text-[20px] font-extrabold leading-snug tracking-tight">
              {selectedDot.headline}
            </h3>
            {selectedDot.body && (
              <p className="mt-2 text-[14px] leading-relaxed text-stone-600 dark:text-stone-300">
                {selectedDot.body}
              </p>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
