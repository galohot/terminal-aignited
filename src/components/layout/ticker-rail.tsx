import { useMemo } from "react";
import { useDashboard } from "../../hooks/use-dashboard";
import { useRealtimeStore } from "../../stores/realtime-store";
import type { Quote } from "../../types/market";

const FALLBACK_TICKS: Array<[string, string, number]> = [
	["JCI", "7412.18", 0.62],
	["LQ45", "958.32", 0.58],
	["IDX30", "478.12", 0.63],
	["BBCA", "9,525", 0.0],
	["BBRI", "5,175", -0.48],
	["BMRI", "6,825", 0.74],
	["TLKM", "3,410", 1.19],
	["ASII", "4,980", -0.2],
	["ADRO", "2,970", 3.12],
	["ITMG", "26,575", 2.45],
	["PTBA", "2,855", 2.14],
	["UNTR", "25,100", 1.82],
	["GOTO", "52", -3.7],
	["EMTK", "545", -1.81],
	["INDF", "6,250", 0.4],
	["ICBP", "11,425", 0.88],
	["USD/IDR", "15,842", -0.08],
	["HSI", "17,842", 1.42],
	["N225", "39,128", 0.88],
	["KOSPI", "2,692", -0.3],
	["BRENT", "82.45", 0.45],
	["GOLD", "2,332", 0.08],
	["BTC", "64,120", 2.18],
	["ETH", "3,182", 1.55],
];

function formatTickPrice(price: number, currency: string): string {
	if (currency === "IDR") return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
	if (Math.abs(price) >= 1000)
		return price.toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	if (Math.abs(price) >= 1) return price.toFixed(2);
	return price.toFixed(4);
}

function quoteToTick(q: Quote): [string, string, number] {
	return [q.symbol, formatTickPrice(q.price, q.currency || "USD"), q.change_percent ?? 0];
}

export function TickerRail() {
	const { data } = useDashboard();
	const realtimePrices = useRealtimeStore((s) => s.prices);

	const ticks = useMemo<Array<[string, string, number]>>(() => {
		if (!data?.markets) return FALLBACK_TICKS;
		const m = data.markets;
		// Weight local + regional + FX + crypto for 24 slots
		const picks = [
			...m.indices.indonesia.slice(0, 6),
			...m.indices.asia_pacific.slice(0, 5),
			...m.forex.slice(0, 4),
			...m.commodities.slice(0, 4),
			...m.crypto.slice(0, 3),
			...m.indices.us.slice(0, 2),
		].map((q): Quote => {
			const rt = realtimePrices[q.symbol];
			if (!rt) return q;
			return {
				...q,
				price: rt.price,
				change_percent: rt.changePercent,
			};
		});
		if (picks.length === 0) return FALLBACK_TICKS;
		return picks.map(quoteToTick);
	}, [data, realtimePrices]);

	// Duplicate for seamless marquee loop
	const looped = useMemo(() => [...ticks, ...ticks], [ticks]);

	return (
		<div className="aig-ticker-rail shrink-0">
			<div className="aig-ticker-track">
				{looped.map(([sym, px, pct], i) => {
					const up = pct >= 0;
					const arrow = up ? "▲" : "▼";
					return (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: looped ticker has stable order
							key={`${sym}-${i}`}
							className="inline-flex items-center gap-2 font-mono text-xs text-aig-text-2"
						>
							<span className="font-semibold tracking-wider text-aig-text">{sym}</span>
							<span className="text-aig-text-2">{px}</span>
							<span className={up ? "text-aig-pos" : "text-aig-neg"}>
								{arrow} {pct >= 0 ? "+" : ""}
								{pct.toFixed(2)}%
							</span>
						</span>
					);
				})}
			</div>
		</div>
	);
}
