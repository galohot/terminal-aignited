import { neon } from "@neondatabase/serverless";

interface Env {
	DATABASE_URL: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const { env } = context;

	try {
		const sql = neon(env.DATABASE_URL);

		const [activeRows, totalVisitorRows, totalViewRows] = await Promise.all([
			// Online now (sessions active in last 5 min)
			sql`SELECT COUNT(*)::int AS count FROM sessions WHERE last_seen >= now() - interval '5 minutes'`,

			// Total unique visitors (all time, keeps compounding)
			sql`SELECT COUNT(*)::int AS count FROM sessions`,

			// Total page views (all time, keeps compounding)
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
};

export const onRequestOptions: PagesFunction = async () => {
	return new Response(null, {
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
};
