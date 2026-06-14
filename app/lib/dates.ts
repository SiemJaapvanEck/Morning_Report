// Kleine, pure datumhelpers voor de kalendernavigatie en -overzichten.
// Werkt op "YYYY-MM-DD"-strings en lokale Date-objecten (alleen y/m/d telt).

export const WEEKDAGEN = ["M", "D", "W", "D", "V", "Z", "Z"];
export const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

/** "YYYY-MM-DD" → [year, monthIndex(0-11), day]. */
export function parseISO(d: string): [number, number, number] {
  const [y, m, day] = d.split("-").map(Number);
  return [y, m - 1, day];
}

export function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Weekdag-index met maandag = 0 (JS getDay heeft zondag = 0). */
export function monFirst(weekday: number): number {
  return (weekday + 6) % 7;
}

export interface DayCell {
  iso: string;
  day: number;
  /** valt deze cel binnen de getoonde maand (vs. voor/naloop) */
  inMonth: boolean;
}

/** Volledige maand als rooster (Mon-first), met voor- en nalopende dagen. */
export function monthMatrix(year: number, month: number): DayCell[] {
  const lead = monFirst(new Date(year, month, 1).getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: DayCell[] = [];
  for (let i = lead - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    cells.push({ iso: toISO(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ iso: toISO(year, month, d), day: d, inMonth: true });
  while (cells.length % 7 !== 0) {
    const [ly, lm, ld] = parseISO(cells[cells.length - 1].iso);
    const d = new Date(ly, lm, ld + 1);
    cells.push({ iso: toISO(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), inMonth: false });
  }
  return cells;
}

/** De 7 dagen (Mon-first) van de week waarin `iso` valt. */
export function weekDays(iso: string): string[] {
  const [y, m, d] = parseISO(iso);
  const base = new Date(y, m, d);
  const start = new Date(y, m, d - monFirst(base.getDay()));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return toISO(day.getFullYear(), day.getMonth(), day.getDate());
  });
}

/** nl-NL-datumlabel uit een ISO-string. */
export function fmtISO(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("nl-NL", opts);
}
