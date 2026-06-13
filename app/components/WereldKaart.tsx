// Stippen-wereldkaart die toont waar het nieuws van vandaag vandaan komt.
// De continenten zijn een raster van stippen (geometrie uit het Atlas-ontwerp,
// Morning Report design/atlas-daily.jsx); de intensiteit per regio komt nu uit
// échte data: het aantal items per wereldregio (front_page.regios).

import { REGIO_CODES, type RegioCode } from "@/modules/shared/regios";
import { COLS, ROWS, LAND, OCEAN } from "./wereldGrid";

const ACCENT: [number, number, number] = [47, 109, 240]; // #2f6df0
const rgba = (a: number) => `rgba(${ACCENT[0]}, ${ACCENT[1]}, ${ACCENT[2]}, ${a})`;

/** Samenvatting voor kop/legenda: heetste regio, totaal, aantal regio's met nieuws. */
export function regioStats(counts: Record<string, number>) {
  let topCode: RegioCode = REGIO_CODES[0];
  let totaal = 0;
  let actief = 0;
  for (const code of REGIO_CODES) {
    const n = counts[code] ?? 0;
    totaal += n;
    if (n > 0) actief++;
    if (n > (counts[topCode] ?? 0)) topCode = code;
  }
  return { topCode, totaal, actief, topAantal: counts[topCode] ?? 0 };
}

export function WereldKaart({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(1, ...REGIO_CODES.map((c) => counts[c] ?? 0));
  const { topCode, topAantal } = regioStats(counts);

  return (
    <svg
      viewBox={`0 0 ${COLS} ${ROWS}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full"
      role="img"
      aria-label="Kaart met het aantal nieuwsitems per wereldregio"
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
        const norm = (counts[d.reg] ?? 0) / max;
        const a = Math.min(1, 0.16 + norm * 0.84);
        const isTop = d.reg === topCode && topAantal > 0;
        return <circle key={`l${i}`} cx={d.c + 0.5} cy={d.r + 0.5} r={isTop ? 0.42 : 0.36} fill={rgba(a)} />;
      })}
    </svg>
  );
}
