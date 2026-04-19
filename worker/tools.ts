// Tool registry for the terminal agent.
// Schemas use Anthropic tool-use format (Kimi's native); converted to OpenAI function
// schemas at the GLM adapter layer in worker/llm.ts.

import {
	createEntry as journalCreate,
	type JournalKind,
	searchEntries as journalSearch,
} from "./journal";
import { type ArticleType, searchArticles } from "./research";

export interface ToolCtx {
	userId: string | null;
	tier: "starter" | "pro" | "institutional" | null;
	apiBase: string;
	apiKey: string;
	authDbUrl: string;
}

export type ToolResult =
	| { ok: true; data: unknown }
	| { ok: false; error: string; message: string };

export interface Tool {
	name: string;
	description: string;
	input_schema: {
		type: "object";
		properties: Record<string, unknown>;
		required?: string[];
	};
	dispatch: (args: Record<string, unknown>, ctx: ToolCtx) => Promise<ToolResult>;
}

const TRADE_TOOLS = new Set([
	"get_portfolio",
	"get_orders",
	"place_order",
	"cancel_order",
	"get_pnl",
	"get_trade_history",
	"journal_entry_add",
	"journal_search",
]);

// --- Helpers --------------------------------------------------------------

async function marketApiFetch(
	method: string,
	path: string,
	ctx: ToolCtx,
	opts: { body?: unknown; query?: Record<string, string | number | undefined> } = {},
): Promise<ToolResult> {
	const url = new URL(path.replace(/^\//, ""), `${ctx.apiBase.replace(/\/?$/, "/")}`);
	if (opts.query) {
		for (const [k, v] of Object.entries(opts.query)) {
			if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
		}
	}
	const headers: Record<string, string> = {
		"X-API-Key": ctx.apiKey,
		"Content-Type": "application/json",
	};
	if (ctx.userId) headers["X-User-Id"] = ctx.userId;

	const res = await fetch(url.toString(), {
		method,
		headers,
		body: opts.body ? JSON.stringify(opts.body) : undefined,
	});
	const text = await res.text();
	let body: unknown;
	try {
		body = text ? JSON.parse(text) : null;
	} catch {
		body = text;
	}
	if (!res.ok) {
		const errBody = body as { message?: string; error?: string } | string | null;
		const message =
			typeof errBody === "object" && errBody && "message" in errBody
				? String(errBody.message)
				: typeof errBody === "string"
					? errBody
					: `HTTP ${res.status}`;
		const errorCode =
			typeof errBody === "object" && errBody && "error" in errBody
				? String(errBody.error)
				: `HTTP_${res.status}`;
		return { ok: false, error: errorCode, message };
	}
	return { ok: true, data: body };
}

function requireString(args: Record<string, unknown>, key: string): string {
	const v = args[key];
	if (typeof v !== "string" || !v) throw new Error(`Missing required argument: ${key}`);
	return v;
}

function optionalNumber(args: Record<string, unknown>, key: string): number | undefined {
	const v = args[key];
	if (v === undefined || v === null) return undefined;
	if (typeof v === "number") return v;
	const n = Number(v);
	return Number.isFinite(n) ? n : undefined;
}

function optionalString(args: Record<string, unknown>, key: string): string | undefined {
	const v = args[key];
	return typeof v === "string" && v ? v : undefined;
}

// --- Research tools (10) --------------------------------------------------

const researchTools: Tool[] = [
	{
		name: "get_quote",
		description:
			"Fetch the latest quote for a ticker (last price, change, volume, market state). Use at the start of most analyses. IDX tickers end with `.JK` (e.g. BBCA.JK, TLKM.JK). Indices: ^JKSE for Jakarta Composite.",
		input_schema: {
			type: "object",
			properties: { ticker: { type: "string", description: "Ticker symbol, e.g. BBCA.JK" } },
			required: ["ticker"],
		},
		dispatch: (args, ctx) =>
			marketApiFetch(
				"GET",
				`/api/v1/quotes/${encodeURIComponent(requireString(args, "ticker"))}`,
				ctx,
			),
	},
	{
		name: "get_company",
		description:
			"IDX company profile and latest fundamentals (sector, industry, market cap, PE, PB, ROE, ROA). Accepts bare kode like 'BBCA' or 'BBCA.JK'. Use once per company you're analyzing.",
		input_schema: {
			type: "object",
			properties: { ticker: { type: "string" } },
			required: ["ticker"],
		},
		dispatch: (args, ctx) => {
			const raw = requireString(args, "ticker").toUpperCase().replace(/\.JK$/, "");
			return marketApiFetch("GET", `/api/v1/idx/companies/${encodeURIComponent(raw)}`, ctx);
		},
	},
	{
		name: "get_financials",
		description:
			"Latest reported financials summary for an IDX company (revenue, net income, assets, equity, multi-year series). Use when evaluating fundamentals or trends.",
		input_schema: {
			type: "object",
			properties: { ticker: { type: "string" } },
			required: ["ticker"],
		},
		dispatch: (args, ctx) => {
			const raw = requireString(args, "ticker").toUpperCase().replace(/\.JK$/, "");
			return marketApiFetch(
				"GET",
				`/api/v1/idx/financials/${encodeURIComponent(raw)}/summary`,
				ctx,
			);
		},
	},
	{
		name: "get_broker_flow",
		description:
			"Per-broker net buy/sell volume for an IDX ticker (top brokers by flow). Identifies accumulation or distribution by specific brokerage houses (e.g. MS, UBS, CS foreign brokers vs local houses). Use when investigating who is driving price action.",
		input_schema: {
			type: "object",
			properties: {
				ticker: { type: "string" },
				days: { type: "integer", description: "Lookback days, default 30" },
			},
			required: ["ticker"],
		},
		dispatch: (args, ctx) => {
			const raw = requireString(args, "ticker").toUpperCase().replace(/\.JK$/, "");
			return marketApiFetch("GET", `/api/v1/idx/broker-summary/${encodeURIComponent(raw)}`, ctx, {
				query: { days: optionalNumber(args, "days") ?? 30 },
			});
		},
	},
	{
		name: "get_foreign_flow",
		description:
			"Foreign vs local net flow for an IDX ticker over recent days. Positive values = foreign accumulation. Strong foreign flow often precedes trend moves on IDX. Use for flow-based conviction.",
		input_schema: {
			type: "object",
			properties: {
				ticker: { type: "string" },
				days: { type: "integer", description: "Lookback days, default 30" },
			},
			required: ["ticker"],
		},
		dispatch: (args, ctx) => {
			const raw = requireString(args, "ticker").toUpperCase().replace(/\.JK$/, "");
			return marketApiFetch("GET", `/api/v1/idx/foreign-flow/${encodeURIComponent(raw)}`, ctx, {
				query: { days: optionalNumber(args, "days") ?? 30 },
			});
		},
	},
	{
		name: "get_insiders",
		description:
			"Insider/commissioner/director holdings for an IDX company. Use when you want to see ownership concentration or recent insider transactions.",
		input_schema: {
			type: "object",
			properties: { ticker: { type: "string" } },
			required: ["ticker"],
		},
		dispatch: (args, ctx) => {
			const raw = requireString(args, "ticker").toUpperCase().replace(/\.JK$/, "");
			return marketApiFetch("GET", `/api/v1/idx/insiders/${encodeURIComponent(raw)}`, ctx);
		},
	},
	{
		name: "get_disclosures",
		description:
			"Recent IDX disclosures (corporate actions, announcements) for a ticker. Use when checking for material events that might explain price action.",
		input_schema: {
			type: "object",
			properties: {
				ticker: { type: "string" },
				n: { type: "integer", description: "Max results, default 10" },
			},
			required: ["ticker"],
		},
		dispatch: (args, ctx) => {
			const raw = requireString(args, "ticker").toUpperCase().replace(/\.JK$/, "");
			return marketApiFetch("GET", `/api/v1/idx/disclosures`, ctx, {
				query: { kode: raw, limit: optionalNumber(args, "n") ?? 10 },
			});
		},
	},
	{
		name: "screen",
		description:
			"Screen IDX stocks by fundamentals. Filters: sector, min_mcap (IDR), max_pe, min_roe (pct). Use to surface candidates by criteria.",
		input_schema: {
			type: "object",
			properties: {
				sector: { type: "string" },
				min_mcap: { type: "number" },
				max_pe: { type: "number" },
				min_roe: { type: "number" },
				limit: { type: "integer", description: "Default 25" },
			},
		},
		dispatch: (args, ctx) =>
			marketApiFetch("GET", `/api/v1/idx/screener`, ctx, {
				query: {
					sector: optionalString(args, "sector"),
					min_mcap: optionalNumber(args, "min_mcap"),
					max_pe: optionalNumber(args, "max_pe"),
					min_roe: optionalNumber(args, "min_roe"),
					limit: optionalNumber(args, "limit") ?? 25,
				},
			}),
	},
	{
		name: "get_news",
		description:
			"Recent news headlines. Pass ticker to scope to a single company, or omit for broad market news. Use when researching catalysts.",
		input_schema: {
			type: "object",
			properties: {
				ticker: { type: "string" },
				n: { type: "integer", description: "Default 10" },
			},
		},
		dispatch: (args, ctx) =>
			marketApiFetch("GET", `/api/v1/news`, ctx, {
				query: {
					ticker: optionalString(args, "ticker"),
					limit: optionalNumber(args, "n") ?? 10,
				},
			}),
	},
	{
		name: "get_price_history",
		description:
			"OHLCV price history. Ranges: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y. Use for chart-based reasoning and technical levels.",
		input_schema: {
			type: "object",
			properties: {
				ticker: { type: "string" },
				range: {
					type: "string",
					enum: ["1d", "5d", "1mo", "3mo", "6mo", "1y", "5y"],
				},
			},
			required: ["ticker", "range"],
		},
		dispatch: (args, ctx) =>
			marketApiFetch(
				"GET",
				`/api/v1/history/${encodeURIComponent(requireString(args, "ticker"))}`,
				ctx,
				{ query: { range: requireString(args, "range") } },
			),
	},
	{
		name: "research_search",
		description:
			"Search AIgnited Research articles (AM briefs, deep dives, sector notes, earnings previews). Use BEFORE making fundamental claims so your answer can cite recent in-house research. Returns the hits with slugs the user can open at /research/<slug>. Filter by `query` (free text across title/summary/body), `tickers` (e.g. [\"BBCA\",\"BBRI\"]), `sectors`, or `type`. Each hit has a `gated` flag — gated=true means the user's current tier can't read the full body.",
		input_schema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description:
						"Free-text search across title, summary, and body. Short keywords work best (e.g. 'foreign flow banks').",
				},
				tickers: {
					type: "array",
					items: { type: "string" },
					description: "Ticker symbols to filter on (match ANY). Bare kode like 'BBCA', not 'BBCA.JK'.",
				},
				sectors: {
					type: "array",
					items: { type: "string" },
					description: "Sector names to filter on (match ANY).",
				},
				type: {
					type: "string",
					enum: [
						"am_brief",
						"deep_dive",
						"sector",
						"earnings_preview",
						"earnings_recap",
						"power_map",
						"macro",
					],
					description: "Restrict to a single article type.",
				},
				limit: {
					type: "integer",
					minimum: 1,
					maximum: 25,
					description: "Max hits to return. Default 10.",
				},
			},
		},
		dispatch: async (args, ctx) => {
			const q = typeof args.query === "string" ? args.query : undefined;
			const tickers = Array.isArray(args.tickers)
				? args.tickers.filter((v): v is string => typeof v === "string" && v.length > 0)
				: undefined;
			const sectors = Array.isArray(args.sectors)
				? args.sectors.filter((v): v is string => typeof v === "string" && v.length > 0)
				: undefined;
			const type = typeof args.type === "string" ? (args.type as ArticleType) : undefined;
			const limit = typeof args.limit === "number" ? args.limit : undefined;

			const hits = await searchArticles(ctx.authDbUrl, {
				query: q,
				tickers,
				sectors,
				type,
				limit,
				viewerTier: ctx.tier,
			});
			return { ok: true, data: { hits, count: hits.length } };
		},
	},
];

