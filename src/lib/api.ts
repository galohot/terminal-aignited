import type {
	BubbleNode,
	ChordData,
	GraphData,
	HeatmapData,
	SankeyData,
	TreemapNode,
} from "../components/ownership/types";
import type {
	IdxBrokerFlowHistoryResponse,
	IdxBrokerFlowParams,
	IdxBrokerFlowResponse,
	IdxSectorPerformanceResponse,
} from "../types/flow";
import type {
	BatchResponse,
	DashboardResponse,
	FinancialsResponse,
	Fundamentals,
	HeatmapResponse,
	HistoryParams,
	HistoryResponse,
	IdxBrokerSummaryResponse,
	IdxBrokersResponse,
	IdxCompaniesParams,
	IdxCompaniesResponse,
	IdxCompanyDetail,
	IdxCompanyFullResponse,
	IdxDisclosuresResponse,
	IdxEntityGroupHoldingsResponse,
	IdxEntityGroupsResponse,
	IdxFinancialSummaryResponse,
	IdxFinancialsResponse,
	IdxForeignFlowResponse,
	IdxIndexHistoryResponse,
	IdxIndicesResponse,
	IdxInsiderSearchResponse,
	IdxInsiderTransactionsResponse,
	IdxPatternsResponse,
	IdxPeersResponse,
	IdxPeersScoredResponse,
	IdxScoreCard,
	IdxScreenerParams,
	IdxScreenerResponse,
	IdxSectorsResponse,
	IdxTopConnectorsResponse,
	KseiCompanyListResponse,
	KseiCompanyResponse,
	KseiConcentrationBucket,
	KseiInvestorListResponse,
	KseiInvestorResponse,
	KseiLfSplit,
	KseiRecordsResponse,
	KseiStats,
	KseiTypeDistItem,
	MacroOverview,
	MarketBreadthResponse,
	MarketOverview,
	MoversParams,
	MoversResponse,
	NewsCategoriesResponse,
	NewsParams,
	NewsResponse,
	Quote,
	SearchResponse,
} from "../types/market";
import type {
	PaperAccount,
	PaperFill,
	PaperOrder,
	PaperPnl,
	PaperPortfolio,
	PlaceOrderRequest,
} from "../types/paper";

export interface ApiError extends Error {
	status?: number;
	retryAfter?: number;
}

const BASE = "/api/proxy";

async function fetchAPI<T>(path: string, params?: Record<string, string>): Promise<T> {
	const url = new URL(`${BASE}${path}`, window.location.origin);
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			url.searchParams.set(k, v);
		}
	}

	const res = await fetch(url.toString(), { credentials: "include" });
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: "unknown" }));
		const error = new Error((err as { message?: string }).message || `API error ${res.status}`);
		(error as ApiError).status = res.status;
		const retryAfter = res.headers.get("Retry-After");
		if (retryAfter) (error as ApiError).retryAfter = Number(retryAfter);
		throw error;
	}
	return res.json() as Promise<T>;
}

async function mutateAPI<T>(method: "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
	const url = new URL(`${BASE}${path}`, window.location.origin);
	const headers: Record<string, string> = { "X-Requested-With": "terminal" };
	if (body) headers["Content-Type"] = "application/json";
	const res = await fetch(url.toString(), {
		method,
		credentials: "include",
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: "unknown" }));
		const error = new Error((err as { message?: string }).message || `API error ${res.status}`);
		(error as ApiError).status = res.status;
		throw error;
	}
	return res.json() as Promise<T>;
}

