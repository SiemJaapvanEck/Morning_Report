// Voorpagina-dashboard (schets 2026-06-11, telefoon-eerst) in de vaste
// Dispatch-stijl (docs/design.md):
//   1. weer-hero — één dichte kaart: actueel weer links, editie-stats rechts
//   2. puntenrij van afgelopen edities (tik = die editie openen)
//   3. grote "Daily paper"-kaart → de volledige editie van vandaag
//   4. "Sol's selectie" — artikelkaarten (afbeelding, categorie, titel,
//      beschrijving, match-% en rating), gerangschikt op Sol's match-score.

import Link from "next/link";
import type { Edition, WeatherSnapshot } from "@/modules/shared/types";
import type { EditionView, SectionView } from "@/app/lib/queries";
import { ItemRating } from "./ItemRating";

type KaartItem = SectionView["items"][number] & { categorie: string };

/** Eén dichte hero-kaart: weer links, de cijfers van vandaag rechts. */
function WeerStatsHero({
  weather,
  view,
}: {
  weather: WeatherSnapshot | null;
  view: EditionView | null;
}) {
  const categorySections = view?.sections.filter((s) => s.section.kind === "category") ?? [];
  const artikelen = categorySections.reduce((n, s) => n + s.items.length, 0);

  const metrics: [string, string][] = weather
    ? [
        ["Min / max", `${weather.temp_min}° / ${weather.temp_max}°`],
        ["Neerslagkans", `${weather.neerslag_kans}%`],
        ["Wind", `${weather.wind_kmh} km/u`],
      ]
    : [];

  return (
    <section className="mr-card rounded-hero px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[15px] font-black tracking-tight">HET WEER</h2>
        <span className="mr-kicker text-muted">
          {weather ? weather.plaats : "geen gegevens"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-[1fr_auto] sm:gap-8">
        {/* actueel */}
        <div>
          {weather ? (
            <>
              <div className="flex items-baseline gap-4">
                <span className="text-6xl font-extrabold leading-[0.85] tracking-[-3px]">
                  {weather.temp_nu}°
                </span>
                <div>
                  <p className="text-base font-bold">{weather.omschrijving}</p>
                  <p className="mr-kicker mt-1 text-faint">
                    H {weather.temp_max}° · L {weather.temp_min}°
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-4 border-t pt-4">
                {metrics.map(([label, value]) => (
                  <div key={label}>
                    <p className="mr-kicker text-faint">{label}</p>
                    <p className="mt-1 text-[15px] font-bold">{value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-faint">
              Geen weergegevens in deze editie.
            </p>
          )}
        </div>

        {/* vandaag in cijfers */}
        <div className="border-t pt-4 sm:w-44 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
          <p className="mr-kicker text-faint">Vandaag</p>
          {view ? (
            <>
              <p className="mt-2 text-4xl font-extrabold leading-none tracking-tight">
                {artikelen}
              </p>
              <p className="mr-kicker mt-2 text-muted">
                artikelen · {categorySections.length} secties
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-faint">nog geen editie</p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Puntenrij van afgelopen edities; elk punt opent die dag z'n krant. */
function EditiePunten({ editions, today }: { editions: Edition[]; today: string }) {
  // oud → nieuw, zodat "vandaag" rechts eindigt zoals op de schets
  const reeks = [...editions].reverse().slice(-10);
  if (reeks.length === 0) return null;

  return (
    <div className="mt-4 flex items-center gap-1 px-2">
      {reeks.map((edition, i) => {
        const isVandaag = edition.date === today;
        const dag = new Date(edition.date + "T00:00:00").toLocaleDateString("nl-NL", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        return (
          <span key={edition.id} className="flex flex-1 items-center last:flex-none">
            {i > 0 && <span className="h-px flex-1 bg-line" />}
            <Link
              href={`/editie/${edition.date}`}
              title={dag}
              aria-label={`Editie van ${dag}`}
              className={
                isVandaag
                  ? "h-3.5 w-3.5 rounded-full border-[2.5px] border-red bg-red transition-transform hover:scale-125"
                  : "h-2.5 w-2.5 rounded-full border-2 border-blue bg-card transition-all hover:scale-125 hover:bg-blue"
              }
            />
          </span>
        );
      })}
    </div>
  );
}

/** De grote krant-kaart: tik om de volledige editie van vandaag te lezen. */
function DailyPaperKaart({ view, today }: { view: EditionView | null; today: string }) {
  const datum = new Date(today + "T00:00:00").toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const intro = view?.edition.front_page?.intro ?? null;

  if (!view) {
    return (
      <div className="mt-5 rounded-card border border-dashed bg-card p-6 text-center sm:p-8">
        <p className="mr-kicker text-faint">Daily paper</p>
        <h2 className="mt-2 text-xl font-extrabold capitalize tracking-tight">{datum}</h2>
        <p className="mt-2 text-sm text-muted">
          Nog geen editie — de pipeline draait &apos;s ochtends tussen 06:30 en 08:15.
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`/editie/${today}`}
      className="mr-card mr-lift group mt-5 block p-6 sm:p-8"
    >
      <div className="flex items-center gap-2">
        <span className="mr-tag font-bold text-blue">Daily paper</span>
        <span className="mr-tag text-red">Editie van vandaag</span>
      </div>
      <h2 className="mt-4 text-3xl font-extrabold capitalize leading-[1.05] tracking-[-0.9px] sm:text-4xl">
        {datum}
      </h2>
      {intro && (
        <p className="mt-3 line-clamp-3 text-[14.5px] leading-relaxed text-muted">
          {intro}
        </p>
      )}
      <p className="mr-kicker mt-5 inline-flex items-center gap-1.5 font-bold text-blue transition-[gap] group-hover:gap-2.5">
        Lees de krant <span aria-hidden>→</span>
      </p>
    </Link>
  );
}

/** Eén artikelkaart: afbeelding, categorie, titel, beschrijving, match-%, rating. */
function ArtikelKaart({ item }: { item: KaartItem }) {
  const matchPct = item.match_score != null ? Math.round(item.match_score * 100) : null;
  const beschrijving = item.summary_text ?? null;

  return (
    <div className="mr-card group flex flex-col overflow-hidden">
      <div className="mr-photo relative aspect-[16/10] overflow-hidden">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- externe feed-afbeeldingen, domeinen onbekend
          <img
            src={item.image_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="mr-kicker absolute inset-0 flex items-center justify-center text-faint">
            Foto
          </span>
        )}
        {matchPct != null && (
          <span
            title="Sol's inschatting hoe goed dit artikel bij je past"
            className="mr-kicker absolute right-2 top-2 rounded-tag border border-line bg-card/95 px-1.5 py-0.5 font-bold text-blue"
          >
            {matchPct}% match
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <p>
          <span className="mr-tag text-blue">{item.categorie}</span>
        </p>
        <h3 className="line-clamp-2 text-sm font-bold leading-snug tracking-tight">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" className="mr-headlink">
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h3>
        {beschrijving && (
          <p className="line-clamp-3 text-xs leading-relaxed text-muted">{beschrijving}</p>
        )}
        <div className="mt-auto pt-1.5">
          <ItemRating targetType="item" targetId={item.item_id} />
        </div>
      </div>
    </div>
  );
}

export function VoorpaginaDashboard({
  view,
  editions,
  today,
}: {
  view: EditionView | null;
  editions: Edition[];
  today: string;
}) {
  const weather =
    view?.sections.find((s) => s.section.kind === "weather")?.weather ?? null;

  // alle artikelen over de secties heen, gerangschikt op Sol's match-score
  const kaarten: KaartItem[] = (view?.sections ?? [])
    .filter((s) => s.section.kind === "category")
    .flatMap((s) => s.items.map((item) => ({ ...item, categorie: s.section.title })))
    .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    .slice(0, 12);

  return (
    <div>
      {/* Kopstrook: weer + stats + editie-punten */}
      <WeerStatsHero weather={weather} view={view} />
      <EditiePunten editions={editions} today={today} />

      {/* Daily paper */}
      <DailyPaperKaart view={view} today={today} />

      {/* Sol's selectie */}
      {kaarten.length > 0 && (
        <section className="mt-9">
          <div className="flex items-baseline gap-3">
            <h2 className="text-base font-extrabold tracking-tight">Sol&apos;s selectie</h2>
            <span className="flex-1" />
            <p className="mr-kicker text-faint">Gerangschikt op match</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
            {kaarten.map((item) => (
              <ArtikelKaart key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
