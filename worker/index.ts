import { neon } from "@neondatabase/serverless";

interface Env {
	ASSETS: Fetcher;
	API_BASE_URL: string;
	API_KEY: string;
	DATABASE_URL: string;
}

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

function corsResponse() {
	return new Response(null, { headers: CORS_HEADERS });
}

// --- API Proxy: /api/proxy/* -> backend /api/v1/* ---

async function handleProxy(request: Request, env: Env, subpath: string): Promise<Response> {
	if (request.method === "OPTIONS") return corsResponse();

	const backendPath = `/api/v1/${subpath}`;
	const url = new URL(backendPath, env.API_BASE_URL);

	const reqUrl = new URL(request.url);
	reqUrl.searchParams.forEach((value, key) => {
		url.searchParams.set(key, value);
	});

	const hasBody = request.method !== "GET" && request.method !== "HEAD";
	const response = await fetch(url.toString(), {
		method: request.method,
		headers: {
			"X-API-Key": env.API_KEY,
			"Content-Type": "application/json",
		},
		body: hasBody ? request.body : undefined,
	});

	const headers = new Headers(response.headers);
	headers.set("Access-Control-Allow-Origin", "*");
	headers.set("Cache-Control", "public, max-age=10");

	return new Response(response.body, { status: response.status, headers });
}

// --- Analytics: POST /api/analytics/event ---

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
			return Response.json({ error: "missing fields" }, { status: 400 });
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

		return Response.json({ ok: true }, { headers: { "Access-Control-Allow-Origin": "*" } });
	} catch {
		return Response.json(
			{ error: "internal" },
			{ status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
		);
	}
}

// --- Analytics: GET /api/analytics/stats ---

async function handleAnalyticsStats(env: Env): Promise<Response> {
	try {
		const sql = neon(env.DATABASE_URL);

		const [activeRows, totalVisitorRows, totalViewRows] = await Promise.all([
			sql`SELECT COUNT(*)::int AS count FROM sessions WHERE last_seen >= now() - interval '5 minutes'`,
			sql`SELECT COUNT(*)::int AS count FROM sessions`,
			sql`SELECT COUNT(*)::int AS count FROM page_views`,
		]);

		return Response.json(
			{
				online: activeRows[0]?.count ?? 0,
				total_visitors: totalVisitorRows[0]?.count ?? 0,
				total_views: totalViewRows[0]?.count ?? 0,
			},
			{
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Cache-Control": "public, max-age=10",
				},
			},
		);
	} catch {
		return Response.json(
			{ online: 0, total_visitors: 0, total_views: 0 },
			{ status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
		);
	}
}

// --- Router ---

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// API proxy
		if (path.startsWith("/api/proxy/")) {
			const subpath = path.replace("/api/proxy/", "");
			return handleProxy(request, env, subpath);
		}

		// Analytics
		if (path === "/api/analytics/event") {
			return handleAnalyticsEvent(request, env);
		}
		if (path === "/api/analytics/stats") {
			if (request.method === "OPTIONS") return corsResponse();
			return handleAnalyticsStats(env);
		}

		// Everything else: static assets
		return env.ASSETS.fetch(request);
	},
};
