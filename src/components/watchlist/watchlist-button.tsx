import { clsx } from "clsx";
import { Star } from "lucide-react";
import { useWatchlistStore } from "../../stores/watchlist-store";

export function WatchlistButton({ symbol }: { symbol: string }) {
	const hasSymbol = useWatchlistStore((s) => s.hasSymbol(symbol));
	const addSymbol = useWatchlistStore((s) => s.addSymbol);
	const removeSymbol = useWatchlistStore((s) => s.removeSymbol);

	return (
		<button
			type="button"
			onClick={() => (hasSymbol ? removeSymbol(symbol) : addSymbol(symbol))}
			className={clsx(
				"flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs transition-colors",
				hasSymbol
					? "border-ember-400/40 bg-ember-50 text-ember-700"
					: "border-rule bg-card text-ink-3 hover:bg-paper-2 hover:text-ink",
			)}
		>
			<Star className={clsx("h-3 w-3", hasSymbol && "fill-current")} />
			{hasSymbol ? "Watching" : "Watch"}
		</button>
	);
}
