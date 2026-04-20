import type { IdxForeignFlowResponse } from "../types/market";

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
