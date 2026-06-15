// Server-component die een volledige editie rendert: voorpagina (Sol-intro,
// weer, top-items) gevolgd door de secties met hun banden.

import type { EditionView } from "@/app/lib/queries";
import type { FrontPage, WeatherSnapshot } from "@/modules/shared/types";
import { ItemRating } from "./ItemRating";

function WeerBlok({ weather }: { weather: WeatherSnapshot }) {
  return (
    <div className="flex items-baseline gap-4 rounded-xl bg-stone-100 px-4 py-3 text-sm dark:bg-stone-900">
      <span className="text-2xl font-semibold">{weather.temp_nu}°</span>
      <span>{weather.omschrijving}</span>
      <span className="text-stone-500">
        {weather.temp_min}° / {weather.temp_max}° · {weather.neerslag_kans}% neerslag ·{" "}
        {weather.wind_kmh} km/u
      </span>
      <span className="ml-auto text-stone-400">{weather.plaats}</span>
    </div>
  );
}

export function EditieWeergave({ view }: { view: EditionView }) {
  const frontPage = view.edition.front_page as FrontPage | null;
  const weatherSection = view.sections.find((s) => s.section.kind === "weather");
  const categorySections = view.sections.filter((s) => s.section.kind === "category");

  const datum = new Date(view.edition.date + "T00:00:00").toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article>
      {/* Voorpagina */}
      <header className="border-b border-stone-200 pb-6 dark:border-stone-800">
        <p className="text-sm capitalize text-stone-500">{datum}</p>
        {weatherSection?.weather && (
          <div className="mt-3">
            <WeerBlok weather={weatherSection.weather} />
          </div>
        )}
        {frontPage?.intro && (
          <div className="mt-5 max-w-3xl rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Sol</p>
            <p className="mt-2 leading-relaxed">{frontPage.intro}</p>
          </div>
        )}
      </header>

      {/* Daily Paper — Sol als hoofdredacteur + de beat-samenvattingen van de redactie */}
      {(frontPage?.daily_paper || (frontPage?.desks?.length ?? 0) > 0) && (
        <section className="border-b border-stone-200 py-6 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2f6df0] text-[10px] font-bold text-white">
              S
            </span>
            <h2 className="text-lg font-semibold tracking-tight">Daily Paper</h2>
          </div>
          {frontPage?.daily_paper && (
            <div className="mt-3 max-w-3xl space-y-3 leading-relaxed">
              {frontPage.daily_paper.split(/\n\n+/).map((alinea, i) => (
                <p key={i}>{alinea}</p>
              ))}
            </div>
          )}
          {(frontPage?.desks?.length ?? 0) > 0 && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {frontPage!.desks!.map((d) => (
                <div key={d.desk}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{d.naam}</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{d.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Secties */}
      {categorySections.map(({ section, items }) => (
        <section key={section.id} className="border-b border-stone-200 py-6 last:border-0 dark:border-stone-800">
          <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
          <div className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => (
              <div key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className={item.band === "deep" ? "font-semibold" : "font-medium"}>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline">
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </h3>
                  <ItemRating targetType="item" targetId={item.item_id} />
                </div>
                {item.summary_text && (
                  <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                    {item.summary_text}
                  </p>
                )}
                {item.sol_note && (
                  <p className="mt-2 border-l-2 border-amber-400 pl-3 text-sm italic text-stone-500">
                    🔔 {item.sol_note}
                  </p>
                )}
                {item.source_name && (
                  <p className="mt-1 text-xs text-stone-400">{item.source_name}</p>
                )}
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-stone-400">Vandaag niets nieuws in deze sectie.</p>
            )}
          </div>
        </section>
      ))}
    </article>
  );
}
