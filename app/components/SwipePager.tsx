"use client";

// Bladeren tussen edities zoals door een kalender: veeg (touch), horizontaal
// scrollen (trackpad) of de pijltjestoetsen ←/→ springen naar de vorige/volgende
// dag mét editie. Wikkelt de dag-inhoud (een server-component, doorgegeven als
// children). Alleen actief in de dag-weergave.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { EditionSummary } from "@/app/lib/queries";

export function SwipePager({
  date,
  today,
  summaries,
  children,
}: {
  date: string;
  today: string;
  summaries: EditionSummary[];
  children: React.ReactNode;
}) {
  const router = useRouter();

  const sorted = [...summaries.map((s) => s.date)].sort();
  const prev = [...sorted].reverse().find((d) => d < date) ?? null;
  const next = sorted.find((d) => d > date) ?? null;
  const hrefFor = (d: string) => (d === today ? "/" : `/editie/${d}`);

  const goPrev = () => prev && router.push(hrefFor(prev), { scroll: false });
  const goNext = () => next && router.push(hrefFor(next), { scroll: false });

  // naburige edities vast vooruitladen voor een vloeiende overgang
  useEffect(() => {
    if (prev) router.prefetch(prev === today ? "/" : `/editie/${prev}`);
    if (next) router.prefetch(next === today ? "/" : `/editie/${next}`);
  }, [prev, next, today, router]);

  // pijltjestoetsen (behalve in invoervelden / met modifier)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prev, next]);

  // touch-veeg
  const touch = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }

  // horizontaal trackpad-scrollen (met cooldown; verticaal scrollen blijft intact)
  const lastWheel = useRef(0);
  function onWheel(e: React.WheelEvent) {
    if (Math.abs(e.deltaX) < 50 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const now = Date.now();
    if (now - lastWheel.current < 700) return;
    lastWheel.current = now;
    if (e.deltaX > 0) goNext();
    else goPrev();
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onWheel={onWheel}>
      {children}
    </div>
  );
}
