// Placeholder panel for a settings tab whose real content mounts in a later
// phase (see docs/prd/settings-tabs.md — Financiën = MOR-17, Pipeline-rapport
// = MOR-16). This is an intentional "not built yet" state, not a
// missing-data state, so it renders unconditionally rather than being hidden.

const MONO = "font-[family-name:var(--font-space-mono)]";
const ARCH = "font-[family-name:var(--font-archivo)]";

export function InstellingenLeegState({
  titel,
  beschrijving,
  volgende,
}: {
  titel: string;
  beschrijving: string;
  volgende: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-6 py-12 text-center">
      <span
        className={`${MONO} text-[11px] font-bold tracking-[.14em] text-[var(--accent)] uppercase`}
      >
        Komt binnenkort
      </span>
      <h2 className={`${ARCH} mt-2 text-[19px] font-extrabold tracking-[-.01em] text-[var(--ink)]`}>
        {titel}
      </h2>
      <p className="mx-auto mt-2 max-w-[46ch] text-[14.5px] leading-[1.5] text-[var(--muted)]">
        {beschrijving}
      </p>
      <p className={`${MONO} mt-4 text-[11px] tracking-[.06em] text-[var(--faint)]`}>{volgende}</p>
    </div>
  );
}
