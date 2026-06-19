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

// Projection styling: dash density + opacity encode how sure the event is.
// bevestigd → tight, verwacht → dashed, gerucht → sparse + faded.
const CERTAINTY_DASH: Record<string, string> = { bevestigd: "5 2", verwacht: "3 4", gerucht: "1 6" };
const CERTAINTY_OPACITY: Record<string, number> = { bevestigd: 0.9, verwacht: 0.7, gerucht: 0.42 };
const CERT_BADGE: Record<string, { label: string; cls: string }> = {
  bevestigd: { label: "Bevestigd", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  verwacht: { label: "Verwacht", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  gerucht: { label: "Gerucht", cls: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400" },
};
const KIND_LABEL: Record<string, string> = {
  earnings: "Cijfers", release: "Release", event: "Event",
  dividend: "Dividend", ipo: "IPO", verkiezing: "Verkiezing", overig: "Agenda",
};

const dayNum = (d: string) => Math.floor(new Date(d + "T00:00:00Z").getTime() / 86_400_000);
const fmtDay = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

export function StorylineChart({ megas }: { megas: ArchiveMega[] }) {
  // default to the biggest storyline (and its latest article) so the panel is filled
  const totals = megas.map((m) => m.volume.reduce((s, v) => s + v.count, 0));
  const initialMega = Math.max(0, totals.indexOf(Math.max(...totals, 0)));
  const [selMega, setSelMega] = useState(initialMega);
  // the panel below shows either a child-story article ("dot") or a future event ("proj")
  const [sel, setSel] = useState<{ kind: "dot" | "proj"; i: number }>({
    kind: "dot",
    i: Math.max(0, (megas[initialMega]?.dots.length ?? 1) - 1),
  });

  const pickMega = (i: number) => {
    setSelMega(i);
    setSel({ kind: "dot", i: Math.max(0, megas[i].dots.length - 1) }); // latest article of that storyline
  };

  const withDays = megas.filter((m) => m.volume.length > 0 || m.dots.length > 0);
  if (withDays.length === 0) return null;

  const allDays = megas.flatMap((m) => [...m.volume.map((v) => v.date), ...m.dots.map((d) => d.date)]).map(dayNum);
  const minD = Math.min(...allDays);
  const maxD = Math.max(...allDays);
  const maxCount = Math.max(1, ...megas.flatMap((m) => m.volume.map((v) => v.count)));

  // Split "now" axis: real history sits left of the divider, the projection
  // horizon (months of upcoming events) is compressed into the right region so
  // a few days of history don't collapse into a sliver.
  const nowD = dayNum(new Date().toISOString().slice(0, 10));
  const splitD = Math.max(maxD, nowD);
  const projDays = megas.flatMap((m) => m.projections.map((p) => dayNum(p.date)));
  const maxProjD = projDays.length ? Math.max(...projDays) : splitD;
  const hasFuture = maxProjD > splitD;

  const W = 1000, H = 340, padL = 44, padR = 18, padT = 18, padB = 34;
  const innerW = W - padL - padR, chartH = H - padT - padB;
  const histW = hasFuture ? innerW * 0.6 : innerW;
  const projW = innerW - histW;
  const splitX = padL + histW;
  const histSpan = Math.max(1, splitD - minD);
  const projSpan = Math.max(1, maxProjD - splitD);
  const x = (d: number) =>
    d <= splitD
      ? padL + ((d - minD) / histSpan) * histW
      : splitX + ((d - splitD) / projSpan) * projW;
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
  const xTickCount = Math.min(5, histSpan + 1);
  const xTicks = Array.from({ length: xTickCount }, (_, i) =>
    Math.round(minD + (histSpan * i) / Math.max(1, xTickCount - 1)),
  );

  const presentSectors = SECTOR_ORDER.filter((s) => megas.some((m) => m.primarySector === s));
  const hasAnyProjections = megas.some((m) => m.projections.length > 0);
  const selectedMega = megas[selMega];
  const selectedDot = sel.kind === "dot" ? selectedMega?.dots[sel.i] ?? null : null;
  const selectedProj = sel.kind === "proj" ? selectedMega?.projections[sel.i] ?? null : null;
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
        {hasAnyProjections && (
          <>
            <span className="hidden flex-1 sm:block" />
            <span className="font-[family-name:var(--font-space-mono)] text-[10px] tracking-wide text-stone-400">
              ◇ stippellijn = geagendeerde gebeurtenis · dichtheid = zekerheid
            </span>
          </>
        )}
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

        {/* "nu"-scheidslijn: links geschiedenis, rechts de prognosehorizon */}
        {hasFuture && (
          <g>
            <line x1={splitX} x2={splitX} y1={padT} y2={padT + chartH} className="stroke-stone-300 dark:stroke-stone-700" strokeWidth={1} strokeDasharray="2 3" />
            <text x={splitX + 5} y={padT + 9} fontSize={9} className="fill-stone-400" style={{ fontFamily: "var(--font-space-mono)" }}>
              NU
            </text>
          </g>
        )}

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
                      onClick={() => { setSelMega(i); setSel({ kind: "dot", i: j }); }}
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
            const isDotActive = sel.kind === "dot" && j === sel.i;
            const color = SECTOR_COLOR[selectedMega.primarySector];
            return (
              <g key={dot.childId} className="cursor-pointer" onClick={() => setSel({ kind: "dot", i: j })}>
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

        {/* active storyline's dotted projections — reach forward to dated agenda
            events; dash density + opacity encode certainty */}
        {selectedMega &&
          selectedMega.projections.length > 0 &&
          (() => {
            const days = selectedMega.volume.map((v) => dayNum(v.date));
            if (days.length === 0) return null;
            const lastD = Math.max(...days);
            const lastX = x(lastD);
            const lastY = y(activeByDay.get(lastD) ?? 0);
            const baseY = y(0);
            const color = SECTOR_COLOR[selectedMega.primarySector];
            return (
              <g>
                {selectedMega.projections.map((p, k) => {
                  const ex = x(dayNum(p.date));
                  const op = CERTAINTY_OPACITY[p.certainty] ?? 0.6;
                  const isProjActive = sel.kind === "proj" && k === sel.i;
                  const half = isProjActive ? 6 : 4;
                  return (
                    <g
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => setSel({ kind: "proj", i: k })}
                    >
                      <title>{`${p.title} · ${fmtDay(p.date)} · ${p.kind} · ${p.certainty}`}</title>
                      <path
                        d={`M ${lastX.toFixed(1)} ${lastY.toFixed(1)} L ${ex.toFixed(1)} ${baseY.toFixed(1)}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={isProjActive ? 2.4 : 1.6}
                        strokeDasharray={CERTAINTY_DASH[p.certainty] ?? "3 4"}
                        strokeOpacity={isProjActive ? 1 : op}
                        strokeLinecap="round"
                      />
                      {/* bigger transparent hit-area for easy clicking */}
                      <circle cx={ex} cy={baseY} r={13} fill="transparent" />
                      <rect
                        x={ex - half}
                        y={baseY - half}
                        width={half * 2}
                        height={half * 2}
                        transform={`rotate(45 ${ex} ${baseY})`}
                        fill={isProjActive ? "transparent" : p.certainty === "gerucht" ? "transparent" : color}
                        fillOpacity={isProjActive ? 1 : op}
                        stroke={color}
                        strokeWidth={isProjActive ? 2.5 : 1.5}
                      />
                      <text
                        x={ex}
                        y={baseY + 16}
                        textAnchor="middle"
                        fontSize={9}
                        className={isProjActive ? "fill-stone-700 dark:fill-stone-200" : "fill-stone-400"}
                        style={{ fontFamily: "var(--font-space-mono)", fontWeight: isProjActive ? 700 : 400 }}
                      >
                        {fmtDay(p.date)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })()}
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

      {/* ── a selected future event: read about the prediction ── */}
      {selectedProj && selectedMega && (
        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <article className="rounded-2xl border border-stone-200 p-5 dark:border-stone-800 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-[family-name:var(--font-space-mono)] text-[10.5px] font-bold uppercase tracking-wide text-[#2f6df0]">
                Vooruitblik · {selectedMega.title} · {fmtDay(selectedProj.date)}
              </span>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                {KIND_LABEL[selectedProj.kind] ?? selectedProj.kind}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-wide ${CERT_BADGE[selectedProj.certainty]?.cls ?? ""}`}
              >
                {CERT_BADGE[selectedProj.certainty]?.label ?? selectedProj.certainty}
              </span>
            </div>
            <h3 className="mt-1.5 font-[family-name:var(--font-archivo)] text-[20px] font-extrabold leading-snug tracking-tight">
              {selectedProj.title}
            </h3>
            {selectedProj.sourceBody ? (
              <p className="mt-2 text-[14px] leading-relaxed text-stone-600 dark:text-stone-300">
                {selectedProj.sourceBody}
              </p>
            ) : (
              <p className="mt-2 text-[14px] leading-relaxed text-stone-500 dark:text-stone-400">
                Geagendeerd rond {fmtDay(selectedProj.date)}, afgeleid uit het nieuws over{" "}
                {selectedMega.title}. Een volledige, bronnen­gebaseerde vooruitblik komt zodra de
                redactie er een voorspelling bij schrijft.
              </p>
            )}
            {selectedProj.source && (
              <a
                href={selectedProj.source}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 font-[family-name:var(--font-space-mono)] text-[11px] font-bold text-[#2f6df0] hover:underline"
              >
                {selectedProj.sourceTitle ? `Bron: ${selectedProj.sourceTitle}` : "Bron bekijken"} →
              </a>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
