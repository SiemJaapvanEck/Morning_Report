// Eén editie-scherm: de kalenderbalk bovenaan + de inhoud eronder. In de
// dag-weergave is dat het Atlas-dashboard (in een SwipePager om te bladeren);
// in week/maand/jaar een overzichtsrooster. Gedeeld door de homepage (vandaag)
// en /editie/[datum]. Server-component.

import { EditionNav, type CalendarView } from "./EditionNav";
import { EditionView } from "./EditionView";
import { EditionOverview } from "./EditionOverview";
import { SwipePager } from "./SwipePager";
import type { EditionView as EditionViewData, EditionSummary, AgendaEvent } from "@/app/lib/queries";
import type { FinanceDashboardSnapshot } from "@/modules/finance";

/** searchParam → geldige kalenderweergave (default dag). */
export function parseView(v?: string): CalendarView {
  return v === "week" || v === "month" || v === "year" ? v : "day";
}

export function EditionScreen({
  date,
  today,
  view,
  profileName,
  selectedRegio,
  editionView,
  summaries,
  agenda = [],
  financeSnapshot = null,
}: {
  date: string;
  today: string;
  view: CalendarView;
  profileName?: string;
  selectedRegio?: string | null;
  editionView: EditionViewData | null;
  summaries: EditionSummary[];
  agenda?: AgendaEvent[];
  /** Only ever non-null when `date === today` — historical dates never fetch/render it. */
  financeSnapshot?: FinanceDashboardSnapshot | null;
}) {
  const isToday = date === today;
  return (
    <div>
      <EditionNav date={date} today={today} view={view} summaries={summaries} />
      {view === "day" ? (
        <SwipePager date={date} today={today} summaries={summaries}>
          <EditionView
            view={editionView}
            date={date}
            isToday={isToday}
            profileName={profileName}
            selectedRegio={selectedRegio}
            agenda={agenda}
            financeSnapshot={financeSnapshot}
          />
        </SwipePager>
      ) : (
        <EditionOverview view={view} date={date} today={today} summaries={summaries} />
      )}
    </div>
  );
}
