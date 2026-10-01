"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Register on localhost + production so offline PWA can be verified without a public deploy.
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