export const api = {
	dashboard: () => fetchAPI<DashboardResponse>("/dashboard"),
	quote: (symbol: string) => fetchAPI<Quote>(`/quotes/${symbol}`),
	batchQuotes: (symbols: string[]) =>
		fetchAPI<BatchResponse>("/quotes/batch", { symbols: symbols.join(",") }),
	history: (symbol: string, params: HistoryParams) =>
		fetchAPI<HistoryResponse>(
			`/history/${symbol}`,
			Object.fromEntries(Object.entries(params).filter(([, v]) => v != null)) as Record<
				string,
				string
			>,
		),
	markets: () => fetchAPI<MarketOverview>("/markets"),
	search: (q: string) => fetchAPI<SearchResponse>("/search", { q }),
	fundamentals: (symbol: string) => fetchAPI<Fundamentals>(`/fundamentals/${symbol}`),
	financials: (symbol: string, type: string, period: string) =>
		fetchAPI<FinancialsResponse>(`/fundamentals/${symbol}/financials`, { type, period }),
	news: (params?: NewsParams) =>
		fetchAPI<NewsResponse>(
			"/news",
			params
				? Object.fromEntries(
						Object.entries(params)
							.filter(([, value]) => value != null)
							.map(([key, value]) => [key, String(value)]),
					)
				: undefined,
		),
	newsCategories: () => fetchAPI<NewsCategoriesResponse>("/news/categories"),
	/** @deprecated Use idxCompanyFull instead */
	idxCompany: (kode: string) => fetchAPI<IdxCompanyDetail>(`/idx/companies/${kode}`),
	idxCompanies: (params?: IdxCompaniesParams) =>
		fetchAPI<IdxCompaniesResponse>(
			"/idx/companies",
			params
				? (Object.fromEntries(
						Object.entries(params)
							.filter(([, v]) => v != null && v !== "")
							.map(([k, v]) => [k, String(v)]),
					) as Record<string, string>)
				: undefined,
		),
	idxBrokers: () => fetchAPI<IdxBrokersResponse>("/idx/brokers"),
	/** @deprecated Use idxFinancialSummary instead */
	idxFinancials: (kode: string) => fetchAPI<IdxFinancialsResponse>(`/idx/financials/${kode}`),
	idxIndices: () => fetchAPI<IdxIndicesResponse>("/idx/indices"),
	idxCompanyFull: (kode: string) => fetchAPI<IdxCompanyFullResponse>(`/idx/companies/${kode}/full`),
	idxFinancialSummary: (kode: string) =>
		fetchAPI<IdxFinancialSummaryResponse>(`/idx/financials/${kode}/summary`),
	/** @deprecated Peer data included in idxCompanyFull response */
	idxCompanyPeers: (kode: string) => fetchAPI<IdxPeersResponse>(`/idx/companies/${kode}/peers`),
	idxScreener: (params: IdxScreenerParams) =>
		fetchAPI<IdxScreenerResponse>(
			"/idx/screener",
			Object.fromEntries(
				Object.entries(params)
					.filter(([, v]) => v != null && v !== "")
					.map(([k, v]) => [k, String(v)]),
			) as Record<string, string>,
		),
	idxSectors: () => fetchAPI<IdxSectorsResponse>("/idx/sectors"),
	idxEntityGroups: () => fetchAPI<IdxEntityGroupsResponse>("/idx/entity-groups"),
	idxEntityGroupHoldings: (group: string) =>
		fetchAPI<IdxEntityGroupHoldingsResponse>(
			`/idx/insiders/entity-group/${encodeURIComponent(group)}`,
		),
	idxTopConnectors: (params?: { limit?: number; type?: string }) =>
		fetchAPI<IdxTopConnectorsResponse>(
			"/idx/insiders/top-connectors",
			params
				? (Object.fromEntries(
						Object.entries(params)
							.filter(([, v]) => v != null && v !== "")
							.map(([k, v]) => [k, String(v)]),
					) as Record<string, string>)
				: undefined,
		),
	idxInsiderSearch: (name: string) =>
		fetchAPI<IdxInsiderSearchResponse>("/idx/insiders/search", { name }),
	idxSectorPerformance: () => fetchAPI<IdxSectorPerformanceResponse>("/idx/sectors/performance"),
	idxBrokerFlow: (params?: IdxBrokerFlowParams) =>
		fetchAPI<IdxBrokerFlowResponse>(
			"/idx/broker-flow",
			params
				? (Object.fromEntries(
						Object.entries(params)
							.filter(([, v]) => v != null && v !== "")
							.map(([k, v]) => [k, String(v)]),
					) as Record<string, string>)
				: undefined,
		),
	idxBrokerFlowHistory: (code: string, days?: number) =>
		fetchAPI<IdxBrokerFlowHistoryResponse>(
			`/idx/broker-flow/${code}/history`,
			days ? { days: String(days) } : undefined,
		),
	idxMovers: (params: MoversParams) =>
		fetchAPI<MoversResponse>(
			"/idx/screener/movers",
			Object.fromEntries(
				Object.entries(params)
					.filter(([, v]) => v != null && v !== "")
					.map(([k, v]) => [k, String(v)]),
			) as Record<string, string>,
		),
	idxMarketBreadth: (params?: { days?: number }) =>
		fetchAPI<MarketBreadthResponse>(
			"/idx/market-breadth",
			params
				? (Object.fromEntries(
						Object.entries(params)
							.filter(([, v]) => v != null)
							.map(([k, v]) => [k, String(v)]),
					) as Record<string, string>)
				: undefined,
		),
	idxHeatmap: () => fetchAPI<HeatmapResponse>("/idx/heatmap"),
	idxBrokerSummary: (kode: string) =>
		fetchAPI<IdxBrokerSummaryResponse>(`/idx/broker-summary/${kode}`),
	idxInsiderTransactions: (kode: string) =>
		fetchAPI<IdxInsiderTransactionsResponse>(`/idx/insiders/${kode}`),
	idxIndexHistory: (name: string, days?: number) =>
		fetchAPI<IdxIndexHistoryResponse>(
			`/idx/indices/${name}/history`,
			days ? { days: String(days) } : undefined,
		),
	idxForeignFlow: (kode: string, days?: number) =>
		fetchAPI<IdxForeignFlowResponse>(
			`/idx/foreign-flow/${kode}`,
			days ? { days: String(days) } : undefined,
		),
	idxScore: (ticker: string) => fetchAPI<IdxScoreCard>(`/idx/score/${ticker}`),
	idxPeersScored: (ticker: string, limit?: number) =>
		fetchAPI<IdxPeersScoredResponse>(
			`/idx/peers/${ticker}/scored`,
			limit ? { limit: String(limit) } : undefined,
		),
	idxPatterns: (ticker: string) => fetchAPI<IdxPatternsResponse>(`/idx/patterns/${ticker}`),
	idxDisclosures: (params?: { kode?: string; limit?: number }) =>
		fetchAPI<IdxDisclosuresResponse>(
			"/idx/disclosures",
			params
				? (Object.fromEntries(
						Object.entries(params)
							.filter(([, v]) => v != null && v !== "")
							.map(([k, v]) => [k, String(v)]),
					) as Record<string, string>)
				: undefined,
		),

	// ── KSEI Ownership ──

	kseiStats: () => fetchAPI<KseiStats>("/idx/ksei/stats"),

	kseiRecords: (params: {
		page?: number;
		per_page?: number;
		sort?: string;
		order?: string;
		investor_type?: string;
		local_foreign?: string;
		kode_emiten?: string;
		investor?: string;
		min_pct?: number;
		q?: string;
	}) =>
		fetchAPI<KseiRecordsResponse>(
			"/idx/ksei/records",
			Object.fromEntries(
				Object.entries(params)
					.filter(([, v]) => v != null && v !== "" && v !== 0)
					.map(([k, v]) => [k, String(v)]),
			) as Record<string, string>,
		),

	kseiCompany: (kode: string) => fetchAPI<KseiCompanyResponse>(`/idx/ksei/company/${kode}`),

	kseiInvestor: (name: string) =>
		fetchAPI<KseiInvestorResponse>(`/idx/ksei/investor/${encodeURIComponent(name)}`),

	kseiTypeDistribution: () => fetchAPI<KseiTypeDistItem[]>("/idx/ksei/type-distribution"),

	kseiLocalForeign: () => fetchAPI<KseiLfSplit>("/idx/ksei/local-foreign"),

	kseiConcentration: () => fetchAPI<KseiConcentrationBucket[]>("/idx/ksei/concentration"),

	kseiHeatmap: (top = 40) => fetchAPI<HeatmapData>("/idx/ksei/heatmap", { top: String(top) }),

	kseiChord: () => fetchAPI<ChordData>("/idx/ksei/chord"),

	kseiGraph: (params: { min?: number; types?: string; lf?: string }) =>
		fetchAPI<GraphData>(
			"/idx/ksei/graph",
			Object.fromEntries(
				Object.entries({
					min_connections: params.min ? String(params.min) : undefined,
					types: params.types || undefined,
					lf: params.lf || undefined,
				})
					.filter(([, v]) => v != null)
					.map(([k, v]) => [k, v as string]),
			) as Record<string, string>,
		),

	kseiClusters: () => fetchAPI<BubbleNode>("/idx/ksei/clusters"),

	kseiSankey: () => fetchAPI<SankeyData>("/idx/ksei/sankey"),

	kseiTreemap: (kode: string) => fetchAPI<TreemapNode>(`/idx/ksei/treemap/${kode}`),

	// ── Macro ──
	macroOverview: () => fetchAPI<MacroOverview>("/macro/overview"),

	kseiCompanies: (params: {
		page?: number;
		per_page?: number;
		sort?: string;
		order?: string;
		search?: string;
	}) =>
		fetchAPI<KseiCompanyListResponse>(
			"/idx/ksei/companies",
			Object.fromEntries(
				Object.entries(params)
					.filter(([, v]) => v != null && v !== "")
					.map(([k, v]) => [k, String(v)]),
			) as Record<string, string>,
		),

	kseiInvestors: (params: {
		page?: number;
		per_page?: number;
		sort?: string;
		order?: string;
		search?: string;
		investor_type?: string;
		local_foreign?: string;
	}) =>
		fetchAPI<KseiInvestorListResponse>(
			"/idx/ksei/investors",
			Object.fromEntries(
				Object.entries(params)
					.filter(([, v]) => v != null && v !== "")
					.map(([k, v]) => [k, String(v)]),
			) as Record<string, string>,
		),

	// ── Paper trading (requires auth session) ──
	paperPortfolio: () => fetchAPI<PaperPortfolio>("/paper/portfolio"),
	paperOrders: (status?: string) =>
		fetchAPI<PaperOrder[]>("/paper/orders", status ? { status } : undefined),
	paperFills: (limit?: number) =>
		fetchAPI<PaperFill[]>("/paper/fills", limit ? { limit: String(limit) } : undefined),
	paperPnl: (range = "all") => fetchAPI<PaperPnl>("/paper/pnl", { range }),
	paperInitAccount: () => mutateAPI<PaperAccount>("POST", "/paper/account/init"),
	paperResetAccount: () => mutateAPI<PaperAccount>("POST", "/paper/account/reset"),
	paperPlaceOrder: (req: PlaceOrderRequest) => mutateAPI<PaperOrder>("POST", "/paper/orders", req),
	paperCancelOrder: (id: number) => mutateAPI<PaperOrder>("DELETE", `/paper/orders/${id}`),
};

