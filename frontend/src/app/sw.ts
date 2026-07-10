import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, CacheFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // Disable navigationPreload so we control navigation caching ourselves
  navigationPreload: false,
  runtimeCaching: [
    // ── HTML pages: always fetch from network first ─────────────────────────
    // This is the KEY fix: prevents stale cached HTML causing hydration
    // mismatches when JS bundles are updated but old HTML is served from cache.
    {
      matcher: ({ request }: { request: Request }) =>
        request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "html-pages",
        networkTimeoutSeconds: 5,
        plugins: [],
      }),
    },
    // ── Next.js static assets (JS/CSS with content hash) ───────────────────
    // Safe to cache forever — filenames include a build hash and change on deploy
    {
      matcher: ({ url }: { url: URL }) =>
        url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "next-static-assets",
        plugins: [],
      }),
    },
    // ── API routes: always network, never cache ─────────────────────────────
    {
      matcher: ({ url }: { url: URL }) =>
        url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "api-responses",
        networkTimeoutSeconds: 10,
        plugins: [],
      }),
    },
    // ── Images and other public assets ─────────────────────────────────────
    {
      matcher: ({ request }: { request: Request }) =>
        request.destination === "image",
      handler: new CacheFirst({
        cacheName: "images",
        plugins: [],
      }),
    },
  ],
});

serwist.addEventListeners();

// ── Notify all tabs when a new SW version activates ────────────────────────
// The app listens for SW_UPDATED and reloads automatically,
// ensuring mobile users always run the latest JS bundles.
const sw = self as any;
sw.addEventListener("activate", () => {
  sw.clients
    .matchAll({ type: "window" })
    .then((clients: any[]) => {
      clients.forEach((client) => {
        client.postMessage({ type: "SW_UPDATED" });
      });
    });
});
