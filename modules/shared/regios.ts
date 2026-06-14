// Regio-buckets voor de "waar komt het nieuws vandaan"-kaart. Bewust grof
// (acht wereldregio's) — dat is robuust voor de scan-classificatie en sluit aan
// op de stippenkaart-geometrie. Eén bron van waarheid: zowel de scan-stap
// (modules/rank) als de UI (app/components/WereldKaart) gebruiken deze codes.

export const REGIO_CODES = ["na", "sa", "eu", "af", "me", "ru", "in", "ap"] as const;
export type RegioCode = (typeof REGIO_CODES)[number];

/** Sentinelwaarde die de scan teruggeeft als een item geen duidelijke plek heeft. */
export const REGIO_GEEN = "geen" as const;

export const REGIO_NAAM: Record<RegioCode, string> = {
  na: "Noord-Amerika",
  sa: "Zuid-Amerika",
  eu: "Europa",
  af: "Afrika",
  me: "Midden-Oosten",
  ru: "Oost-Europa & Rusland",
  in: "Zuid-Azië",
  ap: "Azië-Pacific",
};

export function isRegioCode(value: unknown): value is RegioCode {
  return typeof value === "string" && (REGIO_CODES as readonly string[]).includes(value);
}
