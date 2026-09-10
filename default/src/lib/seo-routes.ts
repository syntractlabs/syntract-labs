/**
 * Auto-synced registry of publicly-crawlable routes. Consumed by the
 * /sitemap.xml handler in src/server/entry.ts.
 *
 * DO NOT add or remove paths by hand. Static paths are mirrored here from
 * src/routes.tsx automatically whenever that file is edited (any manual
 * path edit would be overwritten on the next routes.tsx change). For sync
 * to pick up a route, its `path` must be a literal string starting with "/";
 * template literals and identifier refs are skipped, and dynamic-param routes
 * like "/products/:id" are excluded.
 *
 * The only fields safe to hand-edit are the per-entry metadata below, after a
 * sync:
 * - `priority` (0.0–1.0): Home = 1.0, main sections = 0.8, deep pages = 0.5.
 * - `changefreq` and `lastmod`.
 */

export interface SeoRoute {
  path: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
  lastmod?: string;
}

export const seoRoutes: SeoRoute[] = [
  { path: "/", changefreq: "weekly", priority: 1.0, lastmod: "2026-05-23" },
  { path: "/product", changefreq: "monthly", priority: 0.9, lastmod: "2026-05-23" },
  { path: "/pricing", changefreq: "weekly", priority: 0.9, lastmod: "2026-05-23" },
  { path: "/docs", changefreq: "weekly", priority: 0.8, lastmod: "2026-05-23" },
  { path: "/signup", changefreq: "monthly", priority: 0.7, lastmod: "2026-05-23" },
  { path: "/login", changefreq: "monthly", priority: 0.8 },
  { path: "/enterprise", changefreq: "monthly", priority: 0.8, lastmod: "2026-05-23" },
  { path: "/dashboard", changefreq: "monthly", priority: 0.8 },
  { path: "/settings", changefreq: "monthly", priority: 0.8 },
  { path: "/forgot-password", changefreq: "monthly", priority: 0.8 },
  { path: "/reset-password", changefreq: "monthly", priority: 0.8 },
  { path: "/terms", changefreq: "yearly", priority: 0.3, lastmod: "2026-05-23" },
  { path: "/privacy", changefreq: "yearly", priority: 0.3, lastmod: "2026-05-23" },
  { path: "/status", changefreq: "always", priority: 0.5, lastmod: "2026-05-23" },
  { path: "/tutorial", changefreq: "monthly", priority: 0.8 },
  { path: "/contact", changefreq: "monthly", priority: 0.8 },
  { path: "/verify-email", changefreq: "monthly", priority: 0.8 },
  { path: "/cart", changefreq: "monthly", priority: 0.8 },
  { path: "/checkout/success", changefreq: "monthly", priority: 0.5 },
  { path: "/checkout/cancel", changefreq: "monthly", priority: 0.5 },
  { path: "/security", changefreq: "monthly", priority: 0.8 },
];
