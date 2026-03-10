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
		market_cap: number | null;
		pe_ratio: number | null;
		forward_pe: number | null;
		peg_ratio: number | null;
		price_to_book: number | null;
		eps: number | null;
		dividend_yield: number | null;
		revenue: number | null;
		net_income: number | null;
		debt_to_equity: number | null;
		return_on_equity: number | null;
		free_cash_flow: number | null;
		operating_margin: number | null;
		profit_margin: number | null;
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
	shares_owned: number | null;
	percentage: number | null;
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

export interface IdxFinancialData {
	roe: number | null;
	roa: number | null;
	npm: number | null;
	deRatio: number | null;
	per: number | null;
	priceBV: number | null;
	eps: number | null;
	bookValue: number | null;
	assets: number | null;
	liabilities: number | null;
	equity: number | null;
	sales: number | null;
	ebt: number | null;
	profitPeriod: number | null;
	profitAttrOwner: number | null;
	[key: string]: unknown;
}

export interface IdxFinancial {
	period_year: number;
	period_quarter: number;
	data: IdxFinancialData;
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

export interface IdxInsiderSearchResult {
	insider_name: string;
	kode_emiten: string;
	company_name: string;
	insider_type: "director" | "commissioner" | "shareholder";
	position: string | null;
	shares_owned: number | null;
	percentage: number | null;
}

export interface IdxInsiderSearchResponse {
	results: IdxInsiderSearchResult[];
	total: number;
}
