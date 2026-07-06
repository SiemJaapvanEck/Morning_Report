"use client";

// Scheme picker: a swatch button in the header that opens a panel with all
// color schemes (light + dark, from app/lib/schemes.ts). The choice lands in
// localStorage ('mr_scheme'); the anti-flash script in layout.tsx applies it
// on load. Replaces the old 4-theme dot row ('mr_thema' is migrated).

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_SCHEME_ID, SCHEMES, findScheme, type Scheme } from "@/app/lib/schemes";

export function pasSchemaToe(id: string) {
  const scheme = findScheme(id) ?? SCHEMES[0];
  const html = document.documentElement;
  html.dataset.scheme = scheme.id;
  html.classList.toggle("dark", scheme.dark);
  localStorage.setItem("mr_scheme", scheme.id);
  window.dispatchEvent(new Event("mr-schema"));
}

function abonneer(callback: () => void) {
  window.addEventListener("mr-schema", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("mr-schema", callback);
    window.removeEventListener("storage", callback);
  };
}

function huidigSchema(): string {
  return (
    document.documentElement.dataset.scheme ??
    localStorage.getItem("mr_scheme") ??
    DEFAULT_SCHEME_ID
  );
}

function SchemaRij({ scheme, actief, onKies }: { scheme: Scheme; actief: boolean; onKies: () => void }) {
  return (
    <button
      type="button"
      onClick={onKies}
      className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors ${
        actief
          ? "border-stone-900 dark:border-stone-100"
          : "border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
      }`}
    >
      <span
        className="relative h-6 w-6 shrink-0 rounded-md border border-black/10"
        style={{ backgroundColor: scheme.dark ? "#1c1c20" : "#ffffff" }}
      >
        <i
          className="absolute right-0.5 bottom-0.5 h-2.5 w-2.5 rounded-sm"
          style={{ backgroundColor: scheme.swatch }}
        />
      </span>
      <span className="font-medium">
        {scheme.name}
        {actief ? <span className="ml-1.5" style={{ color: scheme.swatch }}>✓</span> : null}
      </span>
    </button>
  );
}

export function ThemaKiezer() {
  // null during SSR/hydration: no active ring yet (avoids a mismatch)
  const actief = useSyncExternalStore(abonneer, huidigSchema, () => null);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const sluit = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", sluit);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", sluit);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const huidig = findScheme(actief) ?? SCHEMES[0];
  const groepen: { label: string; schemas: Scheme[] }[] = [
    { label: "Licht", schemas: SCHEMES.filter((s) => !s.dark) },
    { label: "Donker", schemas: SCHEMES.filter((s) => s.dark) },
  ];

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        title={`Kleurschema: ${huidig.name}`}
        aria-label="Kleurschema kiezen"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 transition-shadow hover:ring-2 hover:ring-stone-300/60 dark:border-stone-600"
        style={{ backgroundColor: actief ? huidig.swatch : undefined }}
      />
      {open ? (
        <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-3 shadow-xl dark:border-stone-700 dark:bg-stone-900">
          {groepen.map((groep) => (
            <div key={groep.label}>
              <p className="px-1 pt-2 pb-1.5 text-[10px] font-bold tracking-[0.16em] text-stone-400 uppercase first:pt-0">
                {groep.label}
              </p>
              <div className="flex flex-col gap-1.5">
                {groep.schemas.map((scheme) => (
                  <SchemaRij
                    key={scheme.id}
                    scheme={scheme}
                    actief={actief === scheme.id}
                    onKies={() => pasSchemaToe(scheme.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
