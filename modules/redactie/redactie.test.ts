import { describe, it, expect } from "vitest";
import { orderDigestTopics, cleanSectionIntros, type DigestTopic } from "./index";

const topic = (name: string, followed: boolean, headlines: string[]): DigestTopic => ({
  name,
  followed,
  headlines,
});

describe("orderDigestTopics", () => {
  it("drops topics without news today (topic-driven coverage)", () => {
    const out = orderDigestTopics([topic("Tech", false, ["a"]), topic("Leeg", false, [])]);
    expect(out.map((t) => t.name)).toEqual(["Tech"]);
  });

  it("leads with followed topics, even when they carry less news", () => {
    const out = orderDigestTopics([
      topic("Algemeen", false, ["a", "b", "c"]),
      topic("Tech", true, ["x"]),
    ]);
    expect(out[0].name).toBe("Tech");
  });

  it("orders unfollowed topics by how much news they carry", () => {
    const out = orderDigestTopics([
      topic("Klein", false, ["a"]),
      topic("Groot", false, ["a", "b", "c"]),
    ]);
    expect(out.map((t) => t.name)).toEqual(["Groot", "Klein"]);
  });
});

describe("cleanSectionIntros (per-section caption + summary)", () => {
  it("trims and keeps well-formed section text", () => {
    expect(
      cleanSectionIntros({
        sections: [{ title: " Economie ", caption: " Onrust drukt de beurzen. ", summary: " Brede daling.  " }],
      }),
    ).toEqual([{ title: "Economie", caption: "Onrust drukt de beurzen.", summary: "Brede daling." }]);
  });

  it("drops sections without a title or with no text at all", () => {
    const out = cleanSectionIntros({
      sections: [
        { title: "Politiek", caption: "Coalitie verdeeld.", summary: "" },
        { title: "", caption: "geen titel", summary: "x" },
        { title: "Leeg", caption: "  ", summary: "  " },
      ],
    });
    expect(out).toEqual([{ title: "Politiek", caption: "Coalitie verdeeld.", summary: "" }]);
  });

  it("handles a missing/empty payload", () => {
    expect(cleanSectionIntros(null)).toEqual([]);
    expect(cleanSectionIntros({})).toEqual([]);
  });
});
