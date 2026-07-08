"use client";

import { useEffect } from "react";

/**
 * SwUpdateListener
 *
 * Listens for "SW_UPDATED" messages posted by the Service Worker when a new
 * version activates. On receiving the message it reloads the page so the
 * browser replaces any stale JS bundles with the fresh ones — eliminating
 * React hydration mismatches caused by cached old code on mobile devices.
 *
 * This component should be rendered once near the root of the app (e.g. in
 * the root layout). It renders nothing visible.
 */
export function SwUpdateListener() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        // Small delay so the SW finishes activating before we reload
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  return null;
}