// --- Research (Worker-native routes, not proxied to market-api) ---

export type ResearchType =
	| "am_brief"
	| "deep_dive"
	| "sector"
	| "earnings_preview"
	| "earnings_recap"
	| "power_map"
	| "macro";

export interface ResearchArticle {
	id: string;
	slug: string;
	type: ResearchType;
	title: string;
	summary: string;
	body_md: string;
	tickers: string[];
	sectors: string[];
	tags: string[];
	required_tier: "starter" | "pro" | "institutional";
	status: "draft" | "reviewed" | "published" | "archived";
	published_at: string | null;
	generated_by: string | null;
	reviewed_by: string | null;
	created_at: string;
}

async function fetchWorker<T>(path: string, params?: Record<string, string>): Promise<T> {
	const url = new URL(path, window.location.origin);
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			if (v) url.searchParams.set(k, v);
		}
	}
	const res = await fetch(url.toString(), { credentials: "include" });
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: "unknown" }));
		const error = new Error((err as { message?: string }).message || `API error ${res.status}`);
		(error as ApiError).status = res.status;
		throw error;
	}
	return res.json() as Promise<T>;
}

async function postWorker<T>(path: string, body?: unknown): Promise<T> {
	const headers: Record<string, string> = { "X-Requested-With": "terminal" };
	if (body) headers["Content-Type"] = "application/json";
	const res = await fetch(path, {
		method: "POST",
		credentials: "include",
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: "unknown" }));
		const error = new Error((err as { message?: string }).message || `API error ${res.status}`);
		(error as ApiError).status = res.status;
		throw error;
	}
	return res.json() as Promise<T>;
}

