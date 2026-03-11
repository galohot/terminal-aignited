import type { HistoryPoint } from "../types/market";
import type { CapSize, LiquidityTier, StockRegime } from "../types/flow";

const CAP_THRESHOLDS: { min: number; size: CapSize; label: string }[] = [
	{ min: 10_000_000_000_000, size: "large", label: "Large Cap" },
	{ min: 1_000_000_000_000, size: "mid", label: "Mid Cap" },
	{ min: 100_000_000_000, size: "small", label: "Small Cap" },
	{ min: 0, size: "micro", label: "Micro Cap" },
];

const LIQUIDITY_THRESHOLDS: { min: number; tier: LiquidityTier; label: string }[] = [
	{ min: 50_000_000_000, tier: "high", label: "High Liquidity" },
	{ min: 10_000_000_000, tier: "medium", label: "Medium Liquidity" },
	{ min: 1_000_000_000, tier: "low", label: "Low Liquidity" },
	{ min: 0, tier: "very_low", label: "Very Low Liquidity" },
];

/**
 * Compute average daily turnover in IDR from recent price history.
 * Turnover ≈ avg(close × volume) over last N days.
 */
export function computeAvgDailyTurnover(data: HistoryPoint[], days = 20): number {
	const slice = data.slice(-days);
	if (slice.length === 0) return 0;
	const total = slice.reduce((sum, d) => sum + d.close * d.volume, 0);
	return total / slice.length;
}

/**
 * Classify a stock into a regime based on market cap and daily turnover.
 */
export function classifyRegime(
	marketCap: number | null,
	avgDailyTurnover: number | null,
): StockRegime {
	const cap = marketCap ?? 0;
	const turnover = avgDailyTurnover ?? 0;

	const capEntry = CAP_THRESHOLDS.find((t) => cap >= t.min) ?? CAP_THRESHOLDS[CAP_THRESHOLDS.length - 1];
	const liqEntry = LIQUIDITY_THRESHOLDS.find((t) => turnover >= t.min) ?? LIQUIDITY_THRESHOLDS[LIQUIDITY_THRESHOLDS.length - 1];

	return {
		capSize: capEntry.size,
		capLabel: capEntry.label,
		liquidityTier: liqEntry.tier,
		liquidityLabel: liqEntry.label,
	};
}
