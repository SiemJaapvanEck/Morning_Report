// Kalender/roadmap: date-geprikte eventstore.
//
// v1: lezen en schrijven van events.
// Phase B (Investment & Foresight): events worden automatisch uit artikeltekst
// gehaald (de scan vindt expliciet gedateerde gebeurtenissen) en door de
// `agenda`-stap per profiel weggeschreven, gekoppeld aan het bronitem en — als
// dat item in een thread zit — aan die verhaallijn.

import { db, unwrap } from "../shared/db";
import type {
  CalendarEvent,
  CalendarEventKind,
  CalendarEventCertainty,
  ExtractedEvent,
} from "../shared/types";

/** Toegestane event-soorten (spiegelt de check-constraint op calendar_events). */
export const CALENDAR_KINDS: CalendarEventKind[] = [
  "earnings",
  "release",
  "event",
  "dividend",
  "ipo",
  "verkiezing",
  "overig",
];

/** Toegestane zekerheidsniveaus (spiegelt de check-constraint). */
export const CALENDAR_CERTAINTIES: CalendarEventCertainty[] = [
  "bevestigd",
  "verwacht",
  "gerucht",
];

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

// ============================================================
// Phase B — auto-extracted agenda from scanned items
// ============================================================

/** One scanned item, with everything the agenda step needs to scope + link it. */
export interface AgendaItemInput {
  itemId: string;
  topicId: string | null;
  /** does the reader follow this item's topic/category? (resolved by caller) */
  followed: boolean;
  /** the thread this item joined this edition, or null (resolved by caller) */
  threadId: string | null;
  /** source url for provenance */
  source: string | null;
  /** events the scan extracted from this item (may be empty) */
  events: ExtractedEvent[];
}

/** A validated, linked row ready to insert into calendar_events. */
export interface AgendaRow {
  profile_id: string;
  item_id: string;
  thread_id: string | null;
  topic_id: string | null;
  title: string;
  kind: CalendarEventKind;
  date: string;
  certainty: CalendarEventCertainty;
  source: string | null;
  meta: Record<string, unknown>;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True only for a real calendar date in strict YYYY-MM-DD form. */
export function isValidIsoDate(raw: string): boolean {
  if (!ISO_DATE.test(raw)) return false;
  const d = new Date(`${raw}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === raw;
}

/**
 * Pure: turn scanned items into the calendar rows to persist. Scope is enforced
 * here — only items the reader follows OR that joined a thread contribute. Every
 * event is validated (real future date, known kind/certainty, non-empty title);
 * anything malformed or in the past is dropped, so a cheap-model hallucination
 * never reaches the agenda. Deduped on (date, lower(title)) so the same event
 * mentioned by several items lands once.
 */
export function buildAgendaRows(
  profileId: string,
  inputs: AgendaItemInput[],
  today: string,
): AgendaRow[] {
  const seen = new Set<string>();
  const rows: AgendaRow[] = [];
  for (const input of inputs) {
    if (!input.followed && input.threadId == null) continue; // scope: followed/threaded only
    for (const ev of input.events ?? []) {
      const title = ev.title?.trim();
      if (!title) continue;
      if (!isValidIsoDate(ev.date)) continue;
      if (ev.date < today) continue; // forward-dated only (lexical compare is safe for ISO)
      if (!CALENDAR_KINDS.includes(ev.kind)) continue;
      if (!CALENDAR_CERTAINTIES.includes(ev.certainty)) continue;

      const key = `${ev.date}|${title.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push({
        profile_id: profileId,
        item_id: input.itemId,
        thread_id: input.threadId,
        topic_id: input.topicId,
        title,
        kind: ev.kind,
        date: ev.date,
        certainty: ev.certainty,
        source: input.source,
        meta: {},
      });
    }
  }
  return rows;
}

/**
 * Idempotently replace the auto-extracted events for a set of source items:
 * delete this edition's existing rows for those items, then insert the rebuilt
 * set. Re-running the step is a no-op.
 */
export async function persistAgendaRows(
  itemIds: string[],
  rows: AgendaRow[],
): Promise<void> {
  if (itemIds.length > 0) {
    const { error } = await db().from("calendar_events").delete().in("item_id", itemIds);
    if (error) throw new Error(`Agenda (opschonen): ${error.message}`);
  }
  if (rows.length > 0) {
    const { error } = await db().from("calendar_events").insert(rows);
    if (error) throw new Error(`Agenda (opslaan): ${error.message}`);
  }
}
