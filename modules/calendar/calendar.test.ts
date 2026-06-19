import { describe, it, expect } from "vitest";
import { buildAgendaRows, isValidIsoDate, type AgendaItemInput } from "./index";
import type { ExtractedEvent } from "../shared/types";

const TODAY = "2026-06-19";

function ev(over: Partial<ExtractedEvent> = {}): ExtractedEvent {
  return { title: "IPO Acme", date: "2026-07-01", kind: "ipo", certainty: "verwacht", ...over };
}

function input(over: Partial<AgendaItemInput> = {}): AgendaItemInput {
  return {
    itemId: "i1",
    topicId: "t1",
    followed: true,
    threadId: null,
    source: "https://example.com/a",
    events: [ev()],
    ...over,
  };
}

describe("isValidIsoDate", () => {
  it("accepts a real YYYY-MM-DD date", () => {
    expect(isValidIsoDate("2026-07-01")).toBe(true);
  });
  it("rejects wrong shapes and impossible dates", () => {
    expect(isValidIsoDate("2026-7-1")).toBe(false);
    expect(isValidIsoDate("1 juli")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false); // no month 13
    expect(isValidIsoDate("2026-02-30")).toBe(false); // rolls over → not equal
    expect(isValidIsoDate("")).toBe(false);
  });
});

describe("buildAgendaRows", () => {
  it("builds a linked row for a followed item's future event", () => {
    const rows = buildAgendaRows("p1", [input()], TODAY);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      profile_id: "p1",
      item_id: "i1",
      topic_id: "t1",
      thread_id: null,
      title: "IPO Acme",
      date: "2026-07-01",
      kind: "ipo",
      certainty: "verwacht",
      source: "https://example.com/a",
    });
  });

  it("inherits the thread_id when the source item joined a thread", () => {
    const rows = buildAgendaRows("p1", [input({ followed: false, threadId: "th9" })], TODAY);
    expect(rows).toHaveLength(1);
    expect(rows[0].thread_id).toBe("th9");
  });

  it("skips items that are neither followed nor threaded (scope)", () => {
    const rows = buildAgendaRows("p1", [input({ followed: false, threadId: null })], TODAY);
    expect(rows).toEqual([]);
  });

  it("drops past dates, keeps today", () => {
    const rows = buildAgendaRows(
      "p1",
      [input({ events: [ev({ date: "2026-06-18" }), ev({ title: "Vandaag", date: TODAY })] })],
      TODAY,
    );
    expect(rows.map((r) => r.title)).toEqual(["Vandaag"]);
  });

  it("drops malformed dates, unknown kinds/certainty, and empty titles", () => {
    const rows = buildAgendaRows(
      "p1",
      [
        input({
          events: [
            ev({ date: "ergens in juli" }),
            ev({ kind: "bogus" as ExtractedEvent["kind"] }),
            ev({ certainty: "misschien" as ExtractedEvent["certainty"] }),
            ev({ title: "   " }),
          ],
        }),
      ],
      TODAY,
    );
    expect(rows).toEqual([]);
  });

  it("dedupes the same event across items on (date, lower title)", () => {
    const rows = buildAgendaRows(
      "p1",
      [
        input({ itemId: "i1", events: [ev({ title: "ECB-vergadering", date: "2026-07-10" })] }),
        input({ itemId: "i2", events: [ev({ title: "ecb-vergadering", date: "2026-07-10" })] }),
      ],
      TODAY,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].item_id).toBe("i1"); // first wins
  });
});
