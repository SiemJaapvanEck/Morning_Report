"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistratie() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // In dev the SW only causes pain: it caches navigations, so after a chunk
      // rebuild it can serve stale HTML pointing at dead JS/CSS (blank, unstyled
      // pages). Actively unregister any leftover worker and drop its caches so
      // dev always loads fresh; only production keeps the PWA behavior.
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      if ("caches" in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registratie mag stil falen; de app werkt ook zonder
    });
  }, []);
  return null;
}
