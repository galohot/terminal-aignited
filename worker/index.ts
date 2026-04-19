import { neon } from "@neondatabase/serverless";
import { runAgent } from "./agent";
import {
	createThread as agentCreateThread,
	deleteThread as agentDeleteThread,
	getPersona as agentGetPersona,
	getThread as agentGetThread,
	toLlmHistory as agentHistoryToLlm,
	listPersonas as agentListPersonas,
	listThreads as agentListThreads,
	updateThread as agentUpdateThread,
} from "./agent-threads";
import { autoPublishStaleDrafts, generateAmBrief } from "./am-brief";
import {
	generateRotatingDeepDive,
	generateWeeklyEarningsPreviews,
} from "./content-rotation";
import { generateDeepDive } from "./deep-dive";
import { generateEarningsPreview } from "./earnings-preview";
import {
	clearSessionCookie,
	parseCookie,
	randomState,
	setSessionCookie,
	setStateCookie,
	signJwt,
	verifyJwt,
} from "./auth";
import { createCheckout, handleWebhook, TIERS, type Tier } from "./billing";
import {
	type CreateInput as JournalCreate,
	type JournalKind,
	type UpdateInput as JournalUpdate,
	createEntry as journalCreate,
	deleteEntry as journalDelete,
	listEntries as journalList,
	updateEntry as journalUpdate,
} from "./journal";
import {
	type ArticleInput,
	type ArticleType,
	getArticleBySlug,
	getSubscription,
	listArticles,
	listDrafts,
	markRead,
	publishArticle,
	upsertArticle,
	upsertSubscription,
} from "./research";
import type { ToolCtx } from "./tools";
import { authenticateWithCode, buildAuthorizeUrl, displayName, type WorkOSUser } from "./workos";

interface Env {
	ASSETS: Fetcher;
	API_BASE_URL: string;
	API_KEY: string;
	TERMINAL_API_KEY?: string;
	WORKER_AUTH_SECRET?: string;
	DATABASE_URL: string; // analytics Neon DB (sessions, page_views)
	AUTH_DATABASE_URL: string; // auth/billing Neon DB (terminal_users, terminal_subscriptions)
	WORKOS_CLIENT_ID: string;
	WORKOS_API_KEY: string;
	JWT_SIGNING_SECRET: string;
	AUTH_REDIRECT_URI: string;
	MINIMAX_API_KEY?: string;
	KIMI_API_KEY?: string;
	OPENROUTER_API_KEY?: string;
	MAYAR_API_KEY?: string;
	MAYAR_WEBHOOK_TOKEN?: string;
	RESEND_API_KEY?: string;
	TELEGRAM_NEWSLETTER_BOT_TOKEN?: string;
	TELEGRAM_NEWSLETTER_CHAT_ID?: string;
}

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

function corsResponse() {
	return new Response(null, { headers: CORS_HEADERS });
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
	const headers = new Headers(init.headers);
	headers.set("Content-Type", "application/json");
	headers.set("Access-Control-Allow-Origin", "*");
	return new Response(JSON.stringify(body), { ...init, headers });
}

// --- API Proxy: /api/proxy/* -> backend /api/v1/* ---
// Paper endpoints (/paper/*) require an authenticated user and inject X-User-Id.
// GET responses that match CACHE_RULES are cached at the CF edge (caches.default) and
// coalesced in-isolate via INFLIGHT so concurrent identical requests hit origin once.

interface CacheRule {
	pattern: RegExp;
	ttl: number;
}

