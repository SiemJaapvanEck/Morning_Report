import { describe, it, expect } from "vitest";
import { DESKS, deskForCategory } from "./index";

describe("deskForCategory (desk → categorie-map)", () => {
  it("wijst categorieën aan de juiste desk toe", () => {
    expect(deskForCategory("tech")?.id).toBe("tech");
    expect(deskForCategory("wetenschap")?.id).toBe("tech");
    expect(deskForCategory("frontier")?.id).toBe("tech");
    expect(deskForCategory("wereld")?.id).toBe("wereld");
    expect(deskForCategory("financieel")?.id).toBe("financieel");
    expect(deskForCategory("games")?.id).toBe("journalist");
    expect(deskForCategory("lokaal")?.id).toBe("journalist");
    expect(deskForCategory("goed-nieuws")?.id).toBe("journalist");
  });

  it("geeft null voor een onbekende categorie", () => {
    expect(deskForCategory("bestaat-niet")).toBeNull();
  });

  it("de persoonlijke desk dekt geen categorie en is niet via de map vindbaar", () => {
    const personal = DESKS.find((d) => d.personal);
    expect(personal).toBeTruthy();
    expect(personal!.categories).toEqual([]);
  });

  it("elke vaste categorie hoort bij precies één desk (geen overlap)", () => {
    const all = DESKS.filter((d) => !d.personal).flatMap((d) => d.categories);
    expect(new Set(all).size).toBe(all.length);
  });
});
