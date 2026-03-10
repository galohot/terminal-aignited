export interface Quote {
	symbol: string;
	name: string;
	price: number;
	change: number;
	change_percent: number;
	open: number;
	high: number;
	low: number;
	volume: number;
	market_cap: number | null;
	pe_ratio: number | null;
	dividend_yield: number | null;
	fifty_two_week_high: number;
	fifty_two_week_low: number;
	exchange: string;
	currency: string;
	market_state: string | null;
	updated_at: string;
	tier: number;
}

export interface HistoryPoint {
	date: string;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	adj_close: number;
}

export interface HistoryResponse {
	symbol: string;
	interval: string;
	currency: string;
	data: HistoryPoint[];
}

export interface MarketOverview {
	indices: {
		indonesia: Quote[];
		us: Quote[];
		europe: Quote[];
		asia_pacific: Quote[];
	};
	commodities: Quote[];
	forex: Quote[];
	crypto: Quote[];
	updated_at: string;
}

export interface SearchResult {
	symbol: string;
	name: string | null;
	exchange: string | null;
	type: string;
	tier: number;
}

export interface Fundamentals {
	symbol: string;
	name: string;
	sector: string | null;
	industry: string | null;
	country: string | null;
	website: string | null;
	employees: number | null;
	description: string | null;
	financials: {
		market_cap: number;
		pe_ratio: number;
		forward_pe: number;
		peg_ratio: number;
		price_to_book: number;
		eps: number;
		dividend_yield: number;
		revenue: number;
		net_income: number;
		debt_to_equity: number;
		roe: number;
		roa: number;
	};
	earnings: {
		next_date: string;
		eps_estimate: number;
		revenue_estimate: number;
	};
	updated_at: string;
}

export interface BatchResponse {
	quotes: Quote[];
	errors: { symbol: string; error: string }[];
	cached: boolean;
}

export interface SearchResponse {
	results: SearchResult[];
}

export interface HistoryParams {
	period?: string;
	interval?: string;
	start?: string;
	end?: string;
}

export interface FinancialsResponse {
	symbol: string;
	type: string;
	period: string;
	data: Record<string, unknown>;
}

export type NewsSentiment = "bullish" | "bearish" | "neutral" | "mixed";

export interface NewsArticle {
	id: number;
	title: string;
	summary: string;
	source_url: string;
	source_name: string;
	category: string;
	sentiment: NewsSentiment;
	related_tickers: string[];
	related_sectors: string[];
	published_at: string;
	daily_catalyst_slug: string;
}

export interface NewsResponse {
	news: NewsArticle[];
	total: number;
}

export interface NewsParams {
	limit?: number;
	category?: string;
	ticker?: string;
	hours?: number;
}

// IDX Company types

export interface IdxCompany {
	kode_emiten: string;
	name: string;
	sector: string;
	sub_sector: string;
	listing_date: string;
	papan_pencatatan: string;
}

export interface IdxDirector {
	insider_name: string;
	position: string;
	is_independent: boolean;
}

export interface IdxCommissioner {
	insider_name: string;
	position: string;
	is_independent: boolean;
}

export interface IdxShareholder {
	insider_name: string;
	shares_owned: number;
	percentage: number;
}

export interface IdxCompanyDetail extends IdxCompany {
	industry: string;
	sub_industry: string | null;
	address: string;
	phone: string;
	email: string;
	website: string;
	kegiatan_usaha: string;
	directors: IdxDirector[];
	commissioners: IdxCommissioner[];
	shareholders: IdxShareholder[];
}

export interface IdxFinancial {
	period_year: number;
	period_quarter: number;
	data: {
		ROE: number | null;
		ROA: number | null;
		NPM: number | null;
		DER: number | null;
		PER: number | null;
		PBV: number | null;
	};
}

export interface IdxFinancialsResponse {
	kode_emiten: string;
	financials: IdxFinancial[];
	total: number;
}

export interface IdxIndex {
	index_name: string;
	index_code: string;
	date: string;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	change: number;
	change_percent: number;
}

export interface IdxIndicesResponse {
	indices: IdxIndex[];
	total: number;
}

export interface IdxCompaniesResponse {
	companies: IdxCompany[];
	total: number;
}

export interface IdxCompaniesParams {
	search?: string;
	sector?: string;
	limit?: number;
	offset?: number;
}

export interface IdxBroker {
	code: string;
	name: string;
	license: string;
	status: string;
	website: string;
	phone: string;
	email: string;
}

export interface IdxBrokersResponse {
	brokers: IdxBroker[];
	total: number;
}
