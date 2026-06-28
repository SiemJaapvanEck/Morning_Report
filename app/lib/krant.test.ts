import { describe, it, expect } from "vitest";
import { orderSectionsFollowedFirst } from "./krant";
import type { SectionView } from "./queries";

// Minimal SectionView stubs — only section.category_id + a marker title matter.
function sec(id: string, categoryId: string | null): SectionView {
  return {
    section: {
      id,
      edition_id: "e1",
      kind: "category",
      category_id: categoryId,
      title: id,
      position: 0,
      payload: {},
    },
    weather: null,
    items: [],
  };
}

describe("orderSectionsFollowedFirst", () => {
  const sections = [sec("tech", "c-tech"), sec("politiek", "c-pol"), sec("sport", "c-sport")];

  it("brings followed categories to the front, keeping their relative order", () => {
    const out = orderSectionsFollowedFirst(sections, ["c-sport", "c-pol"]);
    expect(out.map((s) => s.section.title)).toEqual(["politiek", "sport", "tech"]);
  });

  it("leaves order unchanged when nothing is followed", () => {
    const out = orderSectionsFollowedFirst(sections, []);
    expect(out.map((s) => s.section.title)).toEqual(["tech", "politiek", "sport"]);
  });

  it("is stable within the followed and unfollowed groups", () => {
    const out = orderSectionsFollowedFirst(sections, ["c-tech"]);
    expect(out.map((s) => s.section.title)).toEqual(["tech", "politiek", "sport"]);
  });

  it("ignores unknown / null category_ids safely", () => {
    const withNull = [...sections, sec("losse", null)];
    const out = orderSectionsFollowedFirst(withNull, ["c-nope"]);
    expect(out.map((s) => s.section.title)).toEqual(["tech", "politiek", "sport", "losse"]);
  });
});
