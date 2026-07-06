// Color-scheme system ("brandbook tokens") — single source of truth.
//
// A scheme = an accent set (accent / accent-deep / accent-tint) + page
// background, layered on a shared neutral base (light or dark). The CSS for
// all schemes is generated server-side from this file (see `schemeCss()`)
// and injected by layout.tsx, so there is exactly one place where token
// values live. Reference design: "Morning Report design/krant-a2-dagblad.html";
// documentation: docs/brandbook.md.

export type SchemeGroup = "Licht" | "Donker";

export interface Scheme {
  id: string;
  /** Display name in the picker (Dutch UI copy). */
  name: string;
  group: SchemeGroup;
  /** Swatch color shown in the picker. */
  swatch: string;
  dark: boolean;
  /** Scheme-specific variables, layered on the neutral base. */
  accent: string;
  accentDeep: string;
  accentTint: string;
  bg: string;
}

/** Neutral base shared by all light schemes. */
export const NEUTRAL_LIGHT: Record<string, string> = {
  "--paper": "#ffffff",
  "--ink": "#1c1917",
  "--ink2": "#292524",
  "--muted": "#57534e",
  "--faint": "#a8a29e",
  "--line": "#e7e5e0",
  "--line2": "#efedea",
  "--hatch": "#ece9e3",
  "--util-bg": "rgba(247,246,243,.9)",
  "--map-bg": "#f5f4f1",
  "--map-ocean": "rgba(28,25,23,0.07)",
  "--map-land": "rgba(28,25,23,0.12)",
};

/** Neutral base shared by all dark schemes. */
export const NEUTRAL_DARK: Record<string, string> = {
  "--paper": "#1c1c20",
  "--ink": "#f4f4f5",
  "--ink2": "#d4d4d8",
  "--muted": "#a1a1aa",
  "--faint": "#71717a",
  "--line": "#2f2f36",
  "--line2": "#26262c",
  "--hatch": "#26262c",
  "--util-bg": "rgba(15,15,17,.9)",
  "--map-bg": "#18181b",
  "--map-ocean": "rgba(255,255,255,0.07)",
  "--map-land": "rgba(255,255,255,0.16)",
};

const L = (
  id: string,
  name: string,
  accent: string,
  accentDeep: string,
  accentTint: string,
  bg: string,
): Scheme => ({ id, name, group: "Licht", swatch: accent, dark: false, accent, accentDeep, accentTint, bg });

const D = (
  id: string,
  name: string,
  accent: string,
  accentDeep: string,
  accentTint: string,
  bg: string,
): Scheme => ({ id, name, group: "Donker", swatch: accent, dark: true, accent, accentDeep, accentTint, bg });

/** All schemes, in picker order. The first is the default ("Signaalblauw"). */
export const SCHEMES: readonly Scheme[] = [
  L("blue", "Signaalblauw", "#2f6df0", "#1f57d6", "#eef3fe", "#f7f6f3"),
  L("sky", "Hemelsblauw", "#1186d6", "#0e6fb3", "#e2f0fb", "#f4f6f8"),
  L("cyan", "Cyaan", "#0e8d96", "#0b727a", "#ddf2f3", "#f1f6f6"),
  L("green", "Diepgroen", "#1f8a5b", "#15704a", "#e4f3ec", "#f3f6f2"),
  L("olive", "Olijf", "#5f7d10", "#4d660d", "#eef2d9", "#f6f6ef"),
  L("amber", "Oker", "#b07d12", "#8f640e", "#f6ecce", "#f8f5ec"),
  L("orange", "Oranjegloed", "#e2620f", "#be520c", "#fcebdd", "#f8f5f1"),
  L("terra", "Terracotta", "#c2553d", "#a44530", "#f8e8e2", "#f7f4f0"),
  L("red", "Redactierood", "#d23f34", "#b1322a", "#fbe9e7", "#f7f4f1"),
  L("wine", "Bordeaux", "#8e2741", "#761f35", "#f6e2e7", "#f7f3f4"),
  L("rose", "Roze", "#e0567f", "#c2456a", "#fce6ed", "#f8f5f6"),
  L("magenta", "Fuchsia", "#c2256f", "#a01d5c", "#fbe3ef", "#f8f4f6"),
  L("violet", "Koningsviolet", "#6b4ef0", "#573dd0", "#efeafe", "#f6f5f4"),
  L("indigo", "Indigo", "#4f46e5", "#3f38c4", "#eceafd", "#f5f5f7"),
  L("navy", "Marine", "#243b73", "#1b2d59", "#e6ebf5", "#f5f6f8"),
  L("espresso", "Espresso", "#6b4a2f", "#553a25", "#efe6dd", "#f6f4f1"),
  L("mono", "Grafiet", "#3f3f46", "#27272a", "#ededf0", "#f4f3f1"),
  D("dark", "Middernacht", "#5b8cff", "#3f6fe0", "#1f2a44", "#12161d"),
  D("dteal", "Diep teal", "#2dd4bf", "#1fae9d", "#0f312d", "#0f1413"),
  D("dgreen", "Neongroen", "#36d399", "#28b07f", "#103326", "#0f1512"),
  D("damber", "Houtskool & oker", "#f0a830", "#d18f1f", "#3a2e12", "#141210"),
  D("dred", "Gloeiend rood", "#f87171", "#ea5455", "#3a1a1a", "#151011"),
  D("dmagenta", "Donker fuchsia", "#ec4899", "#d12d80", "#3a1428", "#141016"),
  D("dviolet", "Donker violet", "#a78bfa", "#8b6df0", "#271f44", "#131218"),
] as const;

