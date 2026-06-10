import { describe, it, expect } from "vitest";
import { looksLikeAd, contentHash } from "./feeds";

describe("looksLikeAd (reclamefilter, heuristische laag)", () => {
  it("herkent gesponsorde content en advertorials", () => {
    expect(looksLikeAd("Sponsored: de beste laptops van 2026")).toBe(true);
    expect(looksLikeAd("Gewone kop", "dit is een advertorial over matrassen")).toBe(true);
    expect(looksLikeAd("Titel", null, ["Partner Content"])).toBe(true);
  });

  it("herkent deals- en kortingscontent", () => {
    expect(looksLikeAd("Deals: 50% korting op SSD's")).toBe(true);
    expect(looksLikeAd("De beste Black Friday aanbiedingen")).toBe(true);
  });

  it("laat officiële fabrikant-persberichten door (geen reclame)", () => {
    expect(looksLikeAd("Nvidia kondigt RTX 6090 aan")).toBe(false);
    expect(looksLikeAd("Apple presenteert nieuwe MacBook Pro")).toBe(false);
  });

  it("laat gewoon nieuws door", () => {
    expect(looksLikeAd("Kabinet valt over migratiebeleid")).toBe(false);
  });
});

describe("contentHash (dedupe)", () => {
  it("zelfde verhaal, andere opmaak → zelfde hash", () => {
    expect(contentHash("ASML boekt recordomzet!")).toBe(contentHash("ASML boekt recordomzet"));
    expect(contentHash("  asml BOEKT recordomzet  ")).toBe(contentHash("ASML boekt recordomzet"));
  });

  it("verschillende verhalen → verschillende hash", () => {
    expect(contentHash("ASML boekt recordomzet")).not.toBe(contentHash("ASML ontslaat personeel"));
  });
});
