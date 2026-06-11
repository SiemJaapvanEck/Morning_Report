// Server-component die een volledige editie rendert in de vaste
// Dispatch-stijl (docs/design.md): masthead met datum en weerstrip,
// Sol's intro als commentary-kaart, daarna de secties met hun banden.

import type { EditionView } from "@/app/lib/queries";
import type { FrontPage, WeatherSnapshot } from "@/modules/shared/types";
import { ItemRating } from "./ItemRating";

function WeerStrip({ weather }: { weather: WeatherSnapshot }) {
  return (
    <div className="mr-card flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
      <span className="text-2xl font-extrabold tracking-tight">{weather.temp_nu}°</span>
      <span className="text-sm font-bold">{weather.omschrijving}</span>
      <span className="mr-kicker text-muted">
        {weather.temp_min}° / {weather.temp_max}° · {weather.neerslag_kans}% neerslag ·{" "}
        {weather.wind_kmh} km/u
      </span>
      <span className="mr-kicker ml-auto text-faint">{weather.plaats}</span>
    </div>
  );
}

function SolIntro({ intro }: { intro: string }) {
  return (
    <aside className="rounded-rail bg-blue-soft px-5 py-5 sm:px-6">
      <p className="mr-kicker font-bold text-blue">Sol · Daily paper</p>
      <p className="mt-3 text-[15px] leading-relaxed">
        <span className="mr-1 font-extrabold text-blue" aria-hidden>
          “
        </span>
        {intro}
      </p>
      <div className="mt-4 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue text-xs font-bold text-card">
          S
        </span>
        <span className="text-[13px] font-bold text-blue">Sol</span>
      </div>
    </aside>
  );
}

export function EditieWeergave({ view }: { view: EditionView }) {
  const frontPage = view.edition.front_page as FrontPage | null;
  const weatherSection = view.sections.find((s) => s.section.kind === "weather");
  const categorySections = view.sections.filter((s) => s.section.kind === "category");
  const artikelen = categorySections.reduce((n, s) => n + s.items.length, 0);

  const datum = new Date(view.edition.date + "T00:00:00").toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article>
      {/* Masthead */}
      <header className="border-b pb-7">
        <div className="flex items-center gap-2">
          <span className="mr-tag font-bold text-blue">Daily paper</span>
          <span className="mr-kicker text-faint">
            {artikelen} artikelen · {categorySections.length} secties
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold capitalize leading-[1.05] tracking-[-0.9px] sm:text-4xl">
          {datum}
        </h1>
        {weatherSection?.weather && (
          <div className="mt-5">
            <WeerStrip weather={weatherSection.weather} />
          </div>
        )}
        {frontPage?.intro && (
          <div className="mt-5">
            <SolIntro intro={frontPage.intro} />
          </div>
        )}
      </header>

      {/* Secties */}
      {categorySections.map(({ section, items }) => (
        <section key={section.id} className="border-b py-7 last:border-0">
          <h2 className="text-base font-extrabold tracking-tight">{section.title}</h2>
          <div className="mt-5 space-y-6">
            {items.map((item) => (
              <div key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <h3
                    className={
                      item.band === "deep"
                        ? "text-[17px] font-bold leading-snug tracking-tight"
                        : "text-[15px] font-bold leading-snug tracking-tight"
                    }
                  >
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer" className="mr-headlink">
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </h3>
                  <ItemRating targetType="item" targetId={item.item_id} />
                </div>
                {item.summary_text && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {item.summary_text}
                  </p>
                )}
                {item.sol_note && (
                  <div className="mt-2.5 rounded-rail bg-blue-soft px-3.5 py-2.5">
                    <p className="mr-kicker font-bold text-blue">● Sol</p>
                    <p className="mt-1 text-sm leading-relaxed">{item.sol_note}</p>
                  </div>
                )}
                {item.source_name && (
                  <p className="mr-kicker mt-2 text-faint">{item.source_name}</p>
                )}
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-faint">Vandaag niets nieuws in deze sectie.</p>
            )}
          </div>
        </section>
      ))}
    </article>
  );
}
