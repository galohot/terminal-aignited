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
	IdxPeersResponse,
	IdxScreenerParams,
	IdxScreenerResponse,
	IdxSectorsResponse,
	IdxTopConnectorsResponse,
	KseiCompanyListResponse,
	KseiCompanyResponse,
	KseiInvestorResponse,
	KseiConcentrationBucket,
	KseiInvestorListResponse,
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
	BubbleNode,
	ChordData,
	GraphData,
	HeatmapData,
	SankeyData,
	TreemapNode,
} from "../components/ownership/types";

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

	const res = await fetch(url.toString());
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

	kseiHeatmap: (top = 40) =>
		fetchAPI<HeatmapData>("/idx/ksei/heatmap", { top: String(top) }),

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
		page?: number; per_page?: number; sort?: string; order?: string; search?: string;
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
		page?: number; per_page?: number; sort?: string; order?: string;
		search?: string; investor_type?: string; local_foreign?: string;
	}) =>
		fetchAPI<KseiInvestorListResponse>(
			"/idx/ksei/investors",
			Object.fromEntries(
				Object.entries(params)
					.filter(([, v]) => v != null && v !== "")
					.map(([k, v]) => [k, String(v)]),
			) as Record<string, string>,
		),
};
