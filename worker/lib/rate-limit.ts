import type { neon } from "@neondatabase/serverless";

type NeonSql = ReturnType<typeof neon>;

type AgentTier = "starter" | "pro" | "institutional";

const AGENT_LIMITS: Record<AgentTier, number> = {
	starter: 40,
	pro: 200,
	institutional: 1000,
};

function normalizeTier(tier: string | null | undefined): AgentTier {
	if (tier === "pro" || tier === "institutional") return tier;
	return "starter";
}

let tableEnsured = false;

export async function takeAgentToken(
	sql: NeonSql,
	userId: string,
	tier: string | null | undefined,
): Promise<{ ok: true } | { ok: false; resetSec: number; limit: number }> {
	const resolved = normalizeTier(tier);
	const limit = AGENT_LIMITS[resolved];
	const windowMs = 3_600_000;
	const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

	if (!tableEnsured) {
		await ensureRateBucketTable(sql);
		tableEnsured = true;
	}

	const rows = (await sql`
		INSERT INTO terminal_rate_buckets (user_id, bucket, window_ts, count)
		VALUES (${userId}, 'agent_chat', ${windowStart.toISOString()}, 1)
		ON CONFLICT (user_id, bucket, window_ts)
		DO UPDATE SET count = terminal_rate_buckets.count + 1
		RETURNING count
	`) as { count: number }[];

	const count = rows[0]?.count ?? 0;
	if (count > limit) {
		const resetSec = Math.max(1, Math.ceil((windowStart.getTime() + windowMs - Date.now()) / 1000));
		return { ok: false, resetSec, limit };
	}
	return { ok: true };
}

export async function ensureRateBucketTable(sql: NeonSql): Promise<void> {
	await sql`
		CREATE TABLE IF NOT EXISTS terminal_rate_buckets (
			user_id    TEXT NOT NULL,
			bucket     TEXT NOT NULL,
			window_ts  TIMESTAMPTZ NOT NULL,
			count      INT NOT NULL DEFAULT 0,
			PRIMARY KEY (user_id, bucket, window_ts)
		)
	`;
	await sql`
		CREATE INDEX IF NOT EXISTS idx_terminal_rate_buckets_gc
		ON terminal_rate_buckets (window_ts)
	`;
}

export async function gcRateBuckets(sql: NeonSql): Promise<number> {
	const rows = (await sql`
		DELETE FROM terminal_rate_buckets
		WHERE window_ts < now() - interval '24 hours'
		RETURNING 1
	`) as unknown[];
	return rows.length;
}