// --- Trade tools (6) ------------------------------------------------------

const tradeTools: Tool[] = [
	{
		name: "get_portfolio",
		description:
			"Current paper portfolio: cash, positions with live mark-to-market, unrealized/realized P&L, total equity, return pct.",
		input_schema: { type: "object", properties: {} },
		dispatch: (_args, ctx) => marketApiFetch("GET", `/api/v1/paper/portfolio`, ctx),
	},
	{
		name: "get_orders",
		description:
			"List paper orders. Filter by status: 'open', 'filled', 'cancelled'. Use to check what's pending or recently executed.",
		input_schema: {
			type: "object",
			properties: {
				status: { type: "string", enum: ["open", "filled", "cancelled"] },
				limit: { type: "integer", description: "Default 20" },
			},
		},
		dispatch: (args, ctx) =>
			marketApiFetch("GET", `/api/v1/paper/orders`, ctx, {
				query: {
					status: optionalString(args, "status"),
					limit: optionalNumber(args, "limit") ?? 20,
				},
			}),
	},
	{
		name: "place_order",
		description:
			"Place a paper trading order. IDX lot size = 100 shares. For market orders outside trading hours, the order is queued and fills on the next matching tick during 09:00–12:00 or 13:30–15:50 WIB. Prefer limit orders when the user has a price target.",
		input_schema: {
			type: "object",
			properties: {
				ticker: { type: "string", description: "IDX ticker with .JK suffix, e.g. BBCA.JK" },
				side: { type: "string", enum: ["buy", "sell"] },
				qty_lots: { type: "integer", description: "Number of lots (1 lot = 100 shares), 1–10000" },
				order_type: { type: "string", enum: ["market", "limit"] },
				limit_price_idr: {
					type: "integer",
					description: "Required for limit orders. IDR per share.",
				},
			},
			required: ["ticker", "side", "qty_lots", "order_type"],
		},
		dispatch: (args, ctx) =>
			marketApiFetch("POST", `/api/v1/paper/orders`, ctx, {
				body: {
					ticker: requireString(args, "ticker"),
					side: requireString(args, "side"),
					qty_lots: optionalNumber(args, "qty_lots"),
					order_type: requireString(args, "order_type"),
					limit_price_idr: optionalNumber(args, "limit_price_idr") ?? null,
				},
			}),
	},
	{
		name: "cancel_order",
		description: "Cancel an open paper order by its numeric id.",
		input_schema: {
			type: "object",
			properties: { order_id: { type: "integer" } },
			required: ["order_id"],
		},
		dispatch: (args, ctx) => {
			const id = optionalNumber(args, "order_id");
			if (id === undefined) throw new Error("order_id required");
			return marketApiFetch("DELETE", `/api/v1/paper/orders/${id}`, ctx);
		},
	},
	{
		name: "get_pnl",
		description:
			"Paper P&L snapshot. Returns realized, unrealized, total return pct, and equity curve points for the requested range.",
		input_schema: {
			type: "object",
			properties: {
				range: { type: "string", enum: ["1d", "1w", "1m", "all"], description: "Default 'all'" },
			},
		},
		dispatch: (args, ctx) =>
			marketApiFetch("GET", `/api/v1/paper/pnl`, ctx, {
				query: { range: optionalString(args, "range") ?? "all" },
			}),
	},
	{
		name: "get_trade_history",
		description:
			"Recent paper trade fills (executed trades) with price, qty, fee. Use to review past activity.",
		input_schema: {
			type: "object",
			properties: {
				limit: { type: "integer", description: "Default 20" },
				ticker: { type: "string", description: "Optional ticker filter" },
			},
		},
		dispatch: (args, ctx) =>
			marketApiFetch("GET", `/api/v1/paper/fills`, ctx, {
				query: {
					limit: optionalNumber(args, "limit") ?? 20,
					ticker: optionalString(args, "ticker"),
				},
			}),
	},
];

