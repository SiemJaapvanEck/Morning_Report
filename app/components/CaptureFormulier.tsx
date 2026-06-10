"use client";

// Web-variant van de capture-invoer (zelfde endpoint als de iOS Shortcut).

import { useState } from "react";

export function CaptureFormulier() {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"onderwerp" | "bron" | "notitie">("onderwerp");
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "fout">("idle");

  async function verstuur(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setStatus("busy");
    const response = await fetch("/api/capture/web", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, kind }),
    });
    if (response.ok) {
      setText("");
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("fout");
    }
  }

  return (
    <form onSubmit={verstuur} className="flex flex-wrap gap-2">
      <select
        value={kind}
        onChange={(event) => setKind(event.target.value as typeof kind)}
        className="rounded-lg border border-stone-300 px-2 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
      >
        <option value="onderwerp">Onderwerp</option>
        <option value="bron">Bron (feed-URL)</option>
        <option value="notitie">Notitie voor Sol</option>
      </select>
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="bv. 'short-interest GameStop' of een feed-URL"
        className="min-w-48 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
      />
      <button
        type="submit"
        disabled={status === "busy" || !text.trim()}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900"
      >
        {status === "busy" ? "…" : status === "ok" ? "✓" : "Toevoegen"}
      </button>
      {status === "fout" && <span className="self-center text-sm text-rose-600">Mislukt, probeer opnieuw</span>}
    </form>
  );
}
