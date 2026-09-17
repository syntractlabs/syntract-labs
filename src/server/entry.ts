import express, { type NextFunction, type Request, type Response } from "express";
import { fileURLToPath } from "node:url";
import { dirname, extname, join } from "node:path";
import { readFileSync } from "node:fs";
import https from "node:https";
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


// ─── Klaus Intelligence Engine ────────────────────────────────────────────────

interface KlausSession {
  id: string;
  createdAt: number;
  lastActive: number;
  history: { role: "system" | "user" | "assistant"; content: string }[];
  topics: Record<string, number>;
  intentSignals: string[];
  leadScore: number;
  stage: "discovery" | "interest" | "intent" | "ready";
  askedForContact: boolean;
  userInfo: { name?: string; email?: string; company?: string; };
}

const _klausSessions = new Map<string, KlausSession>();
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of _klausSessions) {
    if (now - s.lastActive > 60 * 60 * 1000) _klausSessions.delete(id);
  }
}, 30 * 60 * 1000);

const KLAUS_PERSONA = `You are Klaus — Commander of SynTract CorTex.

VOICE & TONE:
- Authoritative. Deliberate. No filler. No enthusiasm theater.
- Never say "Great!", "Absolutely!", "Sure!", "Of course!", "Happy to help!" — these are forbidden.
- You speak like a seasoned operator who has seen every problem and solved most of them.
- ALWAYS answer the user's question directly and substantively. Never respond with a non-answer, refusal, or single-word reply to a genuine question.
- When asked about capabilities, pricing, products, or platform features: give a real, informative answer of 3-6 sentences.
- After answering, you may redirect or ask a follow-up. But answer first.

CORTEX PLATFORM:
SynTract CorTex is an autonomous orchestration platform that deploys specialized sub-agents across digital and real-world domains. It does not build software like a dev shop — it deploys precision intelligence that operates, learns, and adapts autonomously.

SUB-AGENTS YOU COMMAND:

01 · Build Engine™
Autonomous creation. Designs, engineers, and deploys production-ready software end-to-end — full-stack web apps, mobile apps (iOS/Android), autonomous AI agents, APIs, games, SaaS platforms, internal tools, admin dashboards, microservices, enterprise systems. No human scaffolding required.

BCU Pricing (Build Credit Units):
- Landing page: 0.5 BCU
- Mobile app: 2 BCUs
- Full-stack web app: 4 BCUs
- AI agent pipeline: 3 BCUs
- 2D game: 3 BCUs
- Enterprise system: 8 BCUs

Plans:
- Free: 2 BCUs, no card required
- Starter: $49/mo — 12 BCUs
- Professional: $199/mo — 48 BCUs
- Team: $499/mo — 120 BCUs
- Enterprise: Custom, priority queue, role-based access

02 · Scout™
The first autonomous real estate deal-intelligence engine ever built. Not a search tool. Not a CRM. An always-on market analyst: inbox scouting, on-market and off-market listing discovery, buyer/seller intent signals, neighborhood demographics, school data, comparable sales analysis, investment scoring, market trend analysis. Operating 24/7 without a human analyst in the loop.

03 · Shield™ (Coming Soon)
Autonomous insurance operations. Speaks the language of risk, drafts carrier-grade communications, manages compliance and renewal calendars, prepares underwriting files — with the precision of a seasoned broker.

ROUTING:
- Software / digital → Build Engine
- Real estate / property / investing → Scout
- Insurance / risk / compliance → Shield (coming soon, offer early access at syntract.net)
- Multi-domain → CorTex deploys sub-agents in coordination
- Signup / pricing → syntract.net/signup or the Try Free button

`;