export const DEFAULT_SCHEME_ID = "blue";
export const DEFAULT_DARK_SCHEME_ID = "dark";

export type SchemeId = string;

/** The pre-scheme themes ('mr_thema') map onto the closest scheme. */
export const LEGACY_THEME_TO_SCHEME: Record<string, string> = {
  krant: "blue",
  sepia: "amber",
  mint: "green",
  nacht: "dark",
};

function schemeVars(s: Scheme): Record<string, string> {
  return {
    ...(s.dark ? NEUTRAL_DARK : NEUTRAL_LIGHT),
    "--accent": s.accent,
    "--accent-deep": s.accentDeep,
    "--accent-tint": s.accentTint,
    "--bg": s.bg,
  };
}

function varsToCss(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("");
}

/**
 * The full scheme CSS: a `:root` default (Signaalblauw) plus one
 * `html[data-scheme="…"]` block per scheme. Injected once by layout.tsx.
 */
export function schemeCss(): string {
  const fallback = SCHEMES.find((s) => s.id === DEFAULT_SCHEME_ID) ?? SCHEMES[0];
  const blocks = SCHEMES.map((s) => `html[data-scheme="${s.id}"]{${varsToCss(schemeVars(s))}}`);
  return [`:root{${varsToCss(schemeVars(fallback))}}`, ...blocks].join("\n");
}

/**
 * Anti-flash bootstrap: applies the stored scheme before first paint.
 * Migrates a stored legacy 'mr_thema' choice; without any stored choice the
 * scheme follows the OS. Generated here so the known-ids and dark-ids lists
 * can never drift from SCHEMES.
 */
export function schemeBootstrapScript(): string {
  const ids = JSON.stringify(SCHEMES.map((s) => s.id));
  const darkIds = JSON.stringify(SCHEMES.filter((s) => s.dark).map((s) => s.id));
  const legacy = JSON.stringify(LEGACY_THEME_TO_SCHEME);
  return (
    `(function(){try{var I=${ids},D=${darkIds},M=${legacy};` +
    `var s=localStorage.getItem("mr_scheme");` +
    `if(!s){var t=localStorage.getItem("mr_thema");if(t&&M[t])s=M[t];}` +
    `if(!s||I.indexOf(s)<0){s=window.matchMedia("(prefers-color-scheme: dark)").matches?"${DEFAULT_DARK_SCHEME_ID}":"${DEFAULT_SCHEME_ID}";}` +
    `var h=document.documentElement;h.dataset.scheme=s;h.classList.toggle("dark",D.indexOf(s)>=0);` +
    `}catch(e){}})();`
  );
}

export function findScheme(id: string | null | undefined): Scheme | undefined {
  return SCHEMES.find((s) => s.id === id);
}