// Subpath (no query) → TTL seconds. First match wins; order specific-before-generic.
const CACHE_RULES: CacheRule[] = [
	{ pattern: /^quotes\/batch$/, ttl: 10 },
	{ pattern: /^quotes\//, ttl: 10 },
	{ pattern: /^markets$/, ttl: 15 },
	{ pattern: /^dashboard$/, ttl: 30 },
	{ pattern: /^idx\/heatmap$/, ttl: 30 },
	{ pattern: /^idx\/top-movers$/, ttl: 30 },
	{ pattern: /^idx\/screener/, ttl: 30 },
	{ pattern: /^idx\/market-breadth$/, ttl: 30 },
	{ pattern: /^idx\/sectors/, ttl: 60 },
	{ pattern: /^idx\/indices/, ttl: 60 },
	{ pattern: /^idx\/broker-flow/, ttl: 30 },
	{ pattern: /^idx\/foreign-flow\//, ttl: 30 },
	{ pattern: /^idx\/broker-summary\//, ttl: 30 },
	{ pattern: /^idx\/disclosures/, ttl: 60 },
	{ pattern: /^idx\/companies/, ttl: 120 },
	{ pattern: /^idx\/brokers$/, ttl: 300 },
	{ pattern: /^idx\/insiders\//, ttl: 300 },
	{ pattern: /^idx\/entity-groups/, ttl: 300 },
	{ pattern: /^idx\/financials\//, ttl: 300 },
	{ pattern: /^idx\/ksei\//, ttl: 300 },
	{ pattern: /^history\//, ttl: 60 },
	{ pattern: /^fundamentals\//, ttl: 600 },
	{ pattern: /^news/, ttl: 60 },
	{ pattern: /^search$/, ttl: 60 },
	{ pattern: /^macro\/overview$/, ttl: 300 },
	{ pattern: /^consensus/, ttl: 60 },
];

function matchCacheTTL(subpath: string): number | null {
	for (const rule of CACHE_RULES) {
		if (rule.pattern.test(subpath)) return rule.ttl;
	}
	return null;
}

// Per-isolate singleflight map. Coalesces concurrent identical GETs into one origin call.
// Short-lived (Worker isolates recycle) but free and effective during traffic bursts.
const INFLIGHT = new Map<string, Promise<Response>>();

async function handleProxy(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
	subpath: string,
): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();

	const isPaper = subpath.startsWith("paper/");
	let userId: string | null = null;
	if (isPaper) {
		const session = await getSession(request, env);
		if (!session) return jsonResponse({ error: "AUTH_REQUIRED" }, { status: 401 });
		userId = session.userId;
	}

	const backendPath = `/api/v1/${subpath}`;
	const url = new URL(backendPath, env.API_BASE_URL);
	const reqUrl = new URL(request.url);
	reqUrl.searchParams.forEach((value, key) => {
		url.searchParams.set(key, value);
	});

	const hasBody = request.method !== "GET" && request.method !== "HEAD";
	const upstreamHeaders: Record<string, string> = {
		"X-API-Key": env.TERMINAL_API_KEY || env.API_KEY,
		"Content-Type": "application/json",
	};
	if (env.WORKER_AUTH_SECRET) {
		upstreamHeaders["X-Worker-Auth"] = env.WORKER_AUTH_SECRET;
	}
	if (userId) upstreamHeaders["X-User-Id"] = userId;

	// Only GET, non-paper, cache-ruled requests use the edge cache path.
	const cacheTtl = !isPaper && request.method === "GET" ? matchCacheTTL(subpath) : null;

	if (cacheTtl === null) {
		// Pass-through (paper, mutations, or uncached GETs)
		const response = await fetch(url.toString(), {
			method: request.method,
			headers: upstreamHeaders,
			body: hasBody ? request.body : undefined,
		});
		const outHeaders = new Headers(response.headers);
		outHeaders.set("Access-Control-Allow-Origin", "*");
		outHeaders.set("Cache-Control", isPaper ? "no-store" : "public, max-age=10");
		outHeaders.set("X-Edge-Cache", "BYPASS");
		return new Response(response.body, { status: response.status, headers: outHeaders });
	}

	// Edge cache path.
	const cache = caches.default;
	const cacheKey = new Request(url.toString(), { method: "GET" });
	const inflightKey = url.toString();

	const cached = await cache.match(cacheKey);
	if (cached) {
		const h = new Headers(cached.headers);
		h.set("Access-Control-Allow-Origin", "*");
		h.set("X-Edge-Cache", "HIT");
		return new Response(cached.body, { status: cached.status, headers: h });
	}

	// Coalesce concurrent misses within this isolate.
	let pending = INFLIGHT.get(inflightKey);
	let coalesced = false;
	if (pending) {
		coalesced = true;
	} else {
		pending = (async () => {
			const response = await fetch(url.toString(), {
				method: "GET",
				headers: upstreamHeaders,
			});
			if (!response.ok) return response; // don't cache 4xx/5xx
			// Buffer body so we can both cache and return it.
			const buf = await response.arrayBuffer();
			const respHeaders = new Headers(response.headers);
			respHeaders.set("Cache-Control", `public, max-age=${cacheTtl}`);
			const toCache = new Response(buf, { status: response.status, headers: respHeaders });
			ctx.waitUntil(cache.put(cacheKey, toCache.clone()));
			return toCache;
		})();
		INFLIGHT.set(inflightKey, pending);
		pending.finally(() => INFLIGHT.delete(inflightKey));
	}

	const originResponse = await pending;
	const outHeaders = new Headers(originResponse.headers);
	outHeaders.set("Access-Control-Allow-Origin", "*");
	outHeaders.set("X-Edge-Cache", coalesced ? "COALESCED" : "MISS");
	// Clone body — multiple coalesced callers read from the same buffered Response.
	return new Response(originResponse.clone().body, {
		status: originResponse.status,
		headers: outHeaders,
	});
}

// --- Auth session helpers ---

interface Session {
	userId: string;
	email: string;
}

async function getSession(request: Request, env: Env): Promise<Session | null> {
	const token = parseCookie(request, "tai_session");
	if (!token) return null;
	const payload = await verifyJwt(token, env.JWT_SIGNING_SECRET);
	if (!payload) return null;
	return { userId: payload.sub, email: payload.email };
}

// Founders / staff with unconditional institutional access. Checked by email
// so grant survives DB resets and doesn't need a subscription row.
const FOUNDER_EMAILS = new Set<string>([
	"irwndedi@gmail.com",
	"rivsyah@gmail.com",
	"biroumumkemlu@gmail.com", // Dedi's signed-in email on this host
]);

async function getActiveSubscription(
	env: Env,
	userId: string,
	email: string,
): Promise<{ tier: string; status: string; expires_at: string | null } | null> {
	if (FOUNDER_EMAILS.has(email.toLowerCase())) {
		return { tier: "institutional", status: "active", expires_at: null };
	}
	const sql = neon(env.AUTH_DATABASE_URL);
	const rows = (await sql`
		SELECT tier, status, expires_at
		FROM terminal_subscriptions
		WHERE user_id = ${userId}
		  AND status = 'active'
		  AND (expires_at IS NULL OR expires_at > now())
		ORDER BY expires_at DESC NULLS LAST
		LIMIT 1
	`) as { tier: string; status: string; expires_at: string | null }[];
	return rows[0] ?? null;
}

// --- Auth routes ---

async function handleAuthLogin(env: Env): Promise<Response> {
	const state = randomState();
	const authorizeUrl = buildAuthorizeUrl({
		clientId: env.WORKOS_CLIENT_ID,
		redirectUri: env.AUTH_REDIRECT_URI,
		state,
	});
	return new Response(null, {
		status: 302,
		headers: {
			Location: authorizeUrl,
			"Set-Cookie": setStateCookie(state),
		},
	});
}

async function handleAuthCallback(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const stateCookie = parseCookie(request, "tai_oauth_state");
	if (!code || !state || state !== stateCookie) {
		return new Response("Invalid OAuth state", { status: 400 });
	}

	let user: WorkOSUser;
	try {
		user = await authenticateWithCode({
			clientId: env.WORKOS_CLIENT_ID,
			apiKey: env.WORKOS_API_KEY,
			code,
		});
	} catch (e) {
		return new Response(`OAuth exchange failed: ${String(e)}`, { status: 502 });
	}

	const sql = neon(env.AUTH_DATABASE_URL);
	const name = displayName(user);
	await sql`
		INSERT INTO terminal_users (id, email, name, picture)
		VALUES (${user.id}, ${user.email}, ${name}, ${user.profile_picture_url ?? null})
		ON CONFLICT (id) DO UPDATE SET
			email = EXCLUDED.email,
			name = EXCLUDED.name,
			picture = EXCLUDED.picture,
			updated_at = now()
	`;

	const jwt = await signJwt({ sub: user.id, email: user.email }, env.JWT_SIGNING_SECRET);

	const headers = new Headers();
	headers.append("Set-Cookie", setSessionCookie(jwt, 604800));
	headers.append("Set-Cookie", "tai_oauth_state=; Path=/; Max-Age=0");
	headers.set("Location", "/");
	return new Response(null, { status: 302, headers });
}

async function handleAuthMe(request: Request, env: Env): Promise<Response> {
	const session = await getSession(request, env);
	if (!session) return jsonResponse({ authenticated: false });

	const sql = neon(env.AUTH_DATABASE_URL);
	const userRows = (await sql`
		SELECT id, email, name, picture FROM terminal_users WHERE id = ${session.userId}
	`) as { id: string; email: string; name: string | null; picture: string | null }[];
	if (!userRows[0]) return jsonResponse({ authenticated: false });

	const sub = await getActiveSubscription(env, session.userId, session.email);
	return jsonResponse({
		authenticated: true,
		user: userRows[0],
		subscription: sub,
	});
}

async function handleAuthLogout(): Promise<Response> {
	return new Response(null, {
		status: 204,
		headers: {
			"Set-Cookie": clearSessionCookie(),
			"Access-Control-Allow-Origin": "*",
		},
	});
}

// --- Agent ---

interface AgentChatBody {
	message: string;
	history?: Array<{ role: "user" | "assistant"; content: unknown }>;
	thread_id?: string;
}

const TIER_RANK: Record<string, number> = { starter: 1, pro: 2, institutional: 3 };

function tierAtLeast(tier: string | null | undefined, min: "pro" | "institutional"): boolean {
	if (!tier) return false;
	return (TIER_RANK[tier] ?? 0) >= TIER_RANK[min];
}

async function handleAgentChat(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();
	if (request.method !== "POST") {
		return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
	}

	const session = await getSession(request, env);
	if (!session) return jsonResponse({ error: "AUTH_REQUIRED" }, { status: 401 });

	let body: AgentChatBody;
	try {
		body = (await request.json()) as AgentChatBody;
	} catch {
		return jsonResponse({ error: "INVALID_JSON" }, { status: 400 });
	}
	if (!body.message || typeof body.message !== "string") {
		return jsonResponse({ error: "MESSAGE_REQUIRED" }, { status: 400 });
	}

	const sub = await getActiveSubscription(env, session.userId, session.email);
	const tier = (sub?.tier ?? null) as ToolCtx["tier"];

	const ctx: ToolCtx = {
		userId: session.userId,
		tier,
		apiBase: env.API_BASE_URL.endsWith("/api/v1")
			? env.API_BASE_URL
			: `${env.API_BASE_URL.replace(/\/$/, "")}/api/v1`,
		apiKey: env.TERMINAL_API_KEY || env.API_KEY,
		authDbUrl: env.AUTH_DATABASE_URL,
	};

	const llmEnv = {
		MINIMAX_API_KEY: env.MINIMAX_API_KEY,
		KIMI_API_KEY: env.KIMI_API_KEY,
		OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
	};

	// Threaded path — persist + load history + apply persona system prompt.
	if (body.thread_id) {
		if (!tierAtLeast(tier, "pro")) {
			return jsonResponse({ error: "UPGRADE_REQUIRED", required: "pro" }, { status: 403 });
		}
		const existing = await agentGetThread(env.AUTH_DATABASE_URL, session.userId, body.thread_id);
		if (!existing) return jsonResponse({ error: "THREAD_NOT_FOUND" }, { status: 404 });
		const history = agentHistoryToLlm(existing.messages);
		let systemPrompt: string | undefined;
		if (existing.thread.persona_id) {
			const persona = await agentGetPersona(env.AUTH_DATABASE_URL, existing.thread.persona_id);
			if (persona) systemPrompt = persona.system_prompt;
		}
		// Auto-title placeholder threads on first user message.
		if (history.length === 0 && existing.thread.title === "New chat") {
			const trimmed = body.message.trim().replace(/\s+/g, " ");
			const title = trimmed.length <= 50 ? trimmed : `${trimmed.slice(0, 47)}…`;
			await agentUpdateThread(env.AUTH_DATABASE_URL, session.userId, body.thread_id, { title });
		}
		return runAgent({
			userMessage: body.message,
			history,
			ctx,
			llmEnv,
			systemPrompt,
			persist: { threadId: body.thread_id, dbUrl: env.AUTH_DATABASE_URL },
		});
	}

	// Ephemeral path (existing behavior).
	return runAgent({
		userMessage: body.message,
		history: (body.history ?? []) as Parameters<typeof runAgent>[0]["history"],
		ctx,
		llmEnv,
	});
}

// --- Agent threads + personas ---

async function handleAgentPersonas(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();
	if (request.method !== "GET") {
		return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
	}
	const session = await getSession(request, env);
	if (!session) return jsonResponse({ error: "AUTH_REQUIRED" }, { status: 401 });
	const personas = await agentListPersonas(env.AUTH_DATABASE_URL);
	// Strip system_prompt — callers only need to identify + describe, not reveal internals.
	return jsonResponse({
		personas: personas.map((p) => ({ id: p.id, name: p.name, description: p.description })),
	});
}

async function requireProForThreads(
	request: Request,
	env: Env,
): Promise<{ userId: string } | Response> {
	const session = await getSession(request, env);
	if (!session) return jsonResponse({ error: "AUTH_REQUIRED" }, { status: 401 });
	const sub = await getActiveSubscription(env, session.userId, session.email);
	if (!tierAtLeast(sub?.tier ?? null, "pro")) {
		return jsonResponse({ error: "UPGRADE_REQUIRED", required: "pro" }, { status: 403 });
	}
	return { userId: session.userId };
}

async function handleAgentThreadsList(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();
	if (request.method === "GET") {
		const auth = await requireProForThreads(request, env);
		if (auth instanceof Response) return auth;
		const threads = await agentListThreads(env.AUTH_DATABASE_URL, auth.userId, 30);
		return jsonResponse({ threads });
	}
	if (request.method === "POST") {
		const auth = await requireProForThreads(request, env);
		if (auth instanceof Response) return auth;
		let body: { personaId?: string | null; title?: string } = {};
		try {
			body = (await request.json()) as typeof body;
		} catch {
			/* empty body ok */
		}
		const title = (body.title ?? "").trim() || "New chat";
		const thread = await agentCreateThread(
			env.AUTH_DATABASE_URL,
			auth.userId,
			title,
			body.personaId ?? null,
		);
		return jsonResponse({ thread }, { status: 201 });
	}
	return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
}

async function handleAgentThreadItem(
	request: Request,
	env: Env,
	threadId: string,
): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();
	const auth = await requireProForThreads(request, env);
	if (auth instanceof Response) return auth;

	if (request.method === "GET") {
		const result = await agentGetThread(env.AUTH_DATABASE_URL, auth.userId, threadId);
		if (!result) return jsonResponse({ error: "THREAD_NOT_FOUND" }, { status: 404 });
		return jsonResponse(result);
	}
	if (request.method === "PATCH" || request.method === "PUT") {
		let body: { title?: string; personaId?: string | null } = {};
		try {
			body = (await request.json()) as typeof body;
		} catch {
			return jsonResponse({ error: "INVALID_JSON" }, { status: 400 });
		}
		const updated = await agentUpdateThread(env.AUTH_DATABASE_URL, auth.userId, threadId, {
			title: body.title,
			persona_id: body.personaId,
		});
		if (!updated) return jsonResponse({ error: "THREAD_NOT_FOUND" }, { status: 404 });
		return jsonResponse({ thread: updated });
	}
	if (request.method === "DELETE") {
		const ok = await agentDeleteThread(env.AUTH_DATABASE_URL, auth.userId, threadId);
		if (!ok) return jsonResponse({ error: "THREAD_NOT_FOUND" }, { status: 404 });
		return jsonResponse({ ok: true });
	}
	return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
}

// --- Billing ---

async function handleBillingCheckout(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();
	if (request.method !== "POST") {
		return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
	}
	if (!env.MAYAR_API_KEY) {
		return jsonResponse({ error: "BILLING_NOT_CONFIGURED" }, { status: 503 });
	}

	const session = await getSession(request, env);
	if (!session) return jsonResponse({ error: "AUTH_REQUIRED" }, { status: 401 });

	let body: { tier?: string };
	try {
		body = (await request.json()) as { tier?: string };
	} catch {
		return jsonResponse({ error: "INVALID_JSON" }, { status: 400 });
	}
	const tier = body.tier as Tier | undefined;
	if (!tier || !(tier in TIERS)) {
		return jsonResponse({ error: "INVALID_TIER" }, { status: 400 });
	}

	// Look up display name from the users table.
	const sql = neon(env.AUTH_DATABASE_URL);
	const rows = (await sql`
		SELECT email, name FROM terminal_users WHERE id = ${session.userId}
	`) as { email: string; name: string | null }[];
	const user = rows[0];
	if (!user) return jsonResponse({ error: "USER_NOT_FOUND" }, { status: 404 });

	const origin = new URL(request.url).origin;

	try {
		const result = await createCheckout({
			authDbUrl: env.AUTH_DATABASE_URL,
			mayarApiKey: env.MAYAR_API_KEY,
			userId: session.userId,
			email: user.email,
			name: user.name || user.email.split("@")[0],
			tier,
			origin,
		});
		return jsonResponse({ link: result.link, sub_id: result.subId });
	} catch (e) {
		return jsonResponse(
			{ error: "CHECKOUT_FAILED", message: e instanceof Error ? e.message : String(e) },
			{ status: 502 },
		);
	}
}

async function handleBillingWebhook(request: Request, env: Env): Promise<Response> {
	if (request.method !== "POST") {
		return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
	}
	if (!env.MAYAR_API_KEY || !env.MAYAR_WEBHOOK_TOKEN) {
		return jsonResponse({ error: "BILLING_NOT_CONFIGURED" }, { status: 503 });
	}

	let body: Parameters<typeof handleWebhook>[0]["body"];
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "INVALID_JSON" }, { status: 400 });
	}

	try {
		const result = await handleWebhook({
			authDbUrl: env.AUTH_DATABASE_URL,
			mayarApiKey: env.MAYAR_API_KEY,
			webhookToken: env.MAYAR_WEBHOOK_TOKEN,
			callbackToken: request.headers.get("X-Callback-Token"),
			body,
		});
		return jsonResponse(result, { status: result.ok ? 200 : 400 });
	} catch (e) {
		return jsonResponse(
			{ ok: false, message: e instanceof Error ? e.message : String(e) },
			{ status: 500 },
		);
	}
}

// --- Analytics (unchanged) ---

interface EventBody {
	session_id: string;
	path: string;
	referrer?: string;
}

async function handleAnalyticsEvent(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();

	try {
		const body = (await request.json()) as EventBody;
		if (!body.session_id || !body.path) {
			return jsonResponse({ error: "missing fields" }, { status: 400 });
		}

		const sql = neon(env.DATABASE_URL);
		const country = request.headers.get("cf-ipcountry") ?? null;
		const userAgent = request.headers.get("user-agent") ?? null;

		await sql`
			INSERT INTO sessions (id, first_seen, last_seen, page_count, country, user_agent)
			VALUES (${body.session_id}, now(), now(), 1, ${country}, ${userAgent})
			ON CONFLICT (id) DO UPDATE SET
				last_seen = now(),
				page_count = sessions.page_count + 1
		`;

		await sql`
			INSERT INTO page_views (session_id, path, referrer, country, created_at)
			VALUES (${body.session_id}, ${body.path}, ${body.referrer ?? null}, ${country}, now())
		`;

		return jsonResponse({ ok: true });
	} catch {
		return jsonResponse({ error: "internal" }, { status: 500 });
	}
}

async function handleAnalyticsStats(env: Env): Promise<Response> {
	try {
		const sql = neon(env.DATABASE_URL);

		const [activeRows, totalVisitorRows, totalViewRows] = await Promise.all([
			sql`SELECT COUNT(*)::int AS count FROM sessions WHERE last_seen >= now() - interval '5 minutes'`,
			sql`SELECT COUNT(*)::int AS count FROM sessions`,
			sql`SELECT COUNT(*)::int AS count FROM page_views`,
		]);

		return jsonResponse(
			{
				online: activeRows[0]?.count ?? 0,
				total_visitors: totalVisitorRows[0]?.count ?? 0,
				total_views: totalViewRows[0]?.count ?? 0,
			},
			{ headers: { "Cache-Control": "public, max-age=10" } },
		);
	} catch {
		return jsonResponse({ online: 0, total_visitors: 0, total_views: 0 }, { status: 500 });
	}
}

// --- Research ---

function isFounder(email: string | undefined): boolean {
	return !!email && FOUNDER_EMAILS.has(email.toLowerCase());
}

async function handleResearchList(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const type = (url.searchParams.get("type") || undefined) as ArticleType | undefined;
	const ticker = url.searchParams.get("ticker") || undefined;
	const tag = url.searchParams.get("tag") || undefined;
	const limit = parseInt(url.searchParams.get("limit") || "20", 10);
	const offset = parseInt(url.searchParams.get("offset") || "0", 10);

	const result = await listArticles(env.AUTH_DATABASE_URL, { type, ticker, tag, limit, offset });
	return jsonResponse(result);
}

async function handleResearchArticle(request: Request, env: Env, slug: string): Promise<Response> {
	const session = await getSession(request, env);
	const viewerTier = session
		? ((await getActiveSubscription(env, session.userId, session.email))?.tier ?? null)
		: null;
	const tierForRead =
		session && isFounder(session.email) ? "institutional" : (viewerTier as Tier | null);

	const result = await getArticleBySlug(env.AUTH_DATABASE_URL, slug, tierForRead);
	if (!result) return jsonResponse({ error: "not_found" }, { status: 404 });

	if (session && !result.gated) {
		// Fire-and-forget read tracking; don't block response.
		markRead(env.AUTH_DATABASE_URL, session.userId, result.article.id).catch(() => {});
	}

	return jsonResponse(result);
}

async function handleAdminResearchDrafts(request: Request, env: Env): Promise<Response> {
	const session = await getSession(request, env);
	if (!session || !isFounder(session.email)) {
		return jsonResponse({ error: "forbidden" }, { status: 403 });
	}
	const items = await listDrafts(env.AUTH_DATABASE_URL);
	return jsonResponse({ items });
}

async function handleAdminResearchUpsert(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();
	const session = await getSession(request, env);
	if (!session || !isFounder(session.email)) {
		return jsonResponse({ error: "forbidden" }, { status: 403 });
	}
	let body: ArticleInput;
	try {
		body = (await request.json()) as ArticleInput;
	} catch {
		return jsonResponse({ error: "bad_json" }, { status: 400 });
	}
	if (!body.slug || !body.type || !body.title || !body.summary || !body.body_md) {
		return jsonResponse({ error: "missing_fields" }, { status: 400 });
	}
	const article = await upsertArticle(env.AUTH_DATABASE_URL, {
		...body,
		reviewed_by: body.reviewed_by ?? session.email,
	});
	return jsonResponse({ article });
}

async function handleAdminResearchPublish(
	request: Request,
	env: Env,
	id: string,
): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();
	const session = await getSession(request, env);
	if (!session || !isFounder(session.email)) {
		return jsonResponse({ error: "forbidden" }, { status: 403 });
	}
	await publishArticle(env.AUTH_DATABASE_URL, id, session.email);
	return jsonResponse({ ok: true });
}

// --- Journal ---

async function handleJournalList(request: Request, env: Env): Promise<Response> {
	const session = await getSession(request, env);
	if (!session) return jsonResponse({ error: "AUTH_REQUIRED" }, { status: 401 });

	const url = new URL(request.url);
	const orderIdRaw = url.searchParams.get("order_id");
	const ticker = url.searchParams.get("ticker") || undefined;
	const kind = (url.searchParams.get("kind") || undefined) as JournalKind | undefined;
	const limit = parseInt(url.searchParams.get("limit") || "50", 10);
	const offset = parseInt(url.searchParams.get("offset") || "0", 10);
	const orderId = orderIdRaw ? parseInt(orderIdRaw, 10) : undefined;

	const result = await journalList(env.AUTH_DATABASE_URL, session.userId, {
		orderId: Number.isFinite(orderId) ? orderId : undefined,
		ticker,
		kind,
		limit,
		offset,
	});
	return jsonResponse(result);
}

async function handleJournalCreate(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();
	const session = await getSession(request, env);
	if (!session) return jsonResponse({ error: "AUTH_REQUIRED" }, { status: 401 });

	let body: JournalCreate;
	try {
		body = (await request.json()) as JournalCreate;
	} catch {
		return jsonResponse({ error: "INVALID_JSON" }, { status: 400 });
	}
	if (!body.kind || !body.body_md || !["entry", "exit", "note"].includes(body.kind)) {
		return jsonResponse({ error: "INVALID_INPUT" }, { status: 400 });
	}
	const entry = await journalCreate(env.AUTH_DATABASE_URL, session.userId, body);
	return jsonResponse({ entry }, { status: 201 });
}

async function handleJournalUpdate(request: Request, env: Env, id: string): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();
	const session = await getSession(request, env);
	if (!session) return jsonResponse({ error: "AUTH_REQUIRED" }, { status: 401 });

	let body: JournalUpdate;
	try {
		body = (await request.json()) as JournalUpdate;
	} catch {
		return jsonResponse({ error: "INVALID_JSON" }, { status: 400 });
	}
	const entry = await journalUpdate(env.AUTH_DATABASE_URL, session.userId, id, body);
	if (!entry) return jsonResponse({ error: "NOT_FOUND" }, { status: 404 });
	return jsonResponse({ entry });
}

async function handleJournalDelete(request: Request, env: Env, id: string): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();
	const session = await getSession(request, env);
	if (!session) return jsonResponse({ error: "AUTH_REQUIRED" }, { status: 401 });

	const ok = await journalDelete(env.AUTH_DATABASE_URL, session.userId, id);
	if (!ok) return jsonResponse({ error: "NOT_FOUND" }, { status: 404 });
	return jsonResponse({ ok: true });
}

