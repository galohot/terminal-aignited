import { Activity, CircleAlert, ListPlus, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { useBatchQuotes } from "../../hooks/use-batch-quotes";
import { useRealtimeSubscription } from "../../hooks/use-realtime";
import { formatPercent, formatPrice } from "../../lib/format";
import { type PriceData, useRealtimeStore } from "../../stores/realtime-store";
import { useWatchlistStore } from "../../stores/watchlist-store";
import type { Quote } from "../../types/market";
import { Skeleton } from "../ui/loading";
import { WatchlistRow } from "./watchlist-row";

interface WatchlistPanelProps {
	selectedIndex?: number;
}

export function WatchlistPanel({ selectedIndex = -1 }: WatchlistPanelProps) {
	const symbols = useWatchlistStore((state) => state.symbols);
	const removeSymbol = useWatchlistStore((state) => state.removeSymbol);
	const { data, error, isLoading } = useBatchQuotes(symbols);

	useRealtimeSubscription(symbols);
	// Only track realtime prices for watchlist symbols. Shallow compare means
	// we skip re-renders when unrelated tickers update in the shared store.
	const realtimePrices = useRealtimeStore(
		useShallow((state) => {
			const out: Record<string, PriceData | undefined> = {};
			for (const sym of symbols) out[sym] = state.prices[sym];
			return out;
		}),
	);

	if (symbols.length === 0) {
		return (
			<div className="rounded-[18px] border border-rule bg-card p-8 text-center">
				<div className="mx-auto max-w-xl">
					<div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ember-400/30 bg-ember-50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-ember-700">
						<ListPlus className="h-3.5 w-3.5" />
						Watchlist empty
					</div>
					<h2 className="text-2xl font-semibold text-ink">Build your first market board.</h2>
					<p className="mt-3 text-sm leading-6 text-ink-3">
						Add symbols from search and they will appear here with live prices, sparkline context,
						and keyboard navigation.
					</p>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
					{["sk-1", "sk-2", "sk-3", "sk-4"].map((id) => (
						<Skeleton key={id} className="h-28 w-full rounded-[18px]" />
					))}
				</div>
				<Skeleton className="h-[420px] w-full rounded-[18px]" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-[18px] border border-rule bg-card p-8">
				<div className="flex items-start gap-3">
					<CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-ember-600" />
					<div>
						<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember-700">
							Watchlist unavailable
						</div>
						<p className="mt-2 text-sm leading-6 text-ink-3">
							The watchlist quote batch could not be loaded right now.
						</p>
					</div>
				</div>
			</div>
		);
	}

	const quotes = data?.quotes ?? [];
	const ordered = symbols
		.map((symbol) => {
			const quote = quotes.find((item) => item.symbol === symbol);
			if (!quote) return null;
			const realtime = realtimePrices[symbol];
			if (!realtime) return quote;
			return {
				...quote,
				price: realtime.price,
				change: realtime.change,
				change_percent: realtime.changePercent,
				volume: realtime.volume || quote.volume,
			};
		})
		.filter((quote): quote is Quote => quote != null);
	const missingSymbols = symbols.filter(
		(symbol) => !ordered.some((quote) => quote.symbol === symbol),
	);
	const advancers = ordered.filter((quote) => quote.change_percent > 0).length;
	const decliners = ordered.filter((quote) => quote.change_percent < 0).length;
	const leader = [...ordered].sort((a, b) => b.change_percent - a.change_percent)[0] ?? null;
	const laggard = [...ordered].sort((a, b) => a.change_percent - b.change_percent)[0] ?? null;
	const liveCount = ordered.filter((quote) => realtimePrices[quote.symbol]).length;

	return (
		<div className="space-y-4">
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<SummaryCard
					icon={<Activity className="h-4 w-4" />}
					label="Coverage"
					value={`${ordered.length}/${symbols.length} loaded`}
					note={`${liveCount} symbols currently have realtime overlays.`}
				/>
				<SummaryCard
					icon={<TrendingUp className="h-4 w-4" />}
					label="Advancers"
					value={`${advancers}`}
					note={`${decliners} decliners on the active watchlist board.`}
				/>
				<SummaryCard
					icon={<TrendingUp className="h-4 w-4" />}
					label="Leader"
					value={leader ? `${leader.symbol} ${formatPercent(leader.change_percent)}` : "—"}
					note={
						leader
							? `${leader.name} at ${formatPrice(leader.price, leader.currency)}`
							: "Awaiting quotes"
					}
				/>
				<SummaryCard
					icon={<TrendingDown className="h-4 w-4" />}
					label="Laggard"
					value={laggard ? `${laggard.symbol} ${formatPercent(laggard.change_percent)}` : "—"}
					note={
						laggard
							? `${laggard.name} at ${formatPrice(laggard.price, laggard.currency)}`
							: "Awaiting quotes"
					}
				/>
			</div>

			{missingSymbols.length > 0 && (
				<div className="rounded-[18px] border border-ember-400/30 bg-ember-50 p-4">
					<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember-700">
						Missing symbols
					</div>
					<div className="mt-3 flex flex-wrap gap-2">
						{missingSymbols.map((symbol) => (
							<button
								key={symbol}
								type="button"
								onClick={() => removeSymbol(symbol)}
								className="rounded-full border border-rule bg-card px-3 py-1 font-mono text-xs text-ink-3 transition-colors hover:border-ember-400/40 hover:text-ember-700"
							>
								{symbol}
							</button>
						))}
					</div>
				</div>
			)}

			<div className="overflow-hidden rounded-[18px] border border-rule bg-card">
				<div className="overflow-x-auto">
					<table className="w-full min-w-[860px] text-sm">
						<thead className="border-b border-rule bg-paper-2">
							<tr>
								<th className="px-4 py-3 text-left font-medium text-ink-3">Symbol</th>
								<th className="px-4 py-3 text-left font-medium text-ink-3">Company</th>
								<th className="px-4 py-3 text-right font-medium text-ink-3">Last</th>
								<th className="px-4 py-3 text-right font-medium text-ink-3">Change</th>
								<th className="px-4 py-3 text-right font-medium text-ink-3">Volume</th>
								<th className="px-4 py-3 text-left font-medium text-ink-3">5D Trend</th>
								<th className="w-12 px-4 py-3" />
							</tr>
						</thead>
						<tbody>
							{ordered.map((quote, index) => (
								<WatchlistRow
									key={quote.symbol}
									quote={quote}
									onRemove={removeSymbol}
									selected={index === selectedIndex}
								/>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

function SummaryCard({
	icon,
	label,
	note,
	value,
}: {
	icon: ReactNode;
	label: string;
	note: string;
	value: string;
}) {
	return (
		<div className="min-w-0 rounded-[18px] border border-rule bg-card p-4">
			<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-4">
				<span className="text-ember-600">{icon}</span>
				{label}
			</div>
			<div className="mt-2 break-words text-lg font-semibold text-ink">{value}</div>
			<div className="mt-2 break-words text-sm leading-6 text-ink-3">{note}</div>
		</div>
	);
}