export const research = {
	list: (params?: {
		type?: ResearchType;
		ticker?: string;
		tag?: string;
		limit?: number;
		offset?: number;
	}) =>
		fetchWorker<{ items: ResearchArticle[]; total: number }>(
			"/api/research/list",
			params
				? Object.fromEntries(
						Object.entries(params)
							.filter(([, v]) => v != null && v !== "")
							.map(([k, v]) => [k, String(v)]),
					)
				: undefined,
		),
	get: (slug: string) =>
		fetchWorker<{ article: ResearchArticle; gated: boolean }>(
			`/api/research/article/${encodeURIComponent(slug)}`,
		),
	adminDrafts: () => fetchWorker<{ items: ResearchArticle[] }>("/api/admin/research/drafts"),
	adminUpsert: (
		input: Partial<ResearchArticle> & {
			slug: string;
			type: ResearchType;
			title: string;
			summary: string;
			body_md: string;
		},
	) => postWorker<{ article: ResearchArticle }>("/api/admin/research/upsert", input),
	adminPublish: (id: string) => postWorker<{ ok: boolean }>(`/api/admin/research/publish/${id}`),
	adminGenerateAmBrief: () =>
		postWorker<{ ok: boolean; slug?: string; error?: string }>(
			"/api/admin/research/generate-am-brief",
		),
	adminGenerateDeepDive: (ticker: string) =>
		postWorker<{ ok: boolean; slug?: string; error?: string }>(
			"/api/admin/research/generate-deep-dive",
			{ ticker },
		),
	adminGenerateEarningsPreview: (ticker: string) =>
		postWorker<{ ok: boolean; slug?: string; error?: string }>(
			"/api/admin/research/generate-earnings-preview",
			{ ticker },
		),
	getSubscription: () =>
		fetchWorker<{ user_id: string; email_enabled: boolean; types: ResearchType[] }>(
			"/api/research/subscriptions",
		),
	updateSubscription: (patch: { email_enabled?: boolean; types?: ResearchType[] }) =>
		postWorker<{ user_id: string; email_enabled: boolean; types: ResearchType[] }>(
			"/api/research/subscriptions",
			patch,
		),
};

