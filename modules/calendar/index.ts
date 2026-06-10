// Kalender/roadmap: date-geprikte eventstore.
//
// v1: lezen en schrijven van events. Fase 7 koppelt de finance-API's
// (earnings, dividend, IPO's) en de roadmap-weergave.

import { db, unwrap } from "../shared/db";
import type { CalendarEvent } from "../shared/types";

/** Aankomende events binnen `daysAhead` dagen, op datum. */
export async function upcomingEvents(daysAhead = 14): Promise<CalendarEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const until = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return unwrap(
    await db()
      .from("calendar_events")
      .select("*")
      .gte("date", today)
      .lte("date", until)
      .order("date", { ascending: true }),
  );
}

export async function addEvent(
  event: Omit<CalendarEvent, "id" | "created_at">,
): Promise<void> {
  const { error } = await db().from("calendar_events").insert(event);
  if (error) throw new Error(`Kalender: ${error.message}`);
}
