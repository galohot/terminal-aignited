// Exclusive financial research — list/detail/admin endpoints + paywall logic.
// Schema lives in AUTH_DATABASE_URL alongside terminal_users/terminal_subscriptions.
// Auto-migrates on first hit (idempotent IF NOT EXISTS).

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;

export type Tier = "starter" | "pro" | "institutional";
export type ArticleType =
	| "am_brief"
	| "deep_dive"
	| "sector"
	| "earnings_preview"
	| "earnings_recap"
	| "power_map"
	| "macro";
export type ArticleStatus = "draft" | "reviewed" | "published" | "archived";

export interface Article {
	id: string;
	slug: string;
	type: ArticleType;
	title: string;
	summary: string;
	body_md: string;
	tickers: string[];
	sectors: string[];
	tags: string[];
	required_tier: Tier;
	status: ArticleStatus;
	published_at: string | null;
	generated_by: string | null;
	reviewed_by: string | null;
	created_at: string;
}

// Module-scope flag: ensures schema runs at most once per isolate.
let schemaReady = false;

async function ensureSchema(sql: Sql): Promise<void> {
	if (schemaReady) return;
	// Statements run sequentially; neon-http serverless needs individual calls.
	await sql`
		CREATE TABLE IF NOT EXISTS terminal_research_articles (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			slug TEXT UNIQUE NOT NULL,
			type TEXT NOT NULL CHECK (type IN ('am_brief','deep_dive','sector','earnings_preview','earnings_recap','power_map','macro')),
			title TEXT NOT NULL,
			summary TEXT NOT NULL,
			body_md TEXT NOT NULL,
			tickers TEXT[] NOT NULL DEFAULT '{}',
			sectors TEXT[] NOT NULL DEFAULT '{}',
			tags TEXT[] NOT NULL DEFAULT '{}',
			data_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
			required_tier TEXT NOT NULL DEFAULT 'pro' CHECK (required_tier IN ('starter','pro','institutional')),
			status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','published','archived')),
			published_at TIMESTAMPTZ,
			generated_by TEXT,
			reviewed_by TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`;
	await sql`CREATE INDEX IF NOT EXISTS idx_tr_articles_published ON terminal_research_articles (published_at DESC) WHERE status = 'published'`;
	await sql`CREATE INDEX IF NOT EXISTS idx_tr_articles_type_published ON terminal_research_articles (type, published_at DESC) WHERE status = 'published'`;
	await sql`CREATE INDEX IF NOT EXISTS idx_tr_articles_tickers ON terminal_research_articles USING GIN (tickers)`;
	await sql`CREATE INDEX IF NOT EXISTS idx_tr_articles_tags ON terminal_research_articles USING GIN (tags)`;
	await sql`
		CREATE TABLE IF NOT EXISTS terminal_research_reads (
			user_id TEXT NOT NULL REFERENCES terminal_users(id) ON DELETE CASCADE,
			article_id UUID NOT NULL REFERENCES terminal_research_articles(id) ON DELETE CASCADE,
			read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			PRIMARY KEY (user_id, article_id)
		)
	`;
	schemaReady = true;
}

// Tier ordering for gate checks.
const TIER_RANK: Record<Tier, number> = { starter: 0, pro: 1, institutional: 2 };
export function tierMeets(userTier: Tier | null, required: Tier): boolean {
	if (!userTier) return false;
	return TIER_RANK[userTier] >= TIER_RANK[required];
}

// First ~2 paragraphs of markdown for previews.
function previewBody(md: string): string {
	const paragraphs = md.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
	return paragraphs.slice(0, 2).join("\n\n");
}

interface ListParams {
	type?: ArticleType;
	ticker?: string;
	tag?: string;
	limit: number;
	offset: number;
}

export async function listArticles(
	dbUrl: string,
	params: ListParams,
): Promise<{ items: Article[]; total: number }> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);

	const limit = Math.min(Math.max(params.limit, 1), 50);
	const offset = Math.max(params.offset, 0);

	const items = (await sql`
		SELECT id, slug, type, title, summary, body_md, tickers, sectors, tags,
		       required_tier, status, published_at, generated_by, reviewed_by, created_at
		FROM terminal_research_articles
		WHERE status = 'published'
		  AND (${params.type ?? null}::text IS NULL OR type = ${params.type ?? null})
		  AND (${params.ticker ?? null}::text IS NULL OR ${params.ticker ?? null} = ANY(tickers))
		  AND (${params.tag ?? null}::text IS NULL OR ${params.tag ?? null} = ANY(tags))
		ORDER BY published_at DESC NULLS LAST
		LIMIT ${limit} OFFSET ${offset}
	`) as Article[];

	const countRow = (await sql`
		SELECT COUNT(*)::int AS n
		FROM terminal_research_articles
		WHERE status = 'published'
		  AND (${params.type ?? null}::text IS NULL OR type = ${params.type ?? null})
		  AND (${params.ticker ?? null}::text IS NULL OR ${params.ticker ?? null} = ANY(tickers))
		  AND (${params.tag ?? null}::text IS NULL OR ${params.tag ?? null} = ANY(tags))
	`) as { n: number }[];

	return { items: items.map(stripBodyIfGated), total: countRow[0]?.n ?? 0 };
}

