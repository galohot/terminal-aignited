import { Activity, CircleAlert, ListPlus, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { useBatchQuotes } from "../../hooks/use-batch-quotes";
import { useRealtimeSubscription } from "../../hooks/use-realtime";
import { formatPercent, formatPrice } from "../../lib/format";
import { useRealtimeStore } from "../../stores/realtime-store";
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
	const realtimePrices = useRealtimeStore((state) => state.prices);

	if (symbols.length === 0) {
		return (
			<div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,22,0.96),rgba(9,12,12,0.98))] p-8 text-center">
				<div className="mx-auto max-w-xl">
					<div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-t-amber">
						<ListPlus className="h-3.5 w-3.5" />
						Watchlist empty
					</div>
					<h2 className="text-2xl font-semibold text-white">Build your first market board.</h2>
					<p className="mt-3 text-sm leading-6 text-t-text-secondary">
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
					{Array.from({ length: 4 }).map((_, index) => (
						<Skeleton key={index} className="h-28 w-full rounded-[24px]" />
					))}
				</div>
				<Skeleton className="h-[420px] w-full rounded-[28px]" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,22,0.96),rgba(9,12,12,0.98))] p-8">
				<div className="flex items-start gap-3">
					<CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-t-amber" />
					<div>
						<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-t-amber">
							Watchlist unavailable
						</div>
						<p className="mt-2 text-sm leading-6 text-t-text-secondary">
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
				<div className="rounded-[24px] border border-t-amber/25 bg-t-amber/10 p-4">
					<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-t-amber">
						Missing symbols
					</div>
					<div className="mt-3 flex flex-wrap gap-2">
						{missingSymbols.map((symbol) => (
							<button
								key={symbol}
								type="button"
								onClick={() => removeSymbol(symbol)}
								className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 font-mono text-xs text-t-text-secondary transition-colors hover:bg-white/10 hover:text-white"
							>
								{symbol}
							</button>
						))}
					</div>
				</div>
			)}

			<div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,22,0.96),rgba(9,12,12,0.98))]">
				<div className="overflow-x-auto">
					<table className="w-full min-w-[860px] text-sm">
						<thead className="border-b border-white/8 bg-white/[0.03]">
							<tr>
								<th className="px-4 py-3 text-left font-medium text-t-text-secondary">Symbol</th>
								<th className="px-4 py-3 text-left font-medium text-t-text-secondary">Company</th>
								<th className="px-4 py-3 text-right font-medium text-t-text-secondary">Last</th>
								<th className="px-4 py-3 text-right font-medium text-t-text-secondary">Change</th>
								<th className="px-4 py-3 text-right font-medium text-t-text-secondary">Volume</th>
								<th className="px-4 py-3 text-left font-medium text-t-text-secondary">5D Trend</th>
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
		<div className="min-w-0 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,22,22,0.96),rgba(9,12,12,0.98))] p-4">
			<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-t-text-muted">
				<span className="text-t-amber">{icon}</span>
				{label}
			</div>
			<div className="mt-2 break-words text-lg font-semibold text-white">{value}</div>
			<div className="mt-2 break-words text-sm leading-6 text-t-text-secondary">{note}</div>
		</div>
	);
}
