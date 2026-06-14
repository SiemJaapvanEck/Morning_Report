import { describe, it, expect } from "vitest";
import { looksLikeAd, contentHash, extractImage, extractMedia, parseDuration } from "./feeds";

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

describe("parseDuration (itunes:duration → seconden)", () => {
  it("leest een kale secondenwaarde", () => {
    expect(parseDuration("3600")).toBe(3600);
  });

  it("leest mm:ss en hh:mm:ss", () => {
    expect(parseDuration("45:30")).toBe(2730);
    expect(parseDuration("1:02:03")).toBe(3723);
  });

  it("geeft null bij leeg of onleesbaar", () => {
    expect(parseDuration(null)).toBeNull();
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("onzin")).toBeNull();
  });
});

describe("extractMedia (afspeelbare media uit feed-item)", () => {
  it("pakt een audio-enclosure met duur (podcast)", () => {
    expect(
      extractMedia({
        enclosure: { url: "https://cdn.example/ep.mp3", type: "audio/mpeg" },
        itunesDuration: "45:30",
      }),
    ).toEqual({ url: "https://cdn.example/ep.mp3", durationSec: 2730 });
  });

  it("pakt een video-enclosure", () => {
    expect(
      extractMedia({ enclosure: { url: "https://cdn.example/clip.mp4", type: "video/mp4" } }),
    ).toEqual({ url: "https://cdn.example/clip.mp4", durationSec: null });
  });

  it("gebruikt de watch-URL van een YouTube-feed-item", () => {
    expect(extractMedia({ link: "https://www.youtube.com/watch?v=abc123" })).toEqual({
      url: "https://www.youtube.com/watch?v=abc123",
      durationSec: null,
    });
  });

  it("geeft null voor een gewoon artikel of niet-afspeelbare enclosure", () => {
    expect(extractMedia({ link: "https://news.example/article" })).toBeNull();
    expect(
      extractMedia({ enclosure: { url: "https://cdn.example/a.jpg", type: "image/jpeg" } }),
    ).toBeNull();
    expect(extractMedia({})).toBeNull();
  });
});
