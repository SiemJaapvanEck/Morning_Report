import { describe, it, expect } from "vitest";
import { looksLikeAd, contentHash, extractImage } from "./feeds";

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

describe("extractImage (artikelafbeelding uit feed-item)", () => {
  it("pakt media:content met een afbeelding", () => {
    expect(
      extractImage({
        mediaContent: [{ $: { url: "https://cdn.example/a.jpg", medium: "image" } }],
      }),
    ).toBe("https://cdn.example/a.jpg");
  });

  it("slaat media:content over die geen afbeelding is (bv. video)", () => {
    expect(
      extractImage({
        mediaContent: [
          { $: { url: "https://cdn.example/clip.mp4", medium: "video" } },
          { $: { url: "https://cdn.example/still.jpg", type: "image/jpeg" } },
        ],
      }),
    ).toBe("https://cdn.example/still.jpg");
  });

  it("valt terug op media:thumbnail", () => {
    expect(
      extractImage({ mediaThumbnail: [{ $: { url: "https://cdn.example/thumb.png" } }] }),
    ).toBe("https://cdn.example/thumb.png");
  });

  it("gebruikt enclosure alleen bij image/*-type", () => {
    expect(
      extractImage({ enclosure: { url: "https://cdn.example/b.jpg", type: "image/jpeg" } }),
    ).toBe("https://cdn.example/b.jpg");
    expect(
      extractImage({ enclosure: { url: "https://cdn.example/audio.mp3", type: "audio/mpeg" } }),
    ).toBeNull();
  });

  it("vist de eerste <img> uit de HTML-inhoud", () => {
    expect(
      extractImage({ content: '<p>tekst</p><img src="https://cdn.example/inline.webp" alt="">' }),
    ).toBe("https://cdn.example/inline.webp");
  });

  it("negeert relatieve img-paden en geeft null zonder afbeelding", () => {
    expect(extractImage({ content: '<img src="/images/rel.jpg">' })).toBeNull();
    expect(extractImage({})).toBeNull();
  });
});
