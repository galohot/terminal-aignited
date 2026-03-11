import type { HistoryPoint } from "../types/market";
import type {
	Divergence,
	DivergenceAnalysis,
	MFIAnalysis,
	MFIPoint,
	MFISignal,
	RSIAnalysis,
	VolumeTrend,
} from "../types/flow";

/**
 * Compute Money Flow Index (MFI) — a volume-weighted RSI.
 */
export function computeMFI(data: HistoryPoint[], period = 14): MFIAnalysis {
	const empty: MFIAnalysis = { values: [], current: 50, signal: "neutral" };
	if (data.length < period + 1) return empty;

	const tp: number[] = data.map((d) => (d.high + d.low + d.close) / 3);
	const rmf: number[] = tp.map((t, i) => t * data[i].volume);
	const values: MFIPoint[] = [];

	for (let i = period; i < data.length; i++) {
		let posFlow = 0;
		let negFlow = 0;
		for (let j = i - period + 1; j <= i; j++) {
			if (tp[j] > tp[j - 1]) posFlow += rmf[j];
			else if (tp[j] < tp[j - 1]) negFlow += rmf[j];
		}
		const mfi =
			posFlow === 0 && negFlow === 0
				? 50
				: negFlow === 0
					? 100
					: 100 - 100 / (1 + posFlow / negFlow);
		values.push({ date: data[i].date, value: Math.round(mfi * 100) / 100 });
	}

	const current = values.length > 0 ? values[values.length - 1].value : 50;
	let signal: MFISignal = "neutral";
	if (current >= 80) signal = "overbought";
	else if (current <= 20) signal = "oversold";

	return { values, current, signal };
}

/**
 * Compute RSI (Relative Strength Index).
 * Uses Wilder's smoothing (exponential moving average of gains/losses).
 */
export function computeRSI(data: HistoryPoint[], period = 14): RSIAnalysis {
	const empty: RSIAnalysis = { values: [], current: 50, signal: "neutral" };
	if (data.length < period + 1) return empty;

	const changes: number[] = [];
	for (let i = 1; i < data.length; i++) {
		changes.push(data[i].close - data[i - 1].close);
	}

	// Initial average gain/loss
	let avgGain = 0;
	let avgLoss = 0;
	for (let i = 0; i < period; i++) {
		if (changes[i] > 0) avgGain += changes[i];
		else avgLoss += Math.abs(changes[i]);
	}
	avgGain /= period;
	avgLoss /= period;

	const values: MFIPoint[] = [];

	// First RSI value
	const firstRSI = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
	values.push({ date: data[period].date, value: Math.round(firstRSI * 100) / 100 });

	// Subsequent values using Wilder's smoothing
	for (let i = period; i < changes.length; i++) {
		const gain = changes[i] > 0 ? changes[i] : 0;
		const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
		avgGain = (avgGain * (period - 1) + gain) / period;
		avgLoss = (avgLoss * (period - 1) + loss) / period;
		const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
		values.push({ date: data[i + 1].date, value: Math.round(rsi * 100) / 100 });
	}

	const current = values.length > 0 ? values[values.length - 1].value : 50;
	let signal: MFISignal = "neutral";
	if (current >= 70) signal = "overbought";
	else if (current <= 30) signal = "oversold";

	return { values, current, signal };
}

/**
 * Detect price-indicator divergences.
 * Bullish divergence: price makes lower low, but indicator makes higher low.
 * Bearish divergence: price makes higher high, but indicator makes lower high.
 *
 * Scans the last `lookback` bars for swing highs/lows in both price and indicator.
 */
