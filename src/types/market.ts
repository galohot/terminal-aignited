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

export interface DashboardResponse {
	markets: MarketOverview;
	news: NewsArticle[];
	idx_indices: IdxIndex[];
}

export interface NewsCategoryItem {
	name: string;
	count: number;
}

export interface NewsCategoriesResponse {
	categories: NewsCategoryItem[];
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

export interface IdxFinancialSummaryLatest {
	period_year: number;
	period_quarter: number;
	roe: number | null;
	roa: number | null;
	npm: number | null;
	per: number | null;
	eps: number | null;
	pbv: number | null;
	der: number | null;
	assets: number | null;
	equity: number | null;
	sales: number | null;
}

export interface IdxFinancialSummaryHistory {
	period_year: number;
	period_quarter: number;
	roe: number | null;
	roa: number | null;
	eps: number | null;
}

export interface IdxFinancialSummaryResponse {
	kode_emiten: string;
	latest: IdxFinancialSummaryLatest | null;
	history: IdxFinancialSummaryHistory[];
	total_periods: number;
}

export interface IdxPeer {
	kode_emiten: string;
	company_name: string;
	shared_insiders: number;
	names: string[];
}

export interface IdxPeersResponse {
	kode_emiten: string;
	peers: IdxPeer[];
	total: number;
}

export interface IdxCompanyFullResponse {
	company: IdxCompanyDetail;
	financials: IdxFinancialSummaryLatest | null;
	directors: IdxDirector[];
	commissioners: IdxCommissioner[];
	shareholders: IdxShareholder[];
	peer_companies: IdxPeer[];
}

export interface IdxScreenerParams {
	sector?: string;
	sub_sector?: string;
	market_cap_min?: number;
	market_cap_max?: number;
	roe_min?: number;
	roe_max?: number;
	per_min?: number;
	per_max?: number;
	der_max?: number;
	npm_min?: number;
	roa_min?: number;
	eps_min?: number;
	pbv_min?: number;
	pbv_max?: number;
	sort?: string;
	order?: string;
	limit?: number;
	offset?: number;
}

export interface IdxScreenerResult {
	kode_emiten: string;
	name: string;
	sector: string;
	sub_sector?: string;
	market_cap: number | null;
	pe_ratio: number | null;
	dividend_yield: number | null;
	period_year?: number;
	period_quarter?: number;
	roe: number | null;
	roa: number | null;
	per: number | null;
	npm: number | null;
	der: number | null;
	eps: number | null;
	pbv: number | null;
}

export interface IdxScreenerResponse {
	results: IdxScreenerResult[];
	total: number;
}

export interface IdxSector {
	sector: string;
	company_count: number;
	sub_sectors: string[];
}

export interface IdxSectorsResponse {
	sectors: IdxSector[];
	total_sectors: number;
}

export interface IdxEntityGroup {
	entity_group: string;
	count: number;
}

export interface IdxEntityGroupsResponse {
	entity_groups: IdxEntityGroup[];
	total: number;
}

export interface IdxEntityHolding {
	kode_emiten: string;
	company_name: string;
	total_percentage: number | null;
	via_entities: string[];
}

export interface IdxEntityGroupHoldingsResponse {
	entity_group: string;
	holdings: IdxEntityHolding[];
	total_companies: number;
}

export interface IdxTopConnector {
	name: string;
	companies: number;
	types: string[];
	entity_group: string | null;
}

export interface IdxTopConnectorsResponse {
	connectors: IdxTopConnector[];
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

export interface MoversParams {
	change_min?: number;
	change_max?: number;
	volume_min?: number;
	relative_volume_min?: number;
	sector?: string;
	sort?: string;
	order?: string;
	preset?: string;
	limit?: number;
}

export interface MoverStock {
	symbol: string;
	name: string;
	sector: string;
	price: number;
	change_percent: number;
	volume: number;
	avg_volume_20d: number | null;
	relative_volume: number | null;
	open: number;
	previous_close: number;
	gap_percent: number;
	market_cap: number | null;
}

export interface MoversResponse {
	movers: MoverStock[];
	total: number;
}

export interface MarketBreadthEntry {
	date: string;
	advances: number;
	declines: number;
	unchanged: number;
	total_volume: number;
	tracked_stocks: number;
	advance_decline_ratio: number;
}

export interface MarketBreadthResponse {
	breadth: MarketBreadthEntry[];
}

export interface HeatmapStock {
	symbol: string;
	name: string;
	sector: string;
	sub_sector: string;
	price: number;
	change_percent: number;
	volume: number;
	market_cap: number | null;
}

export interface HeatmapResponse {
	stocks: HeatmapStock[];
}

// Broker Summary (per-stock)
export interface IdxBrokerSummaryEntry {
	broker_code: string;
	broker_name: string;
	date: string;
	frequency: number;
	kode_emiten: string;
	value: number;
	volume: number;
}

export interface IdxBrokerSummaryTotals {
	broker_count: number;
	total_frequency: number;
	total_value: number;
	total_volume: number;
}

export interface IdxBrokerSummaryResponse {
	kode_emiten: string;
	date: string;
	brokers: IdxBrokerSummaryEntry[];
	totals: IdxBrokerSummaryTotals;
}

// Insider Positions (per-stock)
export interface IdxInsiderPosition {
	insider_name: string;
	insider_type: string;
	is_independent: boolean | null;
	percentage: number | null;
	position: string | null;
	shares_owned: number | null;
}

export interface IdxInsiderTransactionsResponse {
	kode_emiten: string;
	insiders: IdxInsiderPosition[];
	total: number;
}

// Index Price History
export interface IdxIndexHistoryPoint {
	date: string;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	change_percent: number;
}

export interface IdxIndexHistoryResponse {
	index_code: string;
	data: IdxIndexHistoryPoint[];
	total: number;
}

// Foreign Flow (per-stock)
export interface IdxForeignFlowEntry {
	date: string;
	foreign_buy: number;
	foreign_sell: number;
	foreign_net: number;
}

export interface IdxForeignFlowResponse {
	kode_emiten: string;
	history: IdxForeignFlowEntry[];
	days: number;
	cumulative_net_foreign: number;
}

// Corporate Disclosures
export interface IdxDisclosure {
	kode: string;
	headline: string;
	attachment_url: string;
	submitted_date: string;
	source: string;
}

export interface IdxDisclosuresResponse {
	disclosures: IdxDisclosure[];
	total: number;
}

// ── KSEI Ownership Types ──

export interface KseiStats {
	total_records: number;
	total_companies: number;
	total_investors: number;
	multi_company_investors: number;
	avg_per_company: number;
	top_connectors: { name: string; companies: number; investor_type: string }[];
}

export interface KseiShareholderRecord {
	kode_emiten: string;
	issuer_name: string;
	investor_name: string;
	investor_type: string;
	local_foreign: string;
	nationality: string;
	domicile: string;
	holdings_scripless: number;
	holdings_scrip: number;
	total_shares: number;
	percentage: number;
}

export interface KseiRecordsResponse {
	records: KseiShareholderRecord[];
	total: number;
	page: number;
	per_page: number;
}

export interface KseiCompanyResponse {
	kode_emiten: string;
	issuer_name: string;
	total_insider_pct: number;
	shareholders: KseiShareholderRecord[];
}

export interface KseiInvestorResponse {
	investor_name: string;
	investor_type: string;
	local_foreign: string;
	domicile: string;
	companies: KseiShareholderRecord[];
}

export interface KseiTypeDistItem {
	investor_type: string;
	count: number;
	total_pct: number;
	avg_pct: number;
}

export interface KseiLfSplit {
	local: { count: number; total_pct: number };
	foreign: { count: number; total_pct: number };
}

export interface KseiConcentrationBucket {
	bucket: string;
	count: number;
}

// ── Macro Types ──

export interface MacroHeadline {
	value: number | null;
	unit: string;
	period: string | null;
}

export interface MacroSeriesPoint {
	period: string | null;
	value: number | null;
	name?: string | null;
}

export interface MacroTradePoint {
	period: string | null;
	value: number | null;
}

export interface MacroOverview {
	headlines: {
		bi_rate: MacroHeadline;
		inflation_yoy: MacroHeadline;
		gdp_growth: MacroHeadline;
	};
	apbn: {
		revenue_target: number | null;
		spending_target: number | null;
		deficit_target: number | null;
		year: string;
	};
	bi_rate: MacroSeriesPoint[];
	inflation: MacroSeriesPoint[];
	gdp: MacroSeriesPoint[];
	trade: {
		exports: MacroTradePoint[];
		imports: MacroTradePoint[];
		balance: MacroTradePoint[];
	};
	debt: MacroSeriesPoint[];
}

export interface KseiCompanyListItem {
	kode_emiten: string;
	issuer_name: string;
	investor_count: number;
	total_insider_pct: number;
}

export interface KseiCompanyListResponse {
	companies: KseiCompanyListItem[];
	total: number;
	page: number;
	per_page: number;
}

export interface KseiInvestorListItem {
	investor_name: string;
	investor_type: string;
	local_foreign: string;
	domicile: string;
	company_count: number;
	total_pct: number;
}

export interface KseiInvestorListResponse {
	investors: KseiInvestorListItem[];
	total: number;
	page: number;
	per_page: number;
}

export interface IdxScoreStrategy {
	name: string;
	signal: number;
	weight: number;
	confidence: number;
}

export interface IdxScoreAxis {
	score: number;
	strategies: IdxScoreStrategy[];
}

export interface IdxScoreCard {
	ticker: string;
	valuation: IdxScoreAxis;
	momentum: IdxScoreAxis;
	quality: IdxScoreAxis;
	risk: IdxScoreAxis;
	overall: number;
	history_bars: number;
	has_fundamentals: boolean;
	has_foreign_flow: boolean;
}
