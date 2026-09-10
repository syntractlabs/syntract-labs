import express, { type NextFunction, type Request, type Response } from "express";
import { fileURLToPath } from "node:url";
import { dirname, extname, join } from "node:path";
import { readFileSync } from "node:fs";

// <api-imports>
import api_keys_get_0 from "./api/api-keys/GET";
import api_keys_post_1 from "./api/api-keys/POST";
import api_keys_id_delete_2 from "./api/api-keys/[id]/DELETE";
import auth_resend_verification_post_3 from "./api/auth/resend-verification/POST";
import auth_action_get_4 from "./api/auth/[action]/GET";
import auth_action_post_5 from "./api/auth/[action]/POST";
import auth_action_detail_get_6 from "./api/auth/[action]/[detail]/GET";
import auth_action_detail_post_7 from "./api/auth/[action]/[detail]/POST";
import builds_get_8 from "./api/builds/GET";
import builds_post_9 from "./api/builds/POST";
import builds_refine_post_10 from "./api/builds/refine/POST";
import builds_id_get_11 from "./api/builds/[id]/GET";
import contact_formName_post_12 from "./api/contact/[formName]/POST";
import dashboard_extract_post_13 from "./api/dashboard/extract/POST";
import enterprise_contact_post_14 from "./api/enterprise-contact/POST";
import health_get_15 from "./api/health/GET";
import native_builds_post_16 from "./api/native-builds/POST";
import native_builds_providers_get_17 from "./api/native-builds/providers/GET";
import native_builds_id_artifacts_get_18 from "./api/native-builds/[id]/artifacts/GET";
import native_builds_id_status_get_19 from "./api/native-builds/[id]/status/GET";
import og_get_20 from "./api/og/GET";
import preview_get_21 from "./api/preview/GET";
import preview_post_22 from "./api/preview/POST";
import preview_debug_get_23 from "./api/preview/debug/GET";
import preview_jobId_get_24 from "./api/preview/[jobId]/GET";
import preview_jobId_status_get_25 from "./api/preview/[jobId]/status/GET";
import stripe_create_checkout_session_post_26 from "./api/stripe/create-checkout-session/POST";
import stripe_session_sessionId_get_27 from "./api/stripe/session/[sessionId]/GET";
import users_get_28 from "./api/users/GET";
import users_me_bcu_get_29 from "./api/users/me/bcu/GET";
import users_id_role_patch_30 from "./api/users/[id]/role/PATCH";
import v1_extract_post_31 from "./api/v1/extract/POST";
// </api-imports>
import { seoRoutes } from "../lib/seo-routes";
import { isSystemHost } from "./seo-host";
import { migrateBuildJob } from "./db/migrate-build-job";
import { migrateUserRole } from "./db/migrate-user-role";
import { migrateAccountIssuer } from "./db/migrate-account-issuer";


// Run DB migrations at startup (idempotent)
migrateBuildJob().catch(err => console.error('startup.migrate.error', err));
migrateUserRole().catch(err => console.error('startup.migrate.user_role.error', err));
migrateAccountIssuer().catch(err => console.error('startup.migrate.account_issuer.error', err));

