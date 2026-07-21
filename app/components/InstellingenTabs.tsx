"use client";

// Tabbed settings shell — Account · Financiën · Pipeline-rapport. Tab state is
// client-side only (no route change: /instellingen stays one route). The
// panels are handed in as ReactNode from the server-rendered page, so the
// shell itself stays a small, self-contained client island; later phases
// (MOR-16/17/18) fill in panel content without touching this file.
//
// A11y: WAI-ARIA "tabs" pattern — roving tabindex, Left/Right/Home/End move
// focus and activate (single-select, automatic activation). See
// docs/brandbook.md §4bis "Tab shell" for the visual recipe.

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type InstellingenTabId = "account" | "financien" | "pipeline";

const TABS: { id: InstellingenTabId; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "financien", label: "Financiën" },
  { id: "pipeline", label: "Pipeline-rapport" },
];

const MONO = "font-[family-name:var(--font-space-mono)]";

export function InstellingenTabs({
  account,
  financien,
  pipeline,
}: {
  account: ReactNode;
  financien: ReactNode;
  pipeline: ReactNode;
}) {
  const [active, setActive] = useState<InstellingenTabId>("account");
  const tabRefs = useRef<Partial<Record<InstellingenTabId, HTMLButtonElement>>>({});

  function activate(id: InstellingenTabId, focus = false) {
    setActive(id);
    if (focus) tabRefs.current[id]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, idx: number) {
    let nextIdx: number | null = null;
    if (e.key === "ArrowLeft") nextIdx = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === "ArrowRight") nextIdx = (idx + 1) % TABS.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = TABS.length - 1;
    if (nextIdx === null) return;
    e.preventDefault();
    activate(TABS[nextIdx].id, true);
  }

  const panels: Record<InstellingenTabId, ReactNode> = { account, financien, pipeline };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Instellingen"
        className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--paper)] p-1"
      >
        {TABS.map((tab, idx) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el ?? undefined;
              }}
              role="tab"
              type="button"
              id={`instellingen-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`instellingen-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => activate(tab.id)}
              onKeyDown={(e) => onKeyDown(e, idx)}
              className={`${MONO} rounded-full px-4 py-2 text-[12px] font-bold tracking-[.06em] whitespace-nowrap uppercase transition-colors ${
                selected
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`instellingen-panel-${tab.id}`}
            aria-labelledby={`instellingen-tab-${tab.id}`}
            hidden={tab.id !== active}
          >
            {tab.id === active ? panels[tab.id] : null}
          </div>
        ))}
      </div>
    </div>
  );
}
