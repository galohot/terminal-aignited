// Paper-trading journal — thesis on entry, post-mortem on exit.
// Lives on AUTH_DATABASE_URL (Neon) alongside users/subscriptions/research.
// order_id is the numeric id from market-api PG; no FK (cross-DB), ownership is
// enforced by user_id at read/write time.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;

export type JournalKind = "entry" | "exit" | "note";

export interface JournalEntry {
	id: string;
	user_id: string;
	order_id: number | null;
	ticker: string | null;
	kind: JournalKind;
	body_md: string;
	tags: string[];
	research_article_id: string | null;
	created_at: string;
	updated_at: string;
}

let schemaReady = false;

async function ensureSchema(sql: Sql): Promise<void> {
	if (schemaReady) return;
	await sql`
		CREATE TABLE IF NOT EXISTS terminal_paper_journal_entries (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id TEXT NOT NULL REFERENCES terminal_users(id) ON DELETE CASCADE,
			order_id BIGINT,
			ticker TEXT,
			kind TEXT NOT NULL CHECK (kind IN ('entry','exit','note')),
			body_md TEXT NOT NULL,
			tags TEXT[] NOT NULL DEFAULT '{}',
			research_article_id UUID REFERENCES terminal_research_articles(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`;
	await sql`CREATE INDEX IF NOT EXISTS idx_tpje_user_created ON terminal_paper_journal_entries (user_id, created_at DESC)`;
	await sql`CREATE INDEX IF NOT EXISTS idx_tpje_user_order ON terminal_paper_journal_entries (user_id, order_id) WHERE order_id IS NOT NULL`;
	await sql`CREATE INDEX IF NOT EXISTS idx_tpje_user_ticker ON terminal_paper_journal_entries (user_id, ticker) WHERE ticker IS NOT NULL`;
	await sql`CREATE INDEX IF NOT EXISTS idx_tpje_tags ON terminal_paper_journal_entries USING GIN (tags)`;
	schemaReady = true;
}

export interface ListParams {
	orderId?: number;
	ticker?: string;
	kind?: JournalKind;
	limit?: number;
	offset?: number;
}

export async function listEntries(
	dbUrl: string,
	userId: string,
	params: ListParams = {},
): Promise<{ items: JournalEntry[]; total: number }> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);

	const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
	const offset = Math.max(params.offset ?? 0, 0);

	const items = (await sql`
		SELECT id, user_id, order_id, ticker, kind, body_md, tags,
		       research_article_id, created_at, updated_at
		FROM terminal_paper_journal_entries
		WHERE user_id = ${userId}
		  AND (${params.orderId ?? null}::bigint IS NULL OR order_id = ${params.orderId ?? null})
		  AND (${params.ticker ?? null}::text IS NULL OR ticker = ${params.ticker ?? null})
		  AND (${params.kind ?? null}::text IS NULL OR kind = ${params.kind ?? null})
		ORDER BY created_at DESC
		LIMIT ${limit} OFFSET ${offset}
	`) as JournalEntry[];

	const countRow = (await sql`
		SELECT COUNT(*)::int AS n
		FROM terminal_paper_journal_entries
		WHERE user_id = ${userId}
		  AND (${params.orderId ?? null}::bigint IS NULL OR order_id = ${params.orderId ?? null})
		  AND (${params.ticker ?? null}::text IS NULL OR ticker = ${params.ticker ?? null})
		  AND (${params.kind ?? null}::text IS NULL OR kind = ${params.kind ?? null})
	`) as { n: number }[];

	return { items, total: countRow[0]?.n ?? 0 };
}

export interface CreateInput {
	order_id?: number | null;
	ticker?: string | null;
	kind: JournalKind;
	body_md: string;
	tags?: string[];
	research_article_id?: string | null;
}

export async function createEntry(
	dbUrl: string,
	userId: string,
	input: CreateInput,
): Promise<JournalEntry> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const rows = (await sql`
		INSERT INTO terminal_paper_journal_entries
			(user_id, order_id, ticker, kind, body_md, tags, research_article_id)
		VALUES (
			${userId},
			${input.order_id ?? null},
			${input.ticker ? input.ticker.toUpperCase().replace(/\.JK$/i, "") : null},
			${input.kind},
			${input.body_md},
			${input.tags ?? []},
			${input.research_article_id ?? null}
		)
		RETURNING id, user_id, order_id, ticker, kind, body_md, tags,
		          research_article_id, created_at, updated_at
	`) as JournalEntry[];
	return rows[0];
}

export interface UpdateInput {
	body_md?: string;
	kind?: JournalKind;
	tags?: string[];
	research_article_id?: string | null;
}

export async function updateEntry(
	dbUrl: string,
	userId: string,
	id: string,
	patch: UpdateInput,
): Promise<JournalEntry | null> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const rows = (await sql`
		UPDATE terminal_paper_journal_entries
		SET
			body_md = COALESCE(${patch.body_md ?? null}, body_md),
			kind = COALESCE(${patch.kind ?? null}, kind),
			tags = COALESCE(${patch.tags ?? null}, tags),
			research_article_id = COALESCE(${patch.research_article_id ?? null}, research_article_id),
			updated_at = now()
		WHERE id = ${id}::uuid AND user_id = ${userId}
		RETURNING id, user_id, order_id, ticker, kind, body_md, tags,
		          research_article_id, created_at, updated_at
	`) as JournalEntry[];
	return rows[0] ?? null;
}

export async function deleteEntry(
	dbUrl: string,
	userId: string,
	id: string,
): Promise<boolean> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const rows = (await sql`
		DELETE FROM terminal_paper_journal_entries
		WHERE id = ${id}::uuid AND user_id = ${userId}
		RETURNING id
	`) as { id: string }[];
	return rows.length > 0;
}

// Simple ILIKE + tag match for the agent tool. pgvector can land later.
export async function searchEntries(
	dbUrl: string,
	userId: string,
	query: string,
	limit = 10,
): Promise<JournalEntry[]> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const pattern = `%${query.toLowerCase()}%`;
	return (await sql`
		SELECT id, user_id, order_id, ticker, kind, body_md, tags,
		       research_article_id, created_at, updated_at
		FROM terminal_paper_journal_entries
		WHERE user_id = ${userId}
		  AND (
		    lower(body_md) LIKE ${pattern}
		    OR ${query.toUpperCase()} = ANY(tags)
		    OR upper(ticker) = ${query.toUpperCase()}
		  )
		ORDER BY created_at DESC
		LIMIT ${Math.min(Math.max(limit, 1), 30)}
	`) as JournalEntry[];
}