// List items always ship only the teaser (summary + first 2 paragraphs).
function stripBodyIfGated(a: Article): Article {
	return { ...a, body_md: previewBody(a.body_md) };
}

export async function getArticleBySlug(
	dbUrl: string,
	slug: string,
	viewerTier: Tier | null,
): Promise<{ article: Article; gated: boolean } | null> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);

	const rows = (await sql`
		SELECT id, slug, type, title, summary, body_md, tickers, sectors, tags,
		       required_tier, status, published_at, generated_by, reviewed_by, created_at
		FROM terminal_research_articles
		WHERE slug = ${slug}
		LIMIT 1
	`) as Article[];

	const article = rows[0];
	if (!article) return null;
	if (article.status !== "published") return null;

	const canRead = tierMeets(viewerTier, article.required_tier);
	if (canRead) return { article, gated: false };
	return { article: { ...article, body_md: previewBody(article.body_md) }, gated: true };
}

export async function markRead(dbUrl: string, userId: string, articleId: string): Promise<void> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	await sql`
		INSERT INTO terminal_research_reads (user_id, article_id)
		VALUES (${userId}, ${articleId})
		ON CONFLICT (user_id, article_id) DO UPDATE SET read_at = now()
	`;
}

// ---- Admin / editor ---------------------------------------------------

export interface ArticleInput {
	slug: string;
	type: ArticleType;
	title: string;
	summary: string;
	body_md: string;
	tickers?: string[];
	sectors?: string[];
	tags?: string[];
	required_tier?: Tier;
	status?: ArticleStatus;
	generated_by?: string;
	reviewed_by?: string;
}

export async function upsertArticle(dbUrl: string, input: ArticleInput): Promise<Article> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);

	const publishedAt = input.status === "published" ? new Date().toISOString() : null;

	const rows = (await sql`
		INSERT INTO terminal_research_articles
			(slug, type, title, summary, body_md, tickers, sectors, tags,
			 required_tier, status, published_at, generated_by, reviewed_by)
		VALUES (
			${input.slug}, ${input.type}, ${input.title}, ${input.summary}, ${input.body_md},
			${input.tickers ?? []}, ${input.sectors ?? []}, ${input.tags ?? []},
			${input.required_tier ?? "pro"}, ${input.status ?? "draft"},
			${publishedAt}, ${input.generated_by ?? null}, ${input.reviewed_by ?? null}
		)
		ON CONFLICT (slug) DO UPDATE SET
			type = EXCLUDED.type,
			title = EXCLUDED.title,
			summary = EXCLUDED.summary,
			body_md = EXCLUDED.body_md,
			tickers = EXCLUDED.tickers,
			sectors = EXCLUDED.sectors,
			tags = EXCLUDED.tags,
			required_tier = EXCLUDED.required_tier,
			status = EXCLUDED.status,
			published_at = COALESCE(EXCLUDED.published_at, terminal_research_articles.published_at),
			generated_by = COALESCE(EXCLUDED.generated_by, terminal_research_articles.generated_by),
			reviewed_by = COALESCE(EXCLUDED.reviewed_by, terminal_research_articles.reviewed_by),
			updated_at = now()
		RETURNING id, slug, type, title, summary, body_md, tickers, sectors, tags,
		          required_tier, status, published_at, generated_by, reviewed_by, created_at
	`) as Article[];

	return rows[0];
}

export async function listDrafts(dbUrl: string): Promise<Article[]> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	return (await sql`
		SELECT id, slug, type, title, summary, body_md, tickers, sectors, tags,
		       required_tier, status, published_at, generated_by, reviewed_by, created_at
		FROM terminal_research_articles
		WHERE status IN ('draft','reviewed')
		ORDER BY created_at DESC
		LIMIT 100
	`) as Article[];
}

export async function publishArticle(dbUrl: string, id: string, editorEmail: string): Promise<void> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	await sql`
		UPDATE terminal_research_articles
		SET status = 'published',
		    published_at = COALESCE(published_at, now()),
		    reviewed_by = ${editorEmail},
		    updated_at = now()
		WHERE id = ${id}
	`;
}