// --- Journal tools --------------------------------------------------------

const journalTools: Tool[] = [
	{
		name: "journal_entry_add",
		description:
			"Log a trade thesis, post-mortem, or free-form note into the user's paper-trading journal. Use `entry` kind when logging reasoning for an open/new position, `exit` for a close/post-mortem, or `note` for general market thoughts. Optionally tie to an order_id (numeric paper order) or a ticker.",
		input_schema: {
			type: "object",
			properties: {
				kind: {
					type: "string",
					enum: ["entry", "exit", "note"],
					description: "entry = thesis for a new position; exit = post-mortem; note = general.",
				},
				body_md: { type: "string", description: "Journal body in markdown." },
				ticker: { type: "string", description: "Optional IDX ticker (no .JK suffix)." },
				order_id: { type: "integer", description: "Optional paper order id." },
				tags: {
					type: "array",
					items: { type: "string" },
					description: "Optional lowercase tags.",
				},
			},
			required: ["kind", "body_md"],
		},
		dispatch: async (args, ctx) => {
			if (!ctx.userId) {
				return { ok: false, error: "AUTH_REQUIRED", message: "Sign-in required." };
			}
			const kind = requireString(args, "kind") as JournalKind;
			if (!["entry", "exit", "note"].includes(kind)) {
				return { ok: false, error: "INVALID_KIND", message: "kind must be entry|exit|note" };
			}
			const body_md = requireString(args, "body_md");
			const tagsRaw = Array.isArray(args.tags) ? (args.tags as unknown[]) : [];
			const tags = tagsRaw.filter((t): t is string => typeof t === "string");
			const entry = await journalCreate(ctx.authDbUrl, ctx.userId, {
				kind,
				body_md,
				ticker: optionalString(args, "ticker") ?? null,
				order_id: optionalNumber(args, "order_id") ?? null,
				tags,
			});
			return { ok: true, data: { id: entry.id, created_at: entry.created_at } };
		},
	},
	{
		name: "journal_search",
		description:
			"Search the user's paper-trading journal for past entries by keyword, tag, or ticker. Use when asked about prior trades, theses, or mistakes.",
		input_schema: {
			type: "object",
			properties: {
				query: { type: "string", description: "Keyword, tag, or ticker to search for." },
				limit: { type: "integer", description: "Max results (default 10, max 30)." },
			},
			required: ["query"],
		},
		dispatch: async (args, ctx) => {
			if (!ctx.userId) {
				return { ok: false, error: "AUTH_REQUIRED", message: "Sign-in required." };
			}
			const query = requireString(args, "query");
			const limit = optionalNumber(args, "limit") ?? 10;
			const results = await journalSearch(ctx.authDbUrl, ctx.userId, query, limit);
			return {
				ok: true,
				data: results.map((r) => ({
					id: r.id,
					kind: r.kind,
					ticker: r.ticker,
					order_id: r.order_id,
					tags: r.tags,
					body_md: r.body_md,
					created_at: r.created_at,
				})),
			};
		},
	},
];

