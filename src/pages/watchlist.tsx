import { WatchlistPanel } from "../components/watchlist/watchlist-panel";

export function WatchlistPage() {
	return (
		<div>
			<div className="border-b border-t-border bg-t-surface px-4 py-3">
				<h1 className="font-mono text-sm font-medium uppercase tracking-wider text-t-text-secondary">
					Watchlist
				</h1>
			</div>
			<WatchlistPanel />
		</div>
	);
}
