"use client";

// A mega-thread as a timeline: the topic's daily news-volume line, with its
// child storylines as dots sitting on it. Click a dot to read that story below.
// Reusable — also drops into the Daily Paper when a story is covered that day.

import { useState } from "react";
import { Archivo, Space_Mono } from "next/font/google";

const archivo = Archivo({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-archivo" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

export interface TimelineDot {
  date: string;
  headline: string;
  body: string | null;
  lenses: string[];
  childId: string;
}
export interface TimelinePoint {
  date: string;
  count: number;
}

const dayNum = (d: string) => Math.floor(new Date(d + "T00:00:00Z").getTime() / 86_400_000);
const fmtDay = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

export function ThreadTimeline({
  title,
  volume,
  dots,
}: {
  title: string;
  volume: TimelinePoint[];
  dots: TimelineDot[];
}) {
  const [sel, setSel] = useState(Math.max(0, dots.length - 1)); // latest by default
  if (volume.length === 0 && dots.length === 0) return null;

  const allDays = [...volume.map((v) => v.date), ...dots.map((d) => d.date)].map(dayNum);
  const minD = Math.min(...allDays);
  const maxD = Math.max(...allDays);
  const span = Math.max(1, maxD - minD);
  const countByDay = new Map(volume.map((v) => [dayNum(v.date), v.count]));
  const maxCount = Math.max(1, ...volume.map((v) => v.count));

  const W = 760, H = 132, padL = 14, padR = 14, padT = 16, padB = 24;
  const innerW = W - padL - padR, chartH = H - padT - padB;
  const x = (d: number) => padL + ((d - minD) / span) * innerW;
  const y = (c: number) => padT + chartH - (c / maxCount) * chartH;

  const pts: [number, number][] = [];
  for (let d = minD; d <= maxD; d++) pts.push([x(d), y(countByDay.get(d) ?? 0)]);
  const linePath = pts.map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${x(maxD).toFixed(1)} ${(padT + chartH).toFixed(1)} L ${x(minD).toFixed(1)} ${(padT + chartH).toFixed(1)} Z`;

  const selected = dots[sel];

  return (
    <div
      className={`${archivo.variable} ${spaceMono.variable} rounded-2xl border border-stone-200 p-5 dark:border-stone-800`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-[family-name:var(--font-archivo)] text-[21px] font-extrabold tracking-tight">
          {title}
        </h3>
        <span className="font-[family-name:var(--font-space-mono)] text-[10.5px] font-bold uppercase tracking-wide text-stone-400">
          {dots.length} verhaallijnen
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`Tijdlijn van ${title}`}>
        <path d={areaPath} fill="#2f6df0" opacity={0.07} />
        <path d={linePath} fill="none" stroke="#2f6df0" strokeOpacity={0.4} strokeWidth={1.5} />
        {dots.map((dot, i) => {
          const cx = x(dayNum(dot.date));
          const cy = y(countByDay.get(dayNum(dot.date)) ?? 0);
          const active = i === sel;
          return (
            <g key={dot.childId} className="cursor-pointer" onClick={() => setSel(i)}>
              <title>{dot.headline}</title>
              <circle cx={cx} cy={cy} r={14} fill="transparent" />
              <circle
                cx={cx}
                cy={cy}
                r={active ? 6.5 : 4.5}
                fill={active ? "#2f6df0" : "var(--mr-dot-fill, #ffffff)"}
                stroke="#2f6df0"
                strokeWidth={2}
              />
            </g>
          );
        })}
        <text x={x(minD)} y={H - 7} fontSize={10} className="fill-stone-400" style={{ fontFamily: "var(--font-space-mono)" }}>
          {fmtDay(volume[0]?.date ?? dots[0]?.date ?? "")}
        </text>
        <text
          x={x(maxD)}
          y={H - 7}
          fontSize={10}
          textAnchor="end"
          className="fill-stone-400"
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          {fmtDay(volume.at(-1)?.date ?? dots.at(-1)?.date ?? "")}
        </text>
      </svg>

      {selected && (
        <div className="mt-3 border-t border-stone-200 pt-4 dark:border-stone-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-[family-name:var(--font-space-mono)] text-[10.5px] font-bold uppercase tracking-wide text-[#2f6df0]">
              {fmtDay(selected.date)}
            </span>
            {selected.lenses.map((lens) => (
              <span
                key={lens}
                className="rounded-full bg-stone-100 px-2.5 py-0.5 font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:bg-stone-800 dark:text-stone-400"
              >
                {lens}
              </span>
            ))}
          </div>
          <h4 className="mt-1.5 font-[family-name:var(--font-archivo)] text-[18px] font-extrabold leading-snug tracking-tight">
            {selected.headline}
          </h4>
          {selected.body && (
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-stone-600 dark:text-stone-300">
              {selected.body}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
