// Beursrendement per wereldregio op de stippenkaart: groen = winst, rood =
// verlies, intensiteit naar de grootte van de beweging. Regio's zonder data
// blijven neutraal grijs. Gevoed door front_page.markten (Yahoo-snapshot).

import type { MarktIndex } from "@/modules/shared/types";
import { COLS, ROWS, LAND, OCEAN } from "./wereldGrid";

const GAIN: [number, number, number] = [22, 163, 74]; // groen
const LOSS: [number, number, number] = [220, 38, 38]; // rood
const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

/** Gemiddeld dagrendement per regio (meerdere indices per regio → gemiddelde). */
export function regioGemiddelden(indices: MarktIndex[]): Record<string, number> {
  const som: Record<string, number> = {};
  const aantal: Record<string, number> = {};
  for (const ix of indices) {
    som[ix.regio] = (som[ix.regio] ?? 0) + ix.d;
    aantal[ix.regio] = (aantal[ix.regio] ?? 0) + 1;
  }
  const gem: Record<string, number> = {};
  for (const r of Object.keys(som)) gem[r] = som[r] / aantal[r];
  return gem;
}

export function MarktenKaart({ indices }: { indices: MarktIndex[] }) {
  const gem = regioGemiddelden(indices);
  // schaal op de grootste beweging, met een vloer van 0.5% zodat kleine dagen
  // niet meteen vol uitslaan
  const maxMag = Math.max(0.5, ...Object.values(gem).map((v) => Math.abs(v)));

  return (
    <svg
      viewBox={`0 0 ${COLS} ${ROWS}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full"
      role="img"
      aria-label="Kaart met beursrendement per wereldregio"
    >
      {OCEAN.map((d, i) => (
        <circle
          key={`o${i}`}
          cx={d.c + 0.5}
          cy={d.r + 0.5}
          r={0.13}
          className="[fill:rgba(11,11,13,0.05)] dark:[fill:rgba(255,255,255,0.06)]"
        />
      ))}
      {LAND.map((d, i) => {
        const v = gem[d.reg];
        if (v === undefined) {
          // regio zonder marktdata: neutrale stip
          return (
            <circle
              key={`l${i}`}
              cx={d.c + 0.5}
              cy={d.r + 0.5}
              r={0.34}
              className="[fill:rgba(120,120,130,0.18)] dark:[fill:rgba(160,160,170,0.18)]"
            />
          );
        }
        const mag = Math.min(1, Math.abs(v) / maxMag);
        const a = 0.18 + mag * 0.82;
        return <circle key={`l${i}`} cx={d.c + 0.5} cy={d.r + 0.5} r={0.37} fill={rgba(v >= 0 ? GAIN : LOSS, a)} />;
      })}
    </svg>
  );
}
