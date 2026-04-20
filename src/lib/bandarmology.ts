import type { IdxBrokerSummaryEntry, IdxForeignFlowResponse } from "../types/market";

export type FlowBias = "StrongBuy" | "Buy" | "Neutral" | "Sell" | "StrongSell";

export interface FlowBiasResult {
	bias: FlowBias;
	ratio: number;
	buyValue: number;
	sellValue: number;
	netValue: number;
	days: number;
}

/**
 * Classify foreign flow bias from net/buy ratio over the sampled window.
 * Thresholds mirror Vanta's bandarmology.rs: 0.3 / 0.1 cutoffs.
 * Returns null if buy volume is zero (no signal).
 */
export function classifyForeignFlow(
	response: IdxForeignFlowResponse | null | undefined,
): FlowBiasResult | null {
	if (!response || response.history.length === 0) return null;

	let buyValue = 0;
	let sellValue = 0;
	for (const entry of response.history) {
		buyValue += entry.foreign_buy;
		sellValue += entry.foreign_sell;
	}
	const netValue = buyValue - sellValue;
	if (buyValue <= 0) return null;

	const ratio = netValue / buyValue;
	let bias: FlowBias;
	if (ratio > 0.3) bias = "StrongBuy";
	else if (ratio > 0.1) bias = "Buy";
	else if (ratio > -0.1) bias = "Neutral";
	else if (ratio > -0.3) bias = "Sell";
	else bias = "StrongSell";

	return {
		bias,
		ratio,
		buyValue,
		sellValue,
		netValue,
		days: response.history.length,
	};
}

export type ConcentrationKind = "concentrated" | "diffuse" | "moderate";

export interface ConcentrationSignal {
	kind: ConcentrationKind;
	topBroker: { code: string; name: string; pct: number };
	top3Pct: number;
	brokerCount: number;
	note: string;
}

/**
 * Concentration analysis over total broker value for a ticker-day.
 * Adapts Vanta's "single broker dominance" signal to the total-value data
 * we have (idx_broker_summary lacks buy/sell split). Once the laptop
 * scraper migrates to GetStockSummary, true accumulation/distribution
 * can layer on top of this.
 *
 * Thresholds: topBroker > 30% OR top3 > 60% → concentrated.
 *             topBroker < 20% AND top3 < 45% → diffuse. Else moderate.
 */
export function analyzeConcentration(
	brokers: IdxBrokerSummaryEntry[],
): ConcentrationSignal | null {
	if (brokers.length === 0) return null;
	const totalValue = brokers.reduce((s, b) => s + (b.value || 0), 0);
	if (totalValue <= 0) return null;

	const sorted = [...brokers].sort((a, b) => (b.value || 0) - (a.value || 0));
	const top = sorted[0];
	const topPct = (top.value || 0) / totalValue;
	const top3Pct =
		sorted.slice(0, 3).reduce((s, b) => s + (b.value || 0), 0) / totalValue;

	let kind: ConcentrationKind;
	if (topPct > 0.3 || top3Pct > 0.6) kind = "concentrated";
	else if (topPct < 0.2 && top3Pct < 0.45) kind = "diffuse";
	else kind = "moderate";

	const note =
		kind === "concentrated"
			? `Top broker ${top.broker_code} controls ${(topPct * 100).toFixed(0)}% of tape; top 3 at ${(top3Pct * 100).toFixed(0)}%.`
			: kind === "diffuse"
				? `Broad participation across ${brokers.length} brokers; top 3 only ${(top3Pct * 100).toFixed(0)}%.`
				: `Moderate concentration; top broker ${top.broker_code} at ${(topPct * 100).toFixed(0)}%.`;

	return {
		kind,
		topBroker: { code: top.broker_code, name: top.broker_name, pct: topPct },
		top3Pct,
		brokerCount: brokers.length,
		note,
	};
}