async function handleResearchSubscriptions(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();
	const session = await getSession(request, env);
	if (!session) return jsonResponse({ error: "AUTH_REQUIRED" }, { status: 401 });

	if (request.method === "GET") {
		const sub = await getSubscription(env.AUTH_DATABASE_URL, session.userId);
		return jsonResponse(sub);
	}

	if (request.method === "POST") {
		let body: { email_enabled?: boolean; types?: ArticleType[] };
		try {
			body = (await request.json()) as { email_enabled?: boolean; types?: ArticleType[] };
		} catch {
			return jsonResponse({ error: "INVALID_JSON" }, { status: 400 });
		}
		const sub = await upsertSubscription(env.AUTH_DATABASE_URL, session.userId, {
			email_enabled: body.email_enabled,
			types: body.types,
		});
		return jsonResponse(sub);
	}

	return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
}

async function handleAdminGenerateAmBrief(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();
	const session = await getSession(request, env);
	if (!session || !isFounder(session.email)) {
		return jsonResponse({ error: "forbidden" }, { status: 403 });
	}
	const result = await generateAmBrief(env);
	return jsonResponse(result, { status: result.ok ? 200 : 500 });
}

async function handleAdminGenerateDeepDive(request: Request, env: Env): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();
	const session = await getSession(request, env);
	if (!session || !isFounder(session.email)) {
		return jsonResponse({ error: "forbidden" }, { status: 403 });
	}
	let body: { ticker?: string } = {};
	try {
		body = (await request.json()) as { ticker?: string };
	} catch {
		/* ignore */
	}
	if (!body.ticker || typeof body.ticker !== "string") {
		return jsonResponse({ ok: false, error: "ticker required" }, { status: 400 });
	}
	const result = await generateDeepDive(env, body.ticker);
	return jsonResponse(result, { status: result.ok ? 200 : 500 });
}

