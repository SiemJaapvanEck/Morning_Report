// Voorpagina-dashboard (schets 2026-06-11, telefoon-eerst):
//   1. kopstrook — weer links, stats rechts, daaronder de puntenrij van
//      afgelopen edities (tik = die editie openen)
//   2. grote "Daily paper"-kaart → de volledige editie van vandaag
//   3. "Sol's selectie" — artikelkaarten (afbeelding, categorie, titel,
//      beschrijving, match-% en rating), gerangschikt op Sol's match-score.

import Link from "next/link";
import type { Edition, WeatherSnapshot } from "@/modules/shared/types";
import type { EditionView, SectionView } from "@/app/lib/queries";
import { ItemRating } from "./ItemRating";

type KaartItem = SectionView["items"][number] & { categorie: string };

function WeerBlok({ weather }: { weather: WeatherSnapshot | null }) {
  return (
    <div className="rounded-xl bg-stone-100 px-4 py-3 dark:bg-stone-900">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Weer</p>
      {weather ? (
        <>
          <p className="mt-1 text-2xl font-semibold leading-none">{weather.temp_nu}°</p>
          <p className="mt-1 truncate text-xs text-stone-500">
            {weather.omschrijving} · {weather.temp_min}°/{weather.temp_max}° ·{" "}
            {weather.neerslag_kans}% regen
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-stone-400">geen gegevens</p>
      )}
    </div>
  );
}

function StatsBlok({ view }: { view: EditionView | null }) {
  const categorySections = view?.sections.filter((s) => s.section.kind === "category") ?? [];
  const artikelen = categorySections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="rounded-xl bg-stone-100 px-4 py-3 dark:bg-stone-900">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Vandaag</p>
      {view ? (
        <>
          <p className="mt-1 text-2xl font-semibold leading-none">{artikelen}</p>
          <p className="mt-1 text-xs text-stone-500">
            artikelen · {categorySections.length} secties
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-stone-400">nog geen editie</p>
      )}
    </div>
  );
}

/** Puntenrij van afgelopen edities; elk punt opent die dag z'n krant. */
function EditiePunten({ editions, today }: { editions: Edition[]; today: string }) {
  // oud → nieuw, zodat "vandaag" rechts eindigt zoals op de schets
  const reeks = [...editions].reverse().slice(-10);
  if (reeks.length === 0) return null;

  return (
    <div className="mt-3 flex items-center gap-1 px-1">
      {reeks.map((edition, i) => {
        const isVandaag = edition.date === today;
        const dag = new Date(edition.date + "T00:00:00").toLocaleDateString("nl-NL", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        return (
          <span key={edition.id} className="flex flex-1 items-center last:flex-none">
            {i > 0 && <span className="h-px flex-1 bg-stone-300 dark:bg-stone-700" />}
            <Link
              href={`/editie/${edition.date}`}
              title={dag}
              aria-label={`Editie van ${dag}`}
              className={
                isVandaag
                  ? "h-3.5 w-3.5 rounded-full bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900"
                  : "h-2.5 w-2.5 rounded-full bg-stone-300 transition-colors hover:bg-amber-400 dark:bg-stone-700"
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
      <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center dark:border-stone-700 dark:bg-stone-900">
        <p className="text-sm capitalize text-stone-400">{datum}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Nog geen editie</h2>
        <p className="mt-2 text-sm text-stone-500">
          De pipeline draait &apos;s ochtends tussen 06:30 en 08:15.
        </p>
      </div>
    );
  }

  return (
    <Link
      href={`/editie/${today}`}
      className="group mt-4 block rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
    >
      <p className="text-xs font-medium uppercase tracking-widest text-amber-600">Daily paper</p>
      <h2 className="mt-1 font-serif text-2xl font-semibold capitalize tracking-tight">{datum}</h2>
      {intro && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{intro}</p>}
      <p className="mt-4 text-sm font-medium text-stone-500 transition-colors group-hover:text-stone-900 dark:group-hover:text-stone-100">
        Lees de krant →
      </p>
    </Link>
  );
}

/** Eén artikelkaart: afbeelding, categorie, titel, beschrijving, match-%, rating. */
function ArtikelKaart({ item }: { item: KaartItem }) {
  const matchPct = item.match_score != null ? Math.round(item.match_score * 100) : null;
  const beschrijving = item.summary_text ?? null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-stone-200 to-stone-300 dark:from-stone-800 dark:to-stone-700">
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element -- externe feed-afbeeldingen, domeinen onbekend
          <img
            src={item.image_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {matchPct != null && (
          <span
            title="Sol's inschatting hoe goed dit artikel bij je past"
            className="absolute right-2 top-2 rounded-full bg-stone-900/75 px-2 py-0.5 text-xs font-semibold text-white"
          >
            {matchPct}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-amber-600">
          {item.categorie}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {item.url ? (
            <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline">
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h3>
        {beschrijving && (
          <p className="line-clamp-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            {beschrijving}
          </p>
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
      <div className="grid grid-cols-2 gap-3">
        <WeerBlok weather={weather} />
        <StatsBlok view={view} />
      </div>
      <EditiePunten editions={editions} today={today} />

      {/* Daily paper */}
      <DailyPaperKaart view={view} today={today} />

      {/* Sol's selectie */}
      {kaarten.length > 0 && (
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Sol&apos;s selectie</h2>
            <p className="text-xs text-stone-400">gerangschikt op match</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
            {kaarten.map((item) => (
              <ArtikelKaart key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
