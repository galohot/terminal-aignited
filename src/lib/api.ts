import type {
	BatchResponse,
	FinancialsResponse,
	Fundamentals,
	HistoryParams,
	HistoryResponse,
	MarketOverview,
	NewsParams,
	NewsResponse,
	Quote,
	SearchResponse,
} from "../types/market";

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
		throw new Error((err as { message?: string }).message || `API error ${res.status}`);
	}
	return res.json() as Promise<T>;
}

export const api = {
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
};
