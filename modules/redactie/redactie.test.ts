import { describe, it, expect } from "vitest";
import { orderDigestTopics, type DigestTopic } from "./index";

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