export function detectDivergences(
	data: HistoryPoint[],
	mfi: MFIAnalysis,
	rsi: RSIAnalysis,
	lookback = 60,
): DivergenceAnalysis {
	const divergences: Divergence[] = [];

	// We need enough data
	const startIdx = Math.max(0, data.length - lookback);
	if (data.length < 30) return { divergences, current: null };

	// Find swing lows and highs in price (using close)
	const priceLows = findSwingLows(data.slice(startIdx).map((d) => d.close));
	const priceHighs = findSwingHighs(data.slice(startIdx).map((d) => d.close));

	// Check MFI divergences
	if (mfi.values.length >= lookback) {
		const mfiSlice = mfi.values.slice(-lookback);
		const mfiVals = mfiSlice.map((v) => v.value);
		const mfiLows = findSwingLows(mfiVals);
		const mfiHighs = findSwingHighs(mfiVals);

		// Bullish: price lower low + MFI higher low
		if (priceLows.length >= 2 && mfiLows.length >= 2) {
			const [pL1, pL2] = priceLows.slice(-2);
			const [mL1, mL2] = mfiLows.slice(-2);
			if (pL2.value < pL1.value && mL2.value > mL1.value) {
				const dateIdx = startIdx + pL2.index;
				divergences.push({
					type: "bullish",
					indicator: "MFI",
					description:
						"Price made a lower low but MFI made a higher low — selling pressure weakening",
					startDate: data[startIdx + pL1.index]?.date ?? "",
					endDate: data[dateIdx]?.date ?? "",
				});
			}
		}

		// Bearish: price higher high + MFI lower high
		if (priceHighs.length >= 2 && mfiHighs.length >= 2) {
			const [pH1, pH2] = priceHighs.slice(-2);
			const [mH1, mH2] = mfiHighs.slice(-2);
			if (pH2.value > pH1.value && mH2.value < mH1.value) {
				const dateIdx = startIdx + pH2.index;
				divergences.push({
					type: "bearish",
					indicator: "MFI",
					description:
						"Price made a higher high but MFI made a lower high — buying momentum fading",
					startDate: data[startIdx + pH1.index]?.date ?? "",
					endDate: data[dateIdx]?.date ?? "",
				});
			}
		}
	}

	// Check RSI divergences
	if (rsi.values.length >= lookback) {
		const rsiSlice = rsi.values.slice(-lookback);
		const rsiVals = rsiSlice.map((v) => v.value);
		const rsiLows = findSwingLows(rsiVals);
		const rsiHighs = findSwingHighs(rsiVals);

		if (priceLows.length >= 2 && rsiLows.length >= 2) {
			const [pL1, pL2] = priceLows.slice(-2);
			const [rL1, rL2] = rsiLows.slice(-2);
			if (pL2.value < pL1.value && rL2.value > rL1.value) {
				const dateIdx = startIdx + pL2.index;
				divergences.push({
					type: "bullish",
					indicator: "RSI",
					description:
						"Price made a lower low but RSI made a higher low — bearish momentum weakening",
					startDate: data[startIdx + pL1.index]?.date ?? "",
					endDate: data[dateIdx]?.date ?? "",
				});
			}
		}

		if (priceHighs.length >= 2 && rsiHighs.length >= 2) {
			const [pH1, pH2] = priceHighs.slice(-2);
			const [rH1, rH2] = rsiHighs.slice(-2);
			if (pH2.value > pH1.value && rH2.value < rH1.value) {
				const dateIdx = startIdx + pH2.index;
				divergences.push({
					type: "bearish",
					indicator: "RSI",
					description:
						"Price made a higher high but RSI made a lower high — bullish momentum fading",
					startDate: data[startIdx + pH1.index]?.date ?? "",
					endDate: data[dateIdx]?.date ?? "",
				});
			}
		}
	}

	// Current = most recent divergence (if its end date is within the last 20 bars)
	const recentCutoff = data.length - 20;
	const current =
		divergences.length > 0
			? divergences.find((d) => {
					const endIdx = data.findIndex((p) => p.date === d.endDate);
					return endIdx >= recentCutoff;
				}) ?? null
			: null;

	return { divergences, current };
}

interface SwingPoint {
	index: number;
	value: number;
}

/**
 * Find swing lows — points lower than their neighbors within a window.
 */
function findSwingLows(values: number[], window = 5): SwingPoint[] {
	const lows: SwingPoint[] = [];
	for (let i = window; i < values.length - window; i++) {
		let isLow = true;
		for (let j = i - window; j <= i + window; j++) {
			if (j !== i && values[j] <= values[i]) {
				isLow = false;
				break;
			}
		}
		if (isLow) lows.push({ index: i, value: values[i] });
	}
	return lows;
}

/**
 * Find swing highs — points higher than their neighbors within a window.
 */
function findSwingHighs(values: number[], window = 5): SwingPoint[] {
	const highs: SwingPoint[] = [];
	for (let i = window; i < values.length - window; i++) {
		let isHigh = true;
		for (let j = i - window; j <= i + window; j++) {
			if (j !== i && values[j] >= values[i]) {
				isHigh = false;
				break;
			}
		}
		if (isHigh) highs.push({ index: i, value: values[i] });
	}
	return highs;
}

/**
 * Analyze volume trend — is volume increasing, decreasing, or stable?
 * Compares recent 10-day avg volume to prior 30-day avg volume.
 */
export function analyzeVolumeTrend(data: HistoryPoint[]): VolumeTrend {
	if (data.length < 40) {
		return { direction: "stable", ratio: 1, description: "Insufficient data for volume trend" };
	}

	const recent = data.slice(-10);
	const prior = data.slice(-40, -10);

	const recentAvg = recent.reduce((s, d) => s + d.volume, 0) / recent.length;
	const priorAvg = prior.reduce((s, d) => s + d.volume, 0) / prior.length;

	if (priorAvg === 0) {
		return { direction: "stable", ratio: 1, description: "No prior volume data" };
	}

	const ratio = recentAvg / priorAvg;

	if (ratio > 1.5) {
		return {
			direction: "increasing",
			ratio,
			description: `Volume surging — ${ratio.toFixed(1)}x above 30-day average`,
		};
	}
	if (ratio > 1.15) {
		return {
			direction: "increasing",
			ratio,
			description: `Volume rising — ${((ratio - 1) * 100).toFixed(0)}% above average`,
		};
	}
	if (ratio < 0.65) {
		return {
			direction: "decreasing",
			ratio,
			description: `Volume drying up — ${((1 - ratio) * 100).toFixed(0)}% below average`,
		};
	}
	if (ratio < 0.85) {
		return {
			direction: "decreasing",
			ratio,
			description: `Volume declining — ${((1 - ratio) * 100).toFixed(0)}% below average`,
		};
	}

	return { direction: "stable", ratio, description: "Volume in normal range" };
}
