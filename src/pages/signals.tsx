import { useState } from "react";
import { SignalCards } from "../components/signals/signal-cards";
import { SignalTable } from "../components/signals/signal-table";
import { TickerDetail } from "../components/signals/ticker-detail";
import { useConsensusSummary, useConsensusTop } from "../hooks/use-consensus";

export function SignalsPage() {
	const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
	const summary = useConsensusSummary();
	const topBuy = useConsensusTop("buy", 20);
	const topSell = useConsensusTop("sell", 20);

	return (
		<div className="mx-auto max-w-[1400px] space-y-5 p-4">
			{/* Header */}
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<div className="mb-2 flex items-center gap-3">
						<span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ember-600">
							Signal Radar
						</span>
						<span className="h-px max-w-[80px] flex-1 bg-ember-400/40" />
					</div>
					<h1
						className="text-[clamp(1.8rem,3.5vw,2.25rem)] leading-[1.05] text-ink"
						style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
					>
						Strategy <em className="text-ember-600">Consensus</em>
					</h1>
					<p className="mt-2 font-mono text-xs text-ink-4">
						15 strategies · {summary.data?.total || "..."} tickers · Updated{" "}
						{summary.data?.date || "..."}
					</p>
				</div>
				<div className="inline-flex items-center gap-2 rounded-full border border-pos/30 bg-pos/10 px-3 py-1 font-mono text-xs text-pos">
					<span className="h-2 w-2 animate-pulse rounded-full bg-pos" />
					LIVE
				</div>
			</div>

			{/* Summary Cards */}
			<SignalCards summary={summary.data} isLoading={summary.isLoading} />

			{/* Two columns: Buy + Sell */}
			<div className="grid gap-4 lg:grid-cols-2">
				<SignalTable
					title="Strongest Buy Signals"
					data={topBuy.data?.data || []}
					isLoading={topBuy.isLoading}
					colorClass="text-pos"
					barColor="#17a568"
					onSelect={setSelectedTicker}
				/>
				<SignalTable
					title="Strongest Sell Signals"
					data={topSell.data?.data || []}
					isLoading={topSell.isLoading}
					colorClass="text-neg"
					barColor="#d2344a"
					onSelect={setSelectedTicker}
				/>
			</div>

			{/* Ticker Detail */}
			{selectedTicker && (
				<TickerDetail ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
			)}

			{/* Disclaimer */}
			<div className="rounded-[12px] border border-ember-400/30 bg-ember-50 p-3 font-mono text-[10px] text-ember-700">
				DISCLAIMER: Informasi ini bukan rekomendasi investasi. Analisis menggunakan model kuantitatif
				yang memiliki keterbatasan. Selalu lakukan riset sendiri (DYOR) sebelum mengambil keputusan
				investasi.
			</div>
		</div>
	);
}