// --- Registry + dispatcher ------------------------------------------------

export const ALL_TOOLS: Tool[] = [...researchTools, ...tradeTools, ...journalTools];
export const RESEARCH_TOOLS: Tool[] = researchTools;

const BY_NAME: Record<string, Tool> = Object.fromEntries(ALL_TOOLS.map((t) => [t.name, t]));

export function toolsForTier(tier: ToolCtx["tier"]): Tool[] {
	return tier ? ALL_TOOLS : researchTools;
}

export async function dispatchTool(
	name: string,
	rawArgs: unknown,
	ctx: ToolCtx,
): Promise<ToolResult> {
	const tool = BY_NAME[name];
	if (!tool) return { ok: false, error: "UNKNOWN_TOOL", message: `Unknown tool: ${name}` };
	if (TRADE_TOOLS.has(name) && !ctx.tier) {
		return {
			ok: false,
			error: "UPGRADE_REQUIRED",
			message: "Trading tools require an active subscription (Starter or higher).",
		};
	}
	const args = (rawArgs && typeof rawArgs === "object" ? rawArgs : {}) as Record<string, unknown>;
	try {
		return await tool.dispatch(args, ctx);
	} catch (e) {
		return { ok: false, error: "TOOL_ERROR", message: e instanceof Error ? e.message : String(e) };
	}
}