function normalizeCommerceApiBaseUrlEnv() {
	if (process.env.GODADDY_API_BASE_URL) return;
	const hostOnly = process.env.VITE_GODADDY_API_HOST;
	if (!hostOnly) return;
	const normalizedHost = hostOnly.replace(/^https?:\/\//, "").trim();
	if (!normalizedHost) return;
	process.env.GODADDY_API_BASE_URL = `https://${normalizedHost}`;
}

normalizeCommerceApiBaseUrlEnv();

const app = express();

// Honour x-forwarded-* from the load balancer so req.protocol/req.hostname
// reflect the public-facing values. Express-maintained parsing respects the
// existing trust-proxy config; direct header reads would let a client spoof
// the sitemap origin in robots.txt.
app.set("trust proxy", true);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// <api-registrations>
app.get("/api/api-keys", api_keys_get_0);
app.post("/api/api-keys", api_keys_post_1);
app.delete("/api/api-keys/:id", api_keys_id_delete_2);
app.post("/api/auth/resend-verification", auth_resend_verification_post_3);
app.get("/api/auth/:action", auth_action_get_4);
app.post("/api/auth/:action", auth_action_post_5);
app.get("/api/auth/:action/:detail", auth_action_detail_get_6);
app.post("/api/auth/:action/:detail", auth_action_detail_post_7);
app.get("/api/builds", builds_get_8);
app.post("/api/builds", builds_post_9);
app.post("/api/builds/refine", builds_refine_post_10);
app.get("/api/builds/:id", builds_id_get_11);
app.post("/api/contact/:formName", contact_formName_post_12);
app.post("/api/dashboard/extract", dashboard_extract_post_13);
app.post("/api/enterprise-contact", enterprise_contact_post_14);
app.get("/api/health", health_get_15);
app.post("/api/native-builds", native_builds_post_16);
app.get("/api/native-builds/providers", native_builds_providers_get_17);
app.get("/api/native-builds/:id/artifacts", native_builds_id_artifacts_get_18);
app.get("/api/native-builds/:id/status", native_builds_id_status_get_19);
app.get("/api/og", og_get_20);
app.get("/api/preview", preview_get_21);
app.post("/api/preview", preview_post_22);
app.get("/api/preview/debug", preview_debug_get_23);
app.get("/api/preview/:jobId", preview_jobId_get_24);
app.get("/api/preview/:jobId/status", preview_jobId_status_get_25);
app.post("/api/stripe/create-checkout-session", stripe_create_checkout_session_post_26);
app.get("/api/stripe/session/:sessionId", stripe_session_sessionId_get_27);
app.get("/api/users", users_get_28);
app.get("/api/users/me/bcu", users_me_bcu_get_29);
app.patch("/api/users/:id/role", users_id_role_patch_30);
app.post("/api/v1/extract", v1_extract_post_31);
// </api-registrations>


// Error middleware must be registered AFTER the routes it protects; Express
// only passes errors to middleware defined later in the stack.
app.use("/api", (err: unknown, req: Request, res: Response, _next: NextFunction) => {
	// Always respond JSON on /api so clients parsing response.json() don't
	// receive Express's default HTML error page for non-Error throws.
	console.error("ssr.api.error", {
		url: req.url,
		error: err instanceof Error ? err.stack : String(err),
	});
	res.status(500).json({ error: "Internal server error" });
});

function baseUrl(req: Request): string {
	const env = process.env.PUBLIC_URL || process.env.SITE_URL;
	if (env) return env.replace(/\/+$/, "");
	return `${req.protocol}://${req.hostname}`;
}

function escapeXml(s: string): string {
	return s.replace(/[&<>"']/g, (c) =>
		({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!,
	);
}

app.get("/robots.txt", (req, res) => {
  if (isSystemHost(req)) {
    res.type("text/plain").set("Cache-Control", "public, max-age=60, must-revalidate").set("Vary", "Host").send("User-agent: *\nDisallow: /\n");
    return;
  }
  const base = baseUrl(req);
  const body = ["User-agent: *", "Allow: /", "", `Sitemap: ${base}/sitemap.xml`, ""].join("\n");
  res.type("text/plain").set("Cache-Control", "public, max-age=60, must-revalidate").set("Vary", "Host").send(body);
});

app.get("/sitemap.xml", (req, res) => {
	const base = baseUrl(req);
	const urls = seoRoutes
		.filter((r) => typeof r.path === "string" && r.path.startsWith("/"))
		.map((r) => {
			const loc = `${base}${r.path}`;
			const parts = [`    <loc>${escapeXml(loc)}</loc>`];
			if (r.lastmod) parts.push(`    <lastmod>${escapeXml(r.lastmod)}</lastmod>`);
			if (r.changefreq) parts.push(`    <changefreq>${r.changefreq}</changefreq>`);
			if (r.priority !== undefined)
				parts.push(`    <priority>${r.priority.toFixed(1)}</priority>`);
			return `  <url>\n${parts.join("\n")}\n  </url>`;
		})
		.join("\n");
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
	res.type("application/xml").set("Cache-Control", "public, max-age=3600").send(body);
});

if (import.meta.env.PROD) {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const clientDir = join(__dirname, "client");

	app.use(
		express.static(clientDir, {
			index: false,
			setHeaders(res, filePath) {
				res.set(
					"Cache-Control",
					filePath.includes("/assets/")
						? "public, max-age=31536000, immutable"
						: "no-cache",
				);
			},
		}),
	);

	app.use((_req, res, next) => {
		res.set("Cache-Control", "no-cache");
		next();
	});

	let template: string;
	try {
		template = readFileSync(join(clientDir, "index.html"), "utf-8");
	} catch (err) {
		console.error("ssr.template.load-failed", {
			path: join(clientDir, "index.html"),
			error: err instanceof Error ? err.message : String(err),
		});
		process.exit(1);
	}
	if (!template.includes("<!--app-head-->") || !template.includes("<!--app-html-->")) {
		// Fail fast at boot, same as a template load failure above: without
		// markers, every .replace() call on the render path is a no-op and we
		// would serve a shell with no <head> content and no rendered body on
		// every request. Preferring process.exit over a degraded mode ensures
		// an operator notices and fixes the build rather than serving broken
		// SEO-invisible pages indefinitely.
		console.error("ssr.template.markers-missing", {
			hasHead: template.includes("<!--app-head-->"),
			hasHtml: template.includes("<!--app-html-->"),
		});
		process.exit(1);
	}
	const fallbackShell = template
		.replace("<!--app-head-->", "")
		.replace("<!--app-html-->", "");

	// Resolve the SSR module once into a stable render function. A failed
	// load is unrecoverable at runtime - exiting lets the container
	// scheduler restart with a clean slate rather than leaving the server
	// to serve silent 503s indefinitely against a single startup log.
	type RenderResult = {
		html: string;
		head: string;
		status: number;
		redirect?: string;
	};
	let renderFn: ((url: string) => Promise<RenderResult>) | null = null;
	const SSR_MODULE_LOAD_TIMEOUT_MS = 30_000;
	const loadTimeout = setTimeout(() => {
		if (renderFn !== null) return;
		console.error("ssr.module.load-timeout", {
			timeoutMs: SSR_MODULE_LOAD_TIMEOUT_MS,
		});
		process.exit(1);
	}, SSR_MODULE_LOAD_TIMEOUT_MS);
	loadTimeout.unref();
	import("../entry-server").then(
		(mod) => {
			clearTimeout(loadTimeout);
			renderFn = mod.render;
		},
		(err) => {
			clearTimeout(loadTimeout);
			console.error("ssr.module.load-failed", {
				error: err instanceof Error ? err.stack : String(err),
			});
			process.exit(1);
		},
	);

	app.get(/.*/, async (req, res, next) => {
		if (req.method !== "GET") return next();
		if (req.path.startsWith("/api")) return next();
		if (req.path.startsWith("/preview")) return next();
		if (extname(req.path)) return next();
		const sendFallback = () =>
			res
				.status(503)
				.set("Content-Type", "text/html; charset=utf-8")
				.set("Cache-Control", "no-store")
				.send(fallbackShell);
		if (renderFn === null) {
			// Module not yet resolved; fall back without logging to avoid startup
			// noise before the first render is even possible. A terminal load
			// failure (import reject or 30s timeout) process.exit(1)s from the
			// loader above, so this branch is only the brief warmup window.
			return sendFallback();
		}
		try {
			const result = await renderFn(req.url);
			if (result.redirect) {
				// Redirect thrown from a loader/action surfaces as a Response.
				// Forward it so the browser actually navigates to the new URL
				// instead of seeing an empty shell with a stale status.
				res.redirect(result.status, result.redirect);
				return;
			}
			if (!result.html) {
				// A non-redirect Response was thrown from a loader (e.g.
				// `throw new Response(null, { status: 404 })`). renderToString
				// produced no markup, so we have a real status but no body.
				// Log so the case is observable in ops dashboards, and mark
				// no-store so CDNs don't cache an empty page as a valid hit.
				// User-visible 404 / error pages should come from a route
				// errorElement, not from this fallback path.
				console.error("ssr.render.error-response", {
					url: req.url,
					status: result.status,
				});
				res
					.status(result.status)
					.set("Content-Type", "text/html; charset=utf-8")
					.set("Cache-Control", "no-store")
					.send(fallbackShell);
				return;
			}
			// Function replacements disable String.replace's $-special sequences
			// ($&, $', $`, $$) so user-authored titles / JSON-LD like
			// "Save $& today" insert literally instead of being interpolated.
			const out = template
				.replace("<!--app-head-->", () => result.head)
				.replace("<!--app-html-->", () => result.html);
			res
				.status(result.status)
				.set("Content-Type", "text/html; charset=utf-8")
				.set("Cache-Control", "no-cache")
				.send(out);
		} catch (err) {
			// 503 surfaces the failure in CDN/monitoring without caching a broken
			// page as success. console.error (not warn) puts it at the right log
			// level for the observability pipeline to alert on.
			console.error("ssr.render.failed", {
				url: req.url,
				// Log the full stack — React's renderToString annotates it with
				// the failing component's call tree, which the message alone
				// discards.
				error: err instanceof Error ? err.stack : String(err),
			});
			sendFallback();
		}
	});

	const shutdown = async (signal: string) => {
		console.log(`Got ${signal}, shutting down gracefully...`);
		// Scope the ERR_MODULE_NOT_FOUND suppression to the import() only.
		// A closeConnection() failure that happens to carry the same code
		// (unlikely but possible for wrapped errors) must not be silently
		// swallowed - it indicates a real db-close failure worth logging.
		let mod: { closeConnection?: () => Promise<void> | void } | null = null;
		try {
			const dbClient = "./db/client" + ".js";
			// Source-literal optional module path; no request, environment, or user input reaches import().
			// eslint-disable-next-line no-unsanitized/method
			mod = await import(/* @vite-ignore */ dbClient);
		} catch (error: unknown) {
			const code = (error as { code?: string } | null)?.code;
			if (code !== "ERR_MODULE_NOT_FOUND") {
				console.error("ssr.shutdown.db-import-failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		if (mod && typeof mod.closeConnection === "function") {
			try {
				await mod.closeConnection();
				console.log("Database connections closed");
			} catch (error: unknown) {
				console.error("ssr.shutdown.db-close-failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		process.exit(0);
	};

	(["SIGTERM", "SIGINT"] as const).forEach((signal) => {
		process.once(signal, () => {
			void shutdown(signal);
		});
	});

	const rawPort = process.env.PORT || "3000";
	const port = parseInt(rawPort, 10);
	if (!Number.isInteger(port) || port <= 0 || port > 65535) {
		// parseInt("abc") returns NaN; passing that to app.listen throws
		// synchronously before the server.on("error") handler below can catch
		// it. Fail fast with an actionable log rather than a cryptic crash.
		console.error("ssr.server.invalid-port", { rawPort });
		process.exit(1);
	}
	const host = process.env.HOST || "0.0.0.0";
	const server = app.listen(port, host, () => {
		console.log(`Server listening on http://${host}:${port}`);
	});
	server.on("error", (err: NodeJS.ErrnoException) => {
		console.error("ssr.server.listen-failed", {
			port,
			host,
			code: err.code,
			error: err.message,
		});
		process.exit(1);
	});
}

export default app;
