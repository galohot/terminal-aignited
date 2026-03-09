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
	sector: string;
	industry: string;
	country: string;
	website: string;
	employees: number;
	description: string;
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
