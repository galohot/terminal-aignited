import type {
	BatchResponse,
	DashboardResponse,
	FinancialsResponse,
	Fundamentals,
	HistoryParams,
	HistoryResponse,
	IdxBrokersResponse,
	IdxCompaniesParams,
	IdxCompaniesResponse,
	IdxCompanyDetail,
	IdxCompanyFullResponse,
	IdxEntityGroupHoldingsResponse,
	IdxEntityGroupsResponse,
	IdxFinancialSummaryResponse,
	IdxFinancialsResponse,
	IdxIndicesResponse,
	IdxInsiderSearchResponse,
	IdxPeersResponse,
	IdxScreenerParams,
	IdxScreenerResponse,
	IdxSectorsResponse,
	IdxTopConnectorsResponse,
	MarketOverview,
	NewsCategoriesResponse,
	NewsParams,
	NewsResponse,
	Quote,
	SearchResponse,
} from "../types/market";

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
	idxFinancials: (kode: string) => fetchAPI<IdxFinancialsResponse>(`/idx/financials/${kode}`),
	idxIndices: () => fetchAPI<IdxIndicesResponse>("/idx/indices"),
	idxCompanyFull: (kode: string) => fetchAPI<IdxCompanyFullResponse>(`/idx/companies/${kode}/full`),
	idxFinancialSummary: (kode: string) =>
		fetchAPI<IdxFinancialSummaryResponse>(`/idx/financials/${kode}/summary`),
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
};