async function handleAdminGenerateEarningsPreview(
	request: Request,
	env: Env,
): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();
	const session = await getSession(request, env);
	if (!session || !isFounder(session.email)) {
		return jsonResponse({ error: "forbidden" }, { status: 403 });
	}
	let body: { ticker?: string } = {};
	try {
		body = (await request.json()) as { ticker?: string };
	} catch {
		/* ignore */
	}
	if (!body.ticker || typeof body.ticker !== "string") {
		return jsonResponse({ ok: false, error: "ticker required" }, { status: 400 });
	}
	const result = await generateEarningsPreview(env, body.ticker);
	return jsonResponse(result, { status: result.ok ? 200 : 500 });
}

// --- Router ---

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// Auth
		if (path === "/api/auth/login") return handleAuthLogin(env);
		if (path === "/api/auth/callback") return handleAuthCallback(request, env);
		if (path === "/api/auth/me") return handleAuthMe(request, env);
		if (path === "/api/auth/logout") {
			if (request.method === "OPTIONS") return corsResponse();
			return handleAuthLogout();
		}

		// Agent
		if (path === "/api/agent/chat") return handleAgentChat(request, env);
		if (path === "/api/agent/personas") return handleAgentPersonas(request, env);
		if (path === "/api/agent/threads") return handleAgentThreadsList(request, env);
		if (path.startsWith("/api/agent/thread/")) {
			const id = path.replace("/api/agent/thread/", "");
			return handleAgentThreadItem(request, env, id);
		}

		// Billing
		if (path === "/api/billing/checkout") return handleBillingCheckout(request, env);
		if (path === "/api/billing/webhook") return handleBillingWebhook(request, env);

		// Journal
		if (path === "/api/journal/entries") {
			if (request.method === "GET") return handleJournalList(request, env);
			if (request.method === "POST") return handleJournalCreate(request, env);
			if (request.method === "OPTIONS") return corsResponse();
			return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
		}
		if (path.startsWith("/api/journal/entries/")) {
			const id = path.replace("/api/journal/entries/", "");
			if (request.method === "PATCH" || request.method === "PUT") {
				return handleJournalUpdate(request, env, id);
			}
			if (request.method === "DELETE") return handleJournalDelete(request, env, id);
			if (request.method === "OPTIONS") return corsResponse();
			return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
		}

		// Research
		if (path === "/api/research/list") return handleResearchList(request, env);
		if (path === "/api/research/subscriptions") return handleResearchSubscriptions(request, env);
		if (path.startsWith("/api/research/article/")) {
			const slug = path.replace("/api/research/article/", "");
			return handleResearchArticle(request, env, slug);
		}
		if (path === "/api/admin/research/drafts") return handleAdminResearchDrafts(request, env);
		if (path === "/api/admin/research/upsert") return handleAdminResearchUpsert(request, env);
		if (path === "/api/admin/research/generate-am-brief")
			return handleAdminGenerateAmBrief(request, env);
		if (path === "/api/admin/research/generate-deep-dive")
			return handleAdminGenerateDeepDive(request, env);
		if (path === "/api/admin/research/generate-earnings-preview")
			return handleAdminGenerateEarningsPreview(request, env);
		if (path.startsWith("/api/admin/research/publish/")) {
			const id = path.replace("/api/admin/research/publish/", "");
			return handleAdminResearchPublish(request, env, id);
		}

		// API proxy
		if (path.startsWith("/api/proxy/")) {
			const subpath = path.replace("/api/proxy/", "");
			return handleProxy(request, env, ctx, subpath);
		}

		// Analytics
		if (path === "/api/analytics/event") {
			return handleAnalyticsEvent(request, env);
		}
		if (path === "/api/analytics/stats") {
			if (request.method === "OPTIONS") return corsResponse();
			return handleAnalyticsStats(env);
		}

		// Static assets
		const assetResponse = await env.ASSETS.fetch(request);
		const response = new Response(assetResponse.body, assetResponse);
		response.headers.set("X-Content-Type-Options", "nosniff");
		response.headers.set("X-Frame-Options", "DENY");
		response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
		response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
		return response;
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		// Cron schedules (UTC) — capped at 2 to fit CF free plan's 5-per-account limit:
		//   "30 23 * * *"  →  06:30 WIB daily — generate AM brief + rotating content:
		//                     Mon-Fri = 1 rotating deep-dive, Sun = 3 earnings previews, Sat = skip
		//   "40 23 * * *"  →  06:40 WIB daily — auto-publish stale drafts (all types, 9-min grace)
		const cron = event.cron;
		if (cron === "30 23 * * *") {
			ctx.waitUntil(
				generateAmBrief(env).then((r) => {
					console.log(`[am-brief] generate: ${JSON.stringify(r)}`);
				}),
			);
			const dow = new Date(event.scheduledTime).getUTCDay(); // 0=Sun..6=Sat
			if (dow === 0) {
				ctx.waitUntil(
					generateWeeklyEarningsPreviews(env, 3).then((r) => {
						console.log(`[earnings-preview] batch: ${JSON.stringify(r)}`);
					}),
				);
			} else if (dow >= 1 && dow <= 5) {
				ctx.waitUntil(
					generateRotatingDeepDive(env).then((r) => {
						console.log(`[deep-dive] generate: ${JSON.stringify(r)}`);
					}),
				);
			}
		} else if (cron === "40 23 * * *") {
			ctx.waitUntil(
				autoPublishStaleDrafts(env).then((r) => {
					console.log(`[auto-publish] all-types: ${JSON.stringify(r)}`);
				}),
			);
		}
	},
};
