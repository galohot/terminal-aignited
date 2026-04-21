// Exclusive financial research — list/detail/admin endpoints + paywall logic.
// Schema lives in AUTH_DATABASE_URL alongside terminal_users/terminal_subscriptions.
// Auto-migrates on first hit (idempotent IF NOT EXISTS).

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { type Tier, tierMeets } from "./lib/tier";

export { tierMeets };
export type { Tier };

type Sql = NeonQueryFunction<false, false>;
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
	await sql`
		CREATE TABLE IF NOT EXISTS terminal_research_subscriptions (
			user_id TEXT PRIMARY KEY REFERENCES terminal_users(id) ON DELETE CASCADE,
			email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
			types TEXT[] NOT NULL DEFAULT ARRAY['am_brief']::TEXT[],
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`;
	await sql`CREATE INDEX IF NOT EXISTS idx_tr_subs_email_enabled ON terminal_research_subscriptions (email_enabled) WHERE email_enabled = TRUE`;
	schemaReady = true;
}

// ---- Subscriptions ----------------------------------------------------

export interface Subscription {
	user_id: string;
	email_enabled: boolean;
	types: ArticleType[];
}

export async function getSubscription(
	dbUrl: string,
	userId: string,
): Promise<Subscription> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const rows = (await sql`
		SELECT user_id, email_enabled, types
		FROM terminal_research_subscriptions
		WHERE user_id = ${userId}
	`) as Subscription[];
	return rows[0] ?? { user_id: userId, email_enabled: false, types: ["am_brief"] };
}

export async function upsertSubscription(
	dbUrl: string,
	userId: string,
	patch: { email_enabled?: boolean; types?: ArticleType[] },
): Promise<Subscription> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const rows = (await sql`
		INSERT INTO terminal_research_subscriptions (user_id, email_enabled, types)
		VALUES (
			${userId},
			${patch.email_enabled ?? false},
			${patch.types ?? ["am_brief"]}
		)
		ON CONFLICT (user_id) DO UPDATE SET
			email_enabled = COALESCE(${patch.email_enabled ?? null}, terminal_research_subscriptions.email_enabled),
			types = COALESCE(${patch.types ?? null}, terminal_research_subscriptions.types),
			updated_at = now()
		RETURNING user_id, email_enabled, types
	`) as Subscription[];
	return rows[0];
}

// Returns list of {user_id, email} for users opted-in to email delivery for a given type.
// Joins users → subscriptions → subscriptions.status to ensure only Pro+ get gated content.
export async function listEmailSubscribersForType(
	dbUrl: string,
	type: ArticleType,
): Promise<Array<{ user_id: string; email: string; name: string | null }>> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);
	const rows = (await sql`
		SELECT u.id AS user_id, u.email, u.name
		FROM terminal_research_subscriptions s
		JOIN terminal_users u ON u.id = s.user_id
		LEFT JOIN terminal_subscriptions sub
			ON sub.user_id = u.id
			AND sub.status = 'active'
			AND (sub.expires_at IS NULL OR sub.expires_at > now())
		WHERE s.email_enabled = TRUE
		  AND ${type} = ANY(s.types)
		  AND (sub.tier IN ('pro','institutional') OR u.email IN ('irwndedi@gmail.com','rivsyah@gmail.com','biroumumkemlu@gmail.com'))
	`) as Array<{ user_id: string; email: string; name: string | null }>;
	return rows;
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

// ---- Agent-facing search -----------------------------------------------

export interface SearchHit {
	id: string;
	slug: string;
	type: ArticleType;
	title: string;
	summary: string;
	tickers: string[];
	sectors: string[];
	tags: string[];
	required_tier: Tier;
	published_at: string | null;
	gated: boolean;
}

export interface SearchParams {
	query?: string;
	tickers?: string[];
	sectors?: string[];
	type?: ArticleType;
	limit?: number;
	viewerTier?: Tier | null;
}

export async function searchArticles(
	dbUrl: string,
	params: SearchParams,
): Promise<SearchHit[]> {
	const sql = neon(dbUrl);
	await ensureSchema(sql);

	const limit = Math.min(Math.max(params.limit ?? 10, 1), 25);
	// Postgres tagged templates don't support dynamic arrays-of-strings cleanly alongside
	// conditional filters, so wrap each optional predicate in a `(null arg OR match)` form.
	const query = params.query?.trim() || null;
	const likeTerm = query ? `%${query.replace(/[%_\\]/g, (c) => `\\${c}`)}%` : null;
	const tickers = params.tickers && params.tickers.length > 0 ? params.tickers : null;
	const sectors = params.sectors && params.sectors.length > 0 ? params.sectors : null;
	const type = params.type ?? null;

	const rows = (await sql`
		SELECT id, slug, type, title, summary, tickers, sectors, tags, required_tier, published_at
		FROM terminal_research_articles
		WHERE status = 'published'
		  AND (${likeTerm}::text IS NULL OR title ILIKE ${likeTerm} OR summary ILIKE ${likeTerm} OR body_md ILIKE ${likeTerm})
		  AND (${tickers}::text[] IS NULL OR tickers && ${tickers}::text[])
		  AND (${sectors}::text[] IS NULL OR sectors && ${sectors}::text[])
		  AND (${type}::text IS NULL OR type = ${type})
		ORDER BY published_at DESC NULLS LAST
		LIMIT ${limit}
	`) as Array<{
		id: string;
		slug: string;
		type: ArticleType;
		title: string;
		summary: string;
		tickers: string[];
		sectors: string[];
		tags: string[];
		required_tier: Tier;
		published_at: string | null;
	}>;

	const viewer = params.viewerTier ?? null;
	return rows.map((r) => ({
		...r,
		gated: !tierMeets(viewer, r.required_tier),
	}));
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
