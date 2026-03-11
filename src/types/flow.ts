// Wyckoff phase types
export type WyckoffPhase = "accumulation" | "markup" | "distribution" | "markdown";

export interface WyckoffSegment {
	phase: WyckoffPhase;
	startIndex: number;
	endIndex: number;
	startDate: string;
	endDate: string;
	confidence: number;
	priceStart: number;
	priceEnd: number;
	priceChange: number;
}

export interface WyckoffAnalysis {
	currentPhase: WyckoffSegment | null;
	phases: WyckoffSegment[];
}

// MFI types
export interface MFIPoint {
	date: string;
	value: number;
}

export type MFISignal = "overbought" | "oversold" | "neutral";

export interface MFIAnalysis {
	values: MFIPoint[];
	current: number;
	signal: MFISignal;
}

// Stock regime types
export type CapSize = "large" | "mid" | "small" | "micro";
export type LiquidityTier = "high" | "medium" | "low" | "very_low";

export interface StockRegime {
	capSize: CapSize;
	capLabel: string;
	liquidityTier: LiquidityTier;
	liquidityLabel: string;
}

// RSI types
export interface RSIAnalysis {
	values: MFIPoint[]; // reuse same {date, value} shape
	current: number;
	signal: MFISignal; // reuse overbought/oversold/neutral
}

// Divergence types
export type DivergenceType = "bullish" | "bearish";

export interface Divergence {
	type: DivergenceType;
	indicator: string;
	description: string;
	startDate: string;
	endDate: string;
}

export interface DivergenceAnalysis {
	divergences: Divergence[];
	current: Divergence | null;
}

// Volume trend types
export interface VolumeTrend {
	direction: "increasing" | "decreasing" | "stable";
	ratio: number; // recent avg volume / older avg volume
	description: string;
}

// Flow verdict
export type VerdictSignal = "bullish" | "bearish" | "neutral";

export interface FlowVerdict {
	signal: VerdictSignal;
	conviction: number; // 0-100
	reasons: string[];
	wyckoff: WyckoffSegment | null;
	mfi: MFIAnalysis;
	rsi: RSIAnalysis;
	regime: StockRegime;
	divergences: DivergenceAnalysis;
	volumeTrend: VolumeTrend;
}

// Sector performance (API response)
export interface SectorPerformanceStock {
	symbol: string;
	name: string;
	price: number;
	change_percent: number;
	volume: number;
}

export interface SectorPerformanceItem {
	sector: string;
	avg_change_percent: number;
	advances: number;
	declines: number;
	total_stocks: number;
	total_volume: number;
	stocks: SectorPerformanceStock[];
}

export interface IdxSectorPerformanceResponse {
	sectors: SectorPerformanceItem[];
	updated_at: string;
}

// Broker flow (API response)
export interface BrokerFlowEntry {
	date: string;
	broker_code: string;
	broker_name: string;
	volume: number;
	value: number;
	frequency: number;
}

export interface BrokerFlowTotals {
	broker_count: number;
	total_volume: number;
	total_value: number;
	total_frequency: number;
}

export interface IdxBrokerFlowResponse {
	date: string;
	brokers: BrokerFlowEntry[];
	totals: BrokerFlowTotals;
}

export interface IdxBrokerFlowParams {
	date?: string;
	sort?: string;
	order?: string;
	limit?: number;
	offset?: number;
}

export interface BrokerFlowHistoryEntry {
	date: string;
	broker_code: string;
	broker_name: string;
	volume: number;
	value: number;
	frequency: number;
	volume_delta: number | null;
	value_delta: number | null;
	frequency_delta: number | null;
}

export interface IdxBrokerFlowHistoryResponse {
	broker_code: string;
	broker_name: string;
	history: BrokerFlowHistoryEntry[];
	total_days: number;
}
