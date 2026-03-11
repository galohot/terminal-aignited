import { useMemo } from "react";
import { useHistory } from "./use-history";
import { useQuote } from "./use-quote";
import { detectWyckoffPhases } from "../lib/wyckoff";
import { analyzeVolumeTrend, computeMFI, computeRSI, detectDivergences } from "../lib/indicators";
import { classifyRegime, computeAvgDailyTurnover } from "../lib/stock-regime";
import type {
	DivergenceAnalysis,
	FlowVerdict,
	MFIAnalysis,
	RSIAnalysis,
	StockRegime,
	VolumeTrend,
	WyckoffAnalysis,
} from "../types/flow";
import type { HistoryPoint } from "../types/market";

const EMPTY_DATA: HistoryPoint[] = [];

export function useFlowAnalysis(kode: string) {
	const symbol = kode ? `${kode}.JK` : "";
	const history = useHistory(symbol, "1y", "1d");
	const quote = useQuote(symbol);

	const data = history.data?.data ?? EMPTY_DATA;
	const marketCap = quote.data?.market_cap ?? null;

	const wyckoff = useMemo<WyckoffAnalysis>(
		() => (data.length > 0 ? detectWyckoffPhases(data) : { currentPhase: null, phases: [] }),
		[data],
	);

	const mfi = useMemo<MFIAnalysis>(
		() => (data.length > 0 ? computeMFI(data) : { values: [], current: 50, signal: "neutral" }),
		[data],
	);

	const rsi = useMemo<RSIAnalysis>(
		() => (data.length > 0 ? computeRSI(data) : { values: [], current: 50, signal: "neutral" }),
		[data],
	);

	const divergences = useMemo<DivergenceAnalysis>(
		() => (data.length > 0 ? detectDivergences(data, mfi, rsi) : { divergences: [], current: null }),
		[data, mfi, rsi],
	);

	const volumeTrend = useMemo<VolumeTrend>(
		() => (data.length > 0 ? analyzeVolumeTrend(data) : { direction: "stable", ratio: 1, description: "No data" }),
		[data],
	);

	const regime = useMemo<StockRegime>(() => {
		const turnover = data.length > 0 ? computeAvgDailyTurnover(data) : null;
		return classifyRegime(marketCap, turnover);
	}, [data, marketCap]);

	const verdict = useMemo<FlowVerdict | null>(() => {
		if (data.length === 0) return null;
		return buildVerdict(wyckoff, mfi, rsi, regime, divergences, volumeTrend);
	}, [data, wyckoff, mfi, rsi, regime, divergences, volumeTrend]);

	return {
		history: data,
		wyckoff,
		mfi,
		rsi,
		regime,
		verdict,
		divergences,
		volumeTrend,
		quote: quote.data,
		isLoading: history.isLoading || quote.isLoading,
		error: history.error || quote.error,
	};
}

function buildVerdict(
	wyckoff: WyckoffAnalysis,
	mfi: MFIAnalysis,
	rsi: RSIAnalysis,
	regime: StockRegime,
	divergences: DivergenceAnalysis,
	volumeTrend: VolumeTrend,
): FlowVerdict {
	const reasons: string[] = [];
	let bullish = 0;
	let bearish = 0;

	// Wyckoff phase
	const phase = wyckoff.currentPhase;
	if (phase) {
		const pct = Math.round(phase.confidence * 100);
		if (phase.phase === "accumulation") {
			bullish += phase.confidence;
			reasons.push(`Wyckoff: Accumulation phase (${pct}% confidence)`);
		} else if (phase.phase === "markup") {
			bullish += phase.confidence * 0.8;
			reasons.push(`Wyckoff: Markup phase (${pct}% confidence)`);
		} else if (phase.phase === "distribution") {
			bearish += phase.confidence;
			reasons.push(`Wyckoff: Distribution phase (${pct}% confidence)`);
		} else if (phase.phase === "markdown") {
			bearish += phase.confidence * 0.8;
			reasons.push(`Wyckoff: Markdown phase (${pct}% confidence)`);
		}
	}

	// MFI
	if (mfi.signal === "oversold") {
		bullish += 0.4;
		reasons.push(`MFI at ${mfi.current.toFixed(0)} — oversold`);
	} else if (mfi.signal === "overbought") {
		bearish += 0.4;
		reasons.push(`MFI at ${mfi.current.toFixed(0)} — overbought`);
	} else {
		reasons.push(`MFI at ${mfi.current.toFixed(0)} — neutral`);
	}

	// RSI
	if (rsi.signal === "oversold") {
		bullish += 0.35;
		reasons.push(`RSI at ${rsi.current.toFixed(0)} — oversold`);
	} else if (rsi.signal === "overbought") {
		bearish += 0.35;
		reasons.push(`RSI at ${rsi.current.toFixed(0)} — overbought`);
	} else {
		reasons.push(`RSI at ${rsi.current.toFixed(0)} — neutral`);
	}

	// Divergences
	if (divergences.current) {
		if (divergences.current.type === "bullish") {
			bullish += 0.3;
			reasons.push(`Bullish divergence (${divergences.current.indicator})`);
		} else {
			bearish += 0.3;
			reasons.push(`Bearish divergence (${divergences.current.indicator})`);
		}
	}

	// Volume trend
	if (volumeTrend.direction === "increasing") {
		// Rising volume confirms the current trend
		if (bullish > bearish) bullish += 0.15;
		else if (bearish > bullish) bearish += 0.15;
		reasons.push(volumeTrend.description);
	} else if (volumeTrend.direction === "decreasing") {
		reasons.push(volumeTrend.description);
	}

	// Regime context
	reasons.push(`${regime.capLabel}, ${regime.liquidityLabel}`);

	// Determine signal and conviction
	const net = bullish - bearish;
	const total = bullish + bearish;
	let signal: FlowVerdict["signal"] = "neutral";
	if (net > 0.3) signal = "bullish";
	else if (net < -0.3) signal = "bearish";

	// Conviction: how strongly the evidence leans one way (0-100)
	const conviction =
		total > 0
			? Math.min(Math.round((Math.abs(net) / total) * 100), 100)
			: 0;

	return {
		signal,
		conviction,
		reasons,
		wyckoff: phase,
		mfi,
		rsi,
		regime,
		divergences,
		volumeTrend,
	};
}
