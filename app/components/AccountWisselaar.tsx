"use client";

// Account-wisselaar in de header: laat je zonder login tussen profielen wisselen
// (zet hetzelfde mr_profile-cookie als de ProfielKiezer, via /api/profiel).

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  profiles: { id: string; name: string }[];
  currentId: string | null;
}

export function AccountWisselaar({ profiles, currentId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = profiles.find((p) => p.id === currentId);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function wissel(id: string) {
    if (id === currentId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    await fetch("/api/profiel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: id }),
    });
    setOpen(false);
    setBusy(false);
    router.refresh();
  }

  if (profiles.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-stone-200 px-2.5 py-1 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-700 dark:hover:bg-stone-900"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2f6df0] text-[10px] font-bold text-white">
          {(current?.name ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-[8rem] truncate text-stone-700 dark:text-stone-200">
          {current?.name ?? "Kies account"}
        </span>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-48 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Wissel account
          </p>
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitem"
              onClick={() => wissel(p.id)}
              disabled={busy}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-stone-100 disabled:opacity-50 dark:hover:bg-stone-800"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2f6df0] text-[10px] font-bold text-white">
                {p.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1 truncate text-stone-700 dark:text-stone-200">{p.name}</span>
              {p.id === currentId && <span className="text-[#2f6df0]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