// Public handle for the Telegram research channel. Update when a username is set.
// TODO: wire via env var from the worker once the channel has a public @ handle.
export const TELEGRAM_CHANNEL_URL: string | null = null;

// --- Journal ---
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

async function deleteWorker<T>(path: string): Promise<T> {
	const res = await fetch(path, {
		method: "DELETE",
		credentials: "include",
		headers: { "X-Requested-With": "terminal" },
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: "unknown" }));
		const error = new Error((err as { message?: string }).message || `API error ${res.status}`);
		(error as ApiError).status = res.status;
		throw error;
	}
	return res.json() as Promise<T>;
}

async function patchWorker<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(path, {
		method: "PATCH",
		credentials: "include",
		headers: { "Content-Type": "application/json", "X-Requested-With": "terminal" },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: "unknown" }));
		const error = new Error((err as { message?: string }).message || `API error ${res.status}`);
		(error as ApiError).status = res.status;
		throw error;
	}
	return res.json() as Promise<T>;
}

export const journal = {
	list: (params?: { order_id?: number; ticker?: string; kind?: JournalKind; limit?: number }) =>
		fetchWorker<{ items: JournalEntry[]; total: number }>(
			"/api/journal/entries",
			params
				? Object.fromEntries(
						Object.entries(params)
							.filter(([, v]) => v != null && v !== "")
							.map(([k, v]) => [k, String(v)]),
					)
				: undefined,
		),
	create: (input: {
		kind: JournalKind;
		body_md: string;
		order_id?: number | null;
		ticker?: string | null;
		tags?: string[];
		research_article_id?: string | null;
	}) => postWorker<{ entry: JournalEntry }>("/api/journal/entries", input),
	update: (
		id: string,
		patch: {
			body_md?: string;
			kind?: JournalKind;
			tags?: string[];
			research_article_id?: string | null;
		},
	) => patchWorker<{ entry: JournalEntry }>(`/api/journal/entries/${id}`, patch),
	remove: (id: string) => deleteWorker<{ ok: boolean }>(`/api/journal/entries/${id}`),
};

// --- Agent: persistent threads + personas ---

export interface AgentPersona {
	id: string;
	name: string;
	description: string;
	user_id?: string | null;
	system_prompt?: string;
}

export interface PersonaInput {
	name: string;
	description?: string;
	system_prompt: string;
}

export interface AgentThread {
	id: string;
	user_id: string;
	title: string;
	persona_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface AgentStoredMessage {
	id: string;
	thread_id: string;
	role: "user" | "assistant";
	content: unknown;
	created_at: string;
}

export const agent = {
	listPersonas: () => fetchWorker<{ personas: AgentPersona[] }>("/api/agent/personas"),
	createPersona: (input: PersonaInput) =>
		postWorker<{ persona: AgentPersona }>("/api/agent/personas", input),
	updatePersona: (id: string, patch: Partial<PersonaInput>) =>
		patchWorker<{ persona: AgentPersona }>(`/api/agent/personas/${encodeURIComponent(id)}`, patch),
	deletePersona: (id: string) =>
		deleteWorker<{ ok: boolean }>(`/api/agent/personas/${encodeURIComponent(id)}`),
	listThreads: () => fetchWorker<{ threads: AgentThread[] }>("/api/agent/threads"),
	createThread: (input: { personaId?: string | null; title?: string } = {}) =>
		postWorker<{ thread: AgentThread }>("/api/agent/threads", input),
	getThread: (id: string) =>
		fetchWorker<{ thread: AgentThread; messages: AgentStoredMessage[] }>(
			`/api/agent/thread/${encodeURIComponent(id)}`,
		),
	updateThread: (id: string, patch: { title?: string; personaId?: string | null }) =>
		patchWorker<{ thread: AgentThread }>(`/api/agent/thread/${encodeURIComponent(id)}`, patch),
	deleteThread: (id: string) =>
		deleteWorker<{ ok: boolean }>(`/api/agent/thread/${encodeURIComponent(id)}`),
};
