import { describe, expect, it } from "vitest";
import {
  DEFAULT_DARK_SCHEME_ID,
  DEFAULT_SCHEME_ID,
  LEGACY_THEME_TO_SCHEME,
  NEUTRAL_DARK,
  NEUTRAL_LIGHT,
  SCHEMES,
  findScheme,
  schemeBootstrapScript,
  schemeCss,
} from "./schemes";

describe("SCHEMES", () => {
  it("has unique ids", () => {
    const ids = SCHEMES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("groups match the dark flag", () => {
    for (const s of SCHEMES) {
      expect(s.group).toBe(s.dark ? "Donker" : "Licht");
    }
  });

  it("contains both defaults, with the right polarity", () => {
    expect(findScheme(DEFAULT_SCHEME_ID)?.dark).toBe(false);
    expect(findScheme(DEFAULT_DARK_SCHEME_ID)?.dark).toBe(true);
  });

  it("maps every legacy theme to an existing scheme", () => {
    for (const [legacy, schemeId] of Object.entries(LEGACY_THEME_TO_SCHEME)) {
      expect(findScheme(schemeId), `legacy '${legacy}' → '${schemeId}'`).toBeDefined();
    }
    expect(LEGACY_THEME_TO_SCHEME.krant).toBe(DEFAULT_SCHEME_ID);
    expect(LEGACY_THEME_TO_SCHEME.nacht).toBe(DEFAULT_DARK_SCHEME_ID);
  });

  it("neutral bases define the same variable names", () => {
    expect(Object.keys(NEUTRAL_DARK).sort()).toEqual(Object.keys(NEUTRAL_LIGHT).sort());
  });
});

describe("schemeCss", () => {
  const css = schemeCss();

  it("emits a :root default plus one block per scheme", () => {
    expect(css).toContain(":root{");
    for (const s of SCHEMES) {
      expect(css).toContain(`html[data-scheme="${s.id}"]{`);
    }
  });

  it("gives every block the accent set and neutral base", () => {
    for (const s of SCHEMES) {
      const block = css.split(`html[data-scheme="${s.id}"]{`)[1].split("}")[0];
      expect(block).toContain(`--accent:${s.accent};`);
      expect(block).toContain(`--accent-deep:${s.accentDeep};`);
      expect(block).toContain(`--accent-tint:${s.accentTint};`);
      expect(block).toContain(`--bg:${s.bg};`);
      expect(block).toContain(`--paper:${s.dark ? NEUTRAL_DARK["--paper"] : NEUTRAL_LIGHT["--paper"]};`);
    }
  });

  it(":root default equals the default scheme", () => {
    const root = css.split(":root{")[1].split("}")[0];
    const blue = findScheme(DEFAULT_SCHEME_ID)!;
    expect(root).toContain(`--accent:${blue.accent};`);
  });
});

describe("schemeBootstrapScript", () => {
  const script = schemeBootstrapScript();

  it("knows every scheme id and every dark id", () => {
    for (const s of SCHEMES) {
      expect(script).toContain(`"${s.id}"`);
    }
  });

  it("migrates legacy themes and falls back to the OS-based defaults", () => {
    expect(script).toContain("mr_thema");
    expect(script).toContain("mr_scheme");
    expect(script).toContain(`"${DEFAULT_SCHEME_ID}"`);
    expect(script).toContain(`"${DEFAULT_DARK_SCHEME_ID}"`);
    expect(script).toContain("prefers-color-scheme: dark");
  });
});
