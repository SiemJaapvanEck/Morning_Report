// Gedeelde stippen-wereldkaart-geometrie (uit het Atlas-ontwerp): de continenten
// als raster van stippen. Gebruikt door zowel de nieuws- als de markten-kaart.

import type { RegioCode } from "@/modules/shared/regios";

export const COLS = 46;
export const ROWS = 22;

// elke regio als een paar ellipsen op het raster (grof, maar herkenbaar)
const ELLIPSES: { r: RegioCode; cx: number; cy: number; rx: number; ry: number }[] = [
  { r: "na", cx: 12, cy: 6, rx: 7, ry: 5 },
  { r: "na", cx: 8, cy: 3, rx: 5, ry: 2.4 },
  { r: "na", cx: 13.5, cy: 11, rx: 2, ry: 2.6 },
  { r: "sa", cx: 16, cy: 13, rx: 3.4, ry: 3 },
  { r: "sa", cx: 15, cy: 17, rx: 2, ry: 3.2 },
  { r: "eu", cx: 23, cy: 5, rx: 3, ry: 2.4 },
  { r: "af", cx: 25, cy: 11, rx: 4, ry: 5 },
  { r: "me", cx: 28.5, cy: 8, rx: 2.4, ry: 2 },
  { r: "ru", cx: 34, cy: 4, rx: 9, ry: 3 },
  { r: "ru", cx: 41, cy: 5, rx: 3, ry: 2 },
  { r: "in", cx: 32, cy: 9, rx: 2.4, ry: 2.4 },
  { r: "ap", cx: 40, cy: 9.5, rx: 3, ry: 2.6 },
  { r: "ap", cx: 38, cy: 12.5, rx: 2, ry: 1.8 },
  { r: "ap", cx: 41.5, cy: 16, rx: 3, ry: 2 },
];

export const LAND: { c: number; r: number; reg: RegioCode }[] = [];
export const OCEAN: { c: number; r: number }[] = [];

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    let reg: RegioCode | null = null;
    for (const e of ELLIPSES) {
      const dx = (c - e.cx) / e.rx;
      const dy = (r - e.cy) / e.ry;
      if (dx * dx + dy * dy <= 1) {
        reg = e.r;
        break;
      }
    }
    if (reg) LAND.push({ c, r, reg });
    else OCEAN.push({ c, r });
  }
}
