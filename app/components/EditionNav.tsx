"use client";

// Kalendernavigatie boven elke editie: vorige/volgende (springt naar de
// dichtstbijzijnde dag mét editie), een Today-knop, een Dag/Week/Maand/Jaar-
// schakelaar en een mini-maandkiezer met stippen op dagen die een editie hebben.
// URL-gedreven (next/navigation) zodat links deelbaar zijn en de terugknop werkt.
// Alleen de besturing zit hier; de dag-inhoud zelf rendert eromheen.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EditionSummary } from "@/app/lib/queries";
import { MAANDEN, WEEKDAGEN, monthMatrix, parseISO } from "@/app/lib/dates";

export type CalendarView = "day" | "week" | "month" | "year";

const VIEW_LABEL: Record<CalendarView, string> = { day: "Dag", week: "Week", month: "Maand", year: "Jaar" };

export function EditionNav({
  date,
  today,
  view,
  summaries,
}: {
  date: string;
  today: string;
  view: CalendarView;
  summaries: EditionSummary[];
}) {
  const router = useRouter();
  const isToday = date === today;
  const base = isToday ? "/" : `/editie/${date}`;

  const editionDates = useMemo(
    () => new Set(summaries.map((s) => s.date)),
    [summaries],
  );
  const sorted = useMemo(
    () => [...editionDates].sort(),
    [editionDates],
  );

  // dichtstbijzijnde dag mét editie, vóór/na de huidige
  const prev = useMemo(() => [...sorted].reverse().find((d) => d < date) ?? null, [sorted, date]);
  const next = useMemo(() => sorted.find((d) => d > date) ?? null, [sorted, date]);

  const hrefFor = (d: string) => (d === today ? "/" : `/editie/${d}`);
  const viewSuffix = (v: CalendarView) => (v === "day" ? "" : `?view=${v}`);

  function go(href: string) {
    router.push(href, { scroll: false });
  }

  // ── mini-maandkiezer ──────────────────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shownMonth, setShownMonth] = useState<[number, number]>(() => {
    const [y, m] = parseISO(date);
    return [y, m];
  });

  const monthGrid = useMemo(() => monthMatrix(shownMonth[0], shownMonth[1]), [shownMonth]);

  const [curY, curM] = parseISO(date);
  const monthLabel = `${MAANDEN[shownMonth[1]]} ${shownMonth[0]}`;
  const headerLabel = `${MAANDEN[curM]} ${curY}`;

  const pill = "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors";
  const groupBox = "inline-flex items-center rounded-full border border-stone-200 bg-white p-0.5 dark:border-stone-800 dark:bg-stone-900";

  return (
    <div className="relative mb-5">
      <div className="flex flex-wrap items-center gap-2">
        {/* vorige · today · volgende */}
        <div className={groupBox}>
          <button
            type="button"
            aria-label="Vorige editie"
            disabled={!prev}
            onClick={() => prev && go(hrefFor(prev) + viewSuffix(view))}
            className={`${pill} ${prev ? "hover:bg-stone-100 dark:hover:bg-stone-800" : "cursor-not-allowed opacity-40"}`}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go("/" + viewSuffix(view))}
            className={`${pill} ${isToday ? "bg-[#2f6df0] text-white" : "hover:bg-stone-100 dark:hover:bg-stone-800"}`}
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Volgende editie"
            disabled={!next}
            onClick={() => next && go(hrefFor(next) + viewSuffix(view))}
            className={`${pill} ${next ? "hover:bg-stone-100 dark:hover:bg-stone-800" : "cursor-not-allowed opacity-40"}`}
          >
            ›
          </button>
        </div>

        {/* maandkiezer-toggle */}
        <button
          type="button"
          onClick={() => {
            setShownMonth([curY, curM]);
            setPickerOpen((o) => !o);
          }}
          aria-expanded={pickerOpen}
          className="rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-[12px] font-bold capitalize text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          {headerLabel} ▾
        </button>

        <span className="flex-1" />

        {/* dag/week/maand/jaar */}
        <div className={groupBox}>
          {(Object.keys(VIEW_LABEL) as CalendarView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => go(base + viewSuffix(v))}
              className={`${pill} ${v === view ? "bg-[#2f6df0] text-white" : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"}`}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
      </div>

      {/* mini-maandpopover */}
      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} aria-hidden />
          <div className="absolute left-0 top-12 z-20 w-72 rounded-2xl border border-stone-200 bg-white p-4 shadow-xl dark:border-stone-800 dark:bg-stone-900">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                aria-label="Vorige maand"
                onClick={() => setShownMonth(([y, m]) => (m === 0 ? [y - 1, 11] : [y, m - 1]))}
                className="rounded-full px-2 py-1 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                ‹
              </button>
              <span className="text-[13px] font-bold capitalize">{monthLabel}</span>
              <button
                type="button"
                aria-label="Volgende maand"
                onClick={() => setShownMonth(([y, m]) => (m === 11 ? [y + 1, 0] : [y, m + 1]))}
                className="rounded-full px-2 py-1 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                ›
              </button>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-stone-400">
              {WEEKDAGEN.map((w, i) => (
                <span key={i}>{w}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthGrid.map((cell) => {
                const has = editionDates.has(cell.iso);
                const isSel = cell.iso === date;
                const isTod = cell.iso === today;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    disabled={!has}
                    onClick={() => {
                      setPickerOpen(false);
                      go(hrefFor(cell.iso) + viewSuffix(view));
                    }}
                    className={[
                      "relative flex h-8 items-center justify-center rounded-lg text-[12px]",
                      cell.inMonth ? "" : "opacity-35",
                      isSel
                        ? "bg-[#2f6df0] font-bold text-white"
                        : has
                          ? "font-semibold text-stone-800 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-800"
                          : "cursor-default text-stone-400",
                      isTod && !isSel ? "ring-1 ring-[#2f6df0]" : "",
                    ].join(" ")}
                  >
                    {cell.day}
                    {has && !isSel && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#2f6df0]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
