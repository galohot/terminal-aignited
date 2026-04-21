// Telegram link flow + per-user chat_id capture. Stored on AUTH_DATABASE_URL.
// - Link tokens are short-lived nonces consumed by the bot /start deep link.
// - telegram_chat_id lives on terminal_research_subscriptions (channel='telegram').
// - Delivery ledger prevents dup DMs across cron retries.

import { type NeonQueryFunction, neon } from "@neondatabase/serverless";
import type { Tier } from "./billing";

type Sql = NeonQueryFunction<false, false>;

const TOKEN_TTL_MINUTES = 10;
const DEFAULT_TYPES = ["am_brief", "deep_dive", "earnings_preview"];

let schemaReady = false;

async function ensureSchema(sql: Sql): Promise<void> {
	if (schemaReady) return;
	await sql`
		CREATE TABLE IF NOT EXISTS terminal_telegram_link_tokens (
			token TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES terminal_users(id) ON DELETE CASCADE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			expires_at TIMESTAMPTZ NOT NULL
		)
	`;
	await sql`CREATE INDEX IF NOT EXISTS idx_tg_tokens_user ON terminal_telegram_link_tokens (user_id)`;
	await sql`
		CREATE TABLE IF NOT EXISTS terminal_research_tg_deliveries (
			user_id TEXT NOT NULL REFERENCES terminal_users(id) ON DELETE CASCADE,
			article_id UUID NOT NULL REFERENCES terminal_research_articles(id) ON DELETE CASCADE,
			delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			PRIMARY KEY (user_id, article_id)
		)
	`;
	await sql`CREATE INDEX IF NOT EXISTS idx_tg_deliv_article ON terminal_research_tg_deliveries (article_id)`;
	schemaReady = true;
}

function randomToken(): string {
	const bytes = new Uint8Array(9);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export async function createLinkToken(
	dbUrl: string,
	userId: string,
): Promise<{ token: string; expiresAt: string }> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	// GC expired tokens for this user opportunistically.
	await sql`DELETE FROM terminal_telegram_link_tokens WHERE user_id = ${userId} AND expires_at < now()`;
	const token = randomToken();
	const rows = (await sql`
		INSERT INTO terminal_telegram_link_tokens (token, user_id, expires_at)
		VALUES (${token}, ${userId}, now() + INTERVAL '${sql.unsafe(String(TOKEN_TTL_MINUTES))} minutes')
		RETURNING expires_at
	`) as { expires_at: string }[];
	return { token, expiresAt: rows[0].expires_at };
}

export async function consumeLinkToken(
	dbUrl: string,
	token: string,
): Promise<{ userId: string } | null> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const rows = (await sql`
		DELETE FROM terminal_telegram_link_tokens
		WHERE token = ${token} AND expires_at > now()
		RETURNING user_id
	`) as { user_id: string }[];
	if (rows.length === 0) return null;
	return { userId: rows[0].user_id };
}

export async function setTelegramChatId(
	dbUrl: string,
	userId: string,
	chatId: string,
): Promise<void> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	await sql`
		INSERT INTO terminal_research_subscriptions (user_id, channel, types, telegram_chat_id)
		VALUES (${userId}, 'telegram', ${DEFAULT_TYPES}, ${chatId})
		ON CONFLICT (user_id, channel) DO UPDATE SET
			telegram_chat_id = EXCLUDED.telegram_chat_id
	`;
}

export async function clearTelegramChatId(dbUrl: string, userId: string): Promise<void> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	await sql`
		DELETE FROM terminal_research_subscriptions
		WHERE user_id = ${userId} AND channel = 'telegram'
	`;
}

export async function getTelegramStatus(
	dbUrl: string,
	userId: string,
): Promise<{ linked: boolean; types: string[] }> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const rows = (await sql`
		SELECT telegram_chat_id, types
		FROM terminal_research_subscriptions
		WHERE user_id = ${userId} AND channel = 'telegram'
	`) as { telegram_chat_id: string | null; types: string[] }[];
	if (rows.length === 0) return { linked: false, types: [] };
	return { linked: !!rows[0].telegram_chat_id, types: rows[0].types };
}

export interface TelegramSubscriber {
	userId: string;
	chatId: string;
	types: string[];
	tier: Tier | null;
}

export async function listTelegramSubscribers(dbUrl: string): Promise<TelegramSubscriber[]> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const rows = (await sql`
		SELECT
			s.user_id,
			s.telegram_chat_id,
			s.types,
			sub.tier
		FROM terminal_research_subscriptions s
		LEFT JOIN terminal_subscriptions sub
			ON sub.user_id = s.user_id AND sub.status = 'active'
		WHERE s.channel = 'telegram' AND s.telegram_chat_id IS NOT NULL
	`) as {
		user_id: string;
		telegram_chat_id: string;
		types: string[];
		tier: Tier | null;
	}[];
	return rows.map((r) => ({
		userId: r.user_id,
		chatId: r.telegram_chat_id,
		types: r.types,
		tier: r.tier,
	}));
}

export async function hasDelivered(
	dbUrl: string,
	userId: string,
	articleId: string,
): Promise<boolean> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const rows = (await sql`
		SELECT 1 FROM terminal_research_tg_deliveries
		WHERE user_id = ${userId} AND article_id = ${articleId}::uuid
		LIMIT 1
	`) as { "?column?": number }[];
	return rows.length > 0;
}

export async function recordDelivery(
	dbUrl: string,
	userId: string,
	articleId: string,
): Promise<void> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	await sql`
		INSERT INTO terminal_research_tg_deliveries (user_id, article_id)
		VALUES (${userId}, ${articleId}::uuid)
		ON CONFLICT DO NOTHING
	`;
}