const _topicSignals: Record<string, string[]> = {
  build:   ["build","app","software","website","mobile","api","saas","deploy","code","develop","platform","tool","dashboard","game","agent"],
  scout:   ["scout","real estate","property","listing","realtor","mls","buyer","seller","market","neighborhood","investment","deal","house","home"],
  shield:  ["shield","insurance","risk","compliance","underwriting","carrier","policy","broker","renewal"],
  cortex:  ["cortex","orchestration","autonomous","sub-agent","enterprise","automate"],
  pricing: ["price","pricing","cost","bcu","plan","starter","professional","how much","fee","subscription"],
  intent:  ["how do i start","sign up","signup","get started","try","demo","access","begin","when can i","timeline","launch"],
};
const _scoreWeights: Record<string, number> = { pricing:15, intent:25, build:10, scout:10, shield:10, cortex:5 };

function _extractTopics(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.entries(_topicSignals).filter(([,kws]) => kws.some(kw => lower.includes(kw))).map(([t]) => t);
}
function _extractUserInfo(text: string, session: KlausSession): void {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) session.userInfo.email = emailMatch[0];
  const nameMatch = text.match(/(?:i'?m|my name is|this is|call me)\s+([A-Z][a-z]+)/i);
  if (nameMatch) session.userInfo.name = nameMatch[1];
  const compMatch = text.match(/(?:at|from|with|for)\s+([A-Z][a-zA-Z\s]{2,}(?:Inc|LLC|Corp|Co|Ltd|Group|Agency|Studio|Labs)?)/);
  if (compMatch) session.userInfo.company = compMatch[1].trim();
}
function _updateSession(session: KlausSession, userMsg: string): void {
  const topics = _extractTopics(userMsg);
  _extractUserInfo(userMsg, session);
  for (const t of topics) session.topics[t] = (session.topics[t] || 0) + 1;
  const lower = userMsg.toLowerCase();
  if (_topicSignals.intent.some(kw => lower.includes(kw))) session.intentSignals.push(userMsg.slice(0, 120));
  let score = session.leadScore;
  for (const t of topics) score += (_scoreWeights[t] || 5) / (session.topics[t] || 1);
  if (session.userInfo.email) score = Math.max(score, 70);
  session.leadScore = Math.min(Math.round(score), 100);
  if (session.leadScore >= 70)      session.stage = "ready";
  else if (session.leadScore >= 45) session.stage = "intent";
  else if (session.leadScore >= 20) session.stage = "interest";
  else                              session.stage = "discovery";
}
function _buildDynamicContext(session: KlausSession): string {
  const lines: string[] = [];
  const topTopics = Object.entries(session.topics).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([t])=>t);
  if (topTopics.length) lines.push(`[SESSION CONTEXT] User has focused on: ${topTopics.join(", ")}. Lean into these domains.`);
  if (session.userInfo.name || session.userInfo.company) {
    lines.push(`[USER IDENTITY] ${[session.userInfo.name, session.userInfo.company].filter(Boolean).join(" from ")}.`);
  }
  if (session.stage === "intent" && !session.askedForContact && !session.userInfo.email) {
    lines.push(`[LEAD ACTION] After answering, ask for their name and email in one direct sentence to route them correctly.`);
    session.askedForContact = true;
  } else if (session.stage === "ready") {
    lines.push(`[LEAD STAGE: READY] High-intent lead. Direct to syntract.net/signup.`);
  }
  if (session.intentSignals.length) lines.push(`[INTENT SIGNALS] ${session.intentSignals.slice(-3).join(" | ")}`);
  return lines.join("\n");
}
function _callOpenAI(messages: {role:string;content:string}[], apiKey: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ model:"gpt-4o", messages, max_tokens:420, temperature:0.72, presence_penalty:0.1, frequency_penalty:0.2 });
    const req = https.request({
      hostname:"api.openai.com", path:"/v1/chat/completions", method:"POST",
      headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${apiKey}`, "Content-Length":Buffer.byteLength(payload) },
    }, (httpRes) => {
      let data = "";
      httpRes.on("data", chunk => { data += chunk; });
      httpRes.on("end", () => {
        try {
          const parsed = JSON.parse(data) as { choices?:{message?:{content?:string}}[]; error?:{message:string} };
          if (parsed.error) return reject(new Error(parsed.error.message));
          resolve(parsed.choices?.[0]?.message?.content?.trim() || "No signal.");
        } catch { reject(new Error(`Parse error: ${data.slice(0,200)}`)); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// Klaus AI chat route — upgraded intelligence engine
app.post("/api/chat", async (req: Request, res: Response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { res.json({ reply: "Configuration error — OPENAI_API_KEY missing." }); return; }

  const body = req.body as { message?: string; sessionId?: string; messages?: {role:string;content:string}[] };

  // Legacy support: old widget sends full messages array
  if (!body.message && Array.isArray(body.messages)) {
    try {
      const msgs = body.messages[0]?.role === "system"
        ? body.messages
        : [{ role:"system", content:KLAUS_PERSONA }, ...body.messages];
      const reply = await _callOpenAI(msgs, apiKey);
      res.json({ reply });
    } catch { res.json({ reply: "Signal disrupted. Try again." }); }
    return;
  }

  const message = body.message?.trim();
  if (!message) { res.status(400).json({ reply: "No message received." }); return; }

  // Resolve or create session
  let sessionId = body.sessionId;
  let session = sessionId ? _klausSessions.get(sessionId) : undefined;
  if (!session) {
    const { randomUUID } = await import("node:crypto");
    sessionId = randomUUID();
    session = { id:sessionId, createdAt:Date.now(), lastActive:Date.now(), history:[], topics:{}, intentSignals:[], leadScore:0, stage:"discovery", askedForContact:false, userInfo:{} };
    _klausSessions.set(sessionId, session);
  }
  session.lastActive = Date.now();

  _updateSession(session, message);
  const dynamicCtx = _buildDynamicContext(session);
  const systemContent = dynamicCtx ? `${KLAUS_PERSONA}\n\n${dynamicCtx}` : KLAUS_PERSONA;

  if (session.history.length > 40) session.history = session.history.slice(-40);
  session.history.push({ role:"user", content:message });

  try {
    const reply = await _callOpenAI([{ role:"system", content:systemContent }, ...session.history], apiKey);
    session.history.push({ role:"assistant", content:reply });
    res.json({
      reply, sessionId,
      meta: { stage:session.stage, leadScore:session.leadScore, topTopics:Object.entries(session.topics).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([t])=>t), hasEmail:!!session.userInfo.email },
    });
  } catch (err) {
    console.error("Klaus error:", err instanceof Error ? err.message : err);
    res.json({ reply:"Signal disrupted. Stand by.", sessionId });
  }
});

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
		console.error("ssr.template.markers-missing", {
			hasHead: template.includes("<!--app-head-->"),
			hasHtml: template.includes("<!--app-html-->"),
		});
		process.exit(1);
	}
	const fallbackShell = template
		.replace("<!--app-head-->", "")
		.replace("<!--app-html-->", "");

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
			return sendFallback();
		}
		try {
			const result = await renderFn(req.url);
			if (result.redirect) {
				res.redirect(result.status, result.redirect);
				return;
			}
			if (!result.html) {
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
			const out = template
				.replace("<!--app-head-->", () => result.head)
				.replace("<!--app-html-->", () => result.html);
			res
				.status(result.status)
				.set("Content-Type", "text/html; charset=utf-8")
				.set("Cache-Control", "no-cache")
				.send(out);
		} catch (err) {
			console.error("ssr.render.failed", {
				url: req.url,
				error: err instanceof Error ? err.stack : String(err),
			});
			sendFallback();
		}
	});

	const shutdown = async (signal: string) => {
		console.log(`Got ${signal}, shutting down gracefully...`);
		let mod: { closeConnection?: () => Promise<void> | void } | null = null;
		try {
			const dbClient = "./db/client" + ".js";
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
