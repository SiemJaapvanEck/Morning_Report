"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistratie() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // registratie mag stil falen; de app werkt ook zonder
      });
    }
  }, []);
  return null;
}
