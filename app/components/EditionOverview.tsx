// Week-, maand- en jaaroverzicht van de edities. Lichtgewicht: alleen metadata
// (datum + status + kop) uit listEditionSummaries; elke kaart linkt naar de
// dag-weergave. Kaart-grid-layouts, volledig responsief. Server-component
// (geen interactie hier — de besturing zit in EditionNav).

import Link from "next/link";
import type { EditionSummary } from "@/app/lib/queries";
import type { CalendarView } from "./EditionNav";
import { MAANDEN, WEEKDAGEN, fmtISO, monthMatrix, parseISO, weekDays } from "@/app/lib/dates";

const TILE = "rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900";

type ByDate = Map<string, EditionSummary>;

function hrefFor(d: string, today: string) {
  return d === today ? "/" : `/editie/${d}`;
}

// ── Week: horizontale strook dagkaarten ──────────────────────────────────────
function WeekView({ date, today, byDate }: { date: string; today: string; byDate: ByDate }) {
  const days = weekDays(date);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {days.map((iso) => {
        const sum = byDate.get(iso);
        const isSel = iso === date;
        const isTod = iso === today;
        const cls = [
          "flex min-h-[132px] flex-col rounded-2xl border p-4 transition-colors",
          isSel
            ? "border-[#2f6df0] bg-[#2f6df0] text-white"
            : sum
              ? "border-stone-200 bg-white hover:border-[#2f6df0] hover:shadow-sm dark:border-stone-800 dark:bg-stone-900"
              : "border-stone-200/70 bg-stone-50 dark:border-stone-800/60 dark:bg-stone-900/40",
          isTod && !isSel ? "ring-2 ring-[#2f6df0]" : "",
        ].join(" ");
        const inner = (
          <>
            <div className="flex items-baseline justify-between">
              <span className={`text-[12px] font-bold capitalize ${isSel ? "text-white/85" : "text-stone-500 dark:text-stone-400"}`}>
                {fmtISO(iso, { weekday: "short" })}
              </span>
              <span className="text-[20px] font-extrabold leading-none">{fmtISO(iso, { day: "numeric" })}</span>
            </div>
            {sum ? (
              <p className="mt-2.5 line-clamp-4 text-[13px] font-semibold leading-snug">
                {sum.headline ?? "Editie samengesteld"}
              </p>
            ) : (
              <p className={`mt-2.5 text-[12px] ${isSel ? "text-white/70" : "text-stone-400"}`}>geen editie</p>
            )}
            <span className="flex-1" />
            {sum && sum.status !== "done" && (
              <span className="mt-2 self-start rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                in de maak
              </span>
            )}
            {isTod && (
              <span className={`mt-2 text-[10px] font-bold uppercase tracking-wide ${isSel ? "text-white/80" : "text-[#2f6df0]"}`}>
                vandaag
              </span>
            )}
          </>
        );
        return sum ? (
          <Link
            key={iso}
            href={hrefFor(iso, today)}
            className={cls}
            aria-label={fmtISO(iso, { weekday: "long", day: "numeric", month: "long" })}
          >
            {inner}
          </Link>
        ) : (
          <div key={iso} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

// ── één maand-rooster (gedeeld door maand- en jaarweergave) ──────────────────
function MonthGrid({
  year,
  month,
  date,
  today,
  byDate,
  big,
}: {
  year: number;
  month: number;
  date: string;
  today: string;
  byDate: ByDate;
  big: boolean;
}) {
  const cells = monthMatrix(year, month);
  return (
    <div>
      <div className={`mb-2 grid grid-cols-7 ${big ? "gap-1.5 sm:gap-2" : "gap-1"} text-center text-[10px] font-bold text-stone-400`}>
        {WEEKDAGEN.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className={`grid grid-cols-7 ${big ? "gap-1.5 sm:gap-2" : "gap-1"}`}>
        {cells.map((cell) => {
          const sum = byDate.get(cell.iso);
          const isSel = cell.iso === date;
          const isTod = cell.iso === today;

          // maandweergave: dagkaarten (kop op sm+, compact dag+stip op mobiel)
          if (big) {
            const cls = [
              "relative flex min-h-[64px] flex-col rounded-xl border p-2 transition-colors sm:min-h-[104px]",
              cell.inMonth ? "" : "opacity-40",
              isSel
                ? "border-[#2f6df0] bg-[#2f6df0] text-white"
                : sum
                  ? "border-stone-200 bg-white hover:border-[#2f6df0] hover:shadow-sm dark:border-stone-800 dark:bg-stone-900"
                  : "border-stone-200/60 bg-stone-50/60 dark:border-stone-800/50 dark:bg-stone-900/30",
              isTod && !isSel ? "ring-2 ring-[#2f6df0]" : "",
            ].join(" ");
            const content = (
              <>
                <span className="text-[12px] font-bold">{cell.day}</span>
                {sum && (
                  <span className={`mt-1 hidden line-clamp-3 text-[10.5px] leading-tight sm:block ${isSel ? "text-white/90" : "text-stone-500 dark:text-stone-400"}`}>
                    {sum.headline ?? "Editie"}
                  </span>
                )}
                {sum && !isSel && (
                  <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#2f6df0] sm:hidden" />
                )}
              </>
            );
            return sum ? (
              <Link key={cell.iso} href={hrefFor(cell.iso, today)} className={cls} title={sum.headline ?? undefined}>
                {content}
              </Link>
            ) : (
              <div key={cell.iso} className={cls}>
                {content}
              </div>
            );
          }

          // jaarweergave: compacte dag-cel met stip
          const cls = [
            "relative flex h-7 items-center justify-center rounded-lg text-[11px]",
            cell.inMonth ? "" : "opacity-35",
            isSel ? "bg-[#2f6df0] font-bold text-white" : sum ? "font-semibold hover:bg-stone-100 dark:hover:bg-stone-800" : "text-stone-400",
            isTod && !isSel ? "ring-1 ring-[#2f6df0]" : "",
          ].join(" ");
          const content = (
            <>
              <span>{cell.day}</span>
              {sum && !isSel && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#2f6df0]" />}
            </>
          );
          return sum ? (
            <Link key={cell.iso} href={hrefFor(cell.iso, today)} className={cls} title={sum.headline ?? undefined}>
              {content}
            </Link>
          ) : (
            <div key={cell.iso} className={cls}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({ date, today, byDate }: { date: string; today: string; byDate: ByDate }) {
  const [y, m] = parseISO(date);
  return <MonthGrid year={y} month={m} date={date} today={today} byDate={byDate} big />;
}

function YearView({ date, today, byDate }: { date: string; today: string; byDate: ByDate }) {
  const [y] = parseISO(date);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {MAANDEN.map((naam, mi) => (
        <div key={mi} className={`${TILE} p-3`}>
          <div className="mb-2 text-[12px] font-bold capitalize">{naam}</div>
          <MonthGrid year={y} month={mi} date={date} today={today} byDate={byDate} big={false} />
        </div>
      ))}
    </div>
  );
}

export function EditionOverview({
  view,
  date,
  today,
  summaries,
}: {
  view: Exclude<CalendarView, "day">;
  date: string;
  today: string;
  summaries: EditionSummary[];
}) {
  const byDate: ByDate = new Map(summaries.map((s) => [s.date, s]));
  if (view === "week") return <WeekView date={date} today={today} byDate={byDate} />;
  if (view === "year") return <YearView date={date} today={today} byDate={byDate} />;
  return <MonthView date={date} today={today} byDate={byDate} />;
}
