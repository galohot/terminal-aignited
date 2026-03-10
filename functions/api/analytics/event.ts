import { neon } from "@neondatabase/serverless";

interface Env {
	DATABASE_URL: string;
}

interface EventBody {
	session_id: string;
	path: string;
	referrer?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { request, env } = context;

	try {
		const body = (await request.json()) as EventBody;
		if (!body.session_id || !body.path) {
			return Response.json({ error: "missing fields" }, { status: 400 });
		}

		const sql = neon(env.DATABASE_URL);
		const country = request.headers.get("cf-ipcountry") ?? null;
		const userAgent = request.headers.get("user-agent") ?? null;

		// Upsert session
		await sql`
			INSERT INTO sessions (id, first_seen, last_seen, page_count, country, user_agent)
			VALUES (${body.session_id}, now(), now(), 1, ${country}, ${userAgent})
			ON CONFLICT (id) DO UPDATE SET
				last_seen = now(),
				page_count = sessions.page_count + 1
		`;

		// Insert page view
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
};

export const onRequestOptions: PagesFunction = async () => {
	return new Response(null, {
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
};
