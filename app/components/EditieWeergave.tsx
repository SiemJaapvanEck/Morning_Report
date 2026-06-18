// Server-component die een volledige editie rendert: voorpagina (weer + de
// rode draad van de dag) gevolgd door de secties met hun banden.

import { Archivo, Space_Mono } from "next/font/google";
import type { EditionView } from "@/app/lib/queries";
import type { FrontPage, WeatherSnapshot } from "@/modules/shared/types";
import { ItemRating } from "./ItemRating";

const archivo = Archivo({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-archivo" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

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
    <article className={`${archivo.variable} ${spaceMono.variable}`}>
      {/* Voorpagina */}
      <header className="border-b border-stone-200 pb-6 dark:border-stone-800">
        <p className="text-sm capitalize text-stone-500">{datum}</p>
        {weatherSection?.weather && (
          <div className="mt-3">
            <WeerBlok weather={weatherSection.weather} />
          </div>
        )}
      </header>

      {/* De krant van vandaag: samenvatting → introductie → de verhaal-artikelen.
          Valt terug op de oude "rode draad"-prozablok voor edities van vóór de
          threads-laag (geen dp_articles). */}
      {frontPage?.dp_articles && frontPage.dp_articles.length > 0 ? (
        <section className="border-b border-stone-200 py-8 dark:border-stone-800">
          <p className="font-[family-name:var(--font-space-mono)] text-[11px] font-bold uppercase tracking-[0.18em] text-[#2f6df0]">
            De krant van vandaag
          </p>
          {frontPage.dp_summary && (
            <p className="mt-3 max-w-3xl text-pretty font-[family-name:var(--font-archivo)] text-[22px] font-extrabold leading-snug tracking-tight">
              {frontPage.dp_summary}
            </p>
          )}
          {frontPage.dp_intro && (
            <p className="mt-3 max-w-3xl leading-relaxed text-stone-600 dark:text-stone-300">
              {frontPage.dp_intro}
            </p>
          )}

          <div className="mt-8 space-y-10">
            {frontPage.dp_articles.map((a, i) => (
              <article key={a.thread_id ?? `general-${i}`} className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  {a.followed && (
                    <span className="rounded-full bg-[#2f6df0] px-2.5 py-0.5 font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-wide text-white">
                      Gevolgd
                    </span>
                  )}
                  {a.is_update && a.thread_id && (
                    <span className="rounded-full border border-[#2f6df0]/40 px-2.5 py-0.5 font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-wide text-[#2f6df0]">
                      Verhaallijn
                    </span>
                  )}
                  {a.destep_lenses.map((lens) => (
                    <span
                      key={lens}
                      className="rounded-full bg-stone-100 px-2.5 py-0.5 font-[family-name:var(--font-space-mono)] text-[10px] font-bold uppercase tracking-wide text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                    >
                      {lens}
                    </span>
                  ))}
                </div>
                <h3 className="mt-2 font-[family-name:var(--font-archivo)] text-[24px] font-extrabold leading-tight tracking-tight">
                  {a.headline}
                </h3>
                {a.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element -- externe feed-afbeeldingen, domeinen onbekend
                  <img
                    src={a.image_url}
                    alt=""
                    loading="lazy"
                    className="mt-3 aspect-[16/9] w-full rounded-2xl object-cover"
                  />
                )}
                <div className="mt-3 space-y-3 leading-relaxed text-stone-700 dark:text-stone-300">
                  {a.body.split(/\n\n+/).map((alinea, j) => (
                    <p key={j}>{alinea}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        frontPage?.daily_paper && (
          <section className="border-b border-stone-200 py-6 dark:border-stone-800">
            <h2 className="text-lg font-semibold tracking-tight">De rode draad</h2>
            <div className="mt-3 max-w-3xl space-y-3 leading-relaxed">
              {frontPage.daily_paper.split(/\n\n+/).map((alinea, i) => (
                <p key={i}>{alinea}</p>
              ))}
            </div>
          </section>
        )
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
