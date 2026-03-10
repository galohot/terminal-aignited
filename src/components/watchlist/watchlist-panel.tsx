import { useBatchQuotes } from "../../hooks/use-batch-quotes";
import { useWatchlistStore } from "../../stores/watchlist-store";
import { Skeleton } from "../ui/loading";
import { WatchlistRow } from "./watchlist-row";

interface WatchlistPanelProps {
	selectedIndex?: number;
}

export function WatchlistPanel({ selectedIndex = -1 }: WatchlistPanelProps) {
	const symbols = useWatchlistStore((s) => s.symbols);
	const removeSymbol = useWatchlistStore((s) => s.removeSymbol);
	const { data, isLoading } = useBatchQuotes(symbols);

	if (symbols.length === 0) {
		return (
			<div className="p-8 text-center font-mono text-sm text-t-text-muted">
				Add symbols to your watchlist — use Ctrl+K to search
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="p-4">
				<Skeleton className="h-[300px] w-full" />
			</div>
		);
	}

	const quotes = data?.quotes ?? [];

	// Sort quotes to match watchlist order
	const ordered = symbols
		.map((sym) => quotes.find((q) => q.symbol === sym))
		.filter((q) => q != null);

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-xs">
				<thead>
					<tr className="border-b border-t-border">
						<th className="px-3 py-2 text-left font-medium text-t-text-secondary">Symbol</th>
						<th className="px-3 py-2 text-left font-medium text-t-text-secondary">Name</th>
						<th className="px-3 py-2 text-right font-medium text-t-text-secondary">Price</th>
						<th className="px-3 py-2 text-right font-medium text-t-text-secondary">Change</th>
						<th className="px-3 py-2 text-left font-medium text-t-text-secondary">5D</th>
						<th className="w-8 px-3 py-2" />
					</tr>
				</thead>
				<tbody>
					{ordered.map((q, i) => (
						<WatchlistRow
							key={q.symbol}
							quote={q}
							onRemove={removeSymbol}
							selected={i === selectedIndex}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
}
