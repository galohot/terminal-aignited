import { clsx } from "clsx";
import type { SearchResult } from "../../types/market";

interface SearchResultsProps {
	results: SearchResult[];
	recentSearches: string[];
	isLoading: boolean;
	query: string;
	selectedIndex: number;
	onSelect: (symbol: string) => void;
}

export function SearchResults({
	results,
	recentSearches,
	isLoading,
	query,
	selectedIndex,
	onSelect,
}: SearchResultsProps) {
	if (isLoading) {
		return <div className="p-3 text-center font-mono text-xs text-t-text-muted">Searching...</div>;
	}

	if (query.length > 0 && results.length === 0) {
		return <div className="p-3 text-center font-mono text-xs text-t-text-muted">No results</div>;
	}

	if (query.length === 0 && recentSearches.length > 0) {
		return (
			<div>
				<div className="border-b border-t-border px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-t-text-muted">
					Recent
				</div>
				<div className="flex flex-wrap gap-1.5 px-3 py-2">
					{recentSearches.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => onSelect(s)}
							className="rounded bg-t-hover px-2 py-0.5 font-mono text-xs text-t-text-secondary transition-colors hover:bg-t-border-active"
						>
							{s}
						</button>
					))}
				</div>
			</div>
		);
	}

	if (results.length === 0) return null;

	return (
		<div>
			{results.map((r, i) => (
				<button
					key={r.symbol}
					type="button"
					onClick={() => onSelect(r.symbol)}
					className={clsx(
						"flex w-full items-center gap-3 px-3 py-1.5 text-left transition-colors",
						i === selectedIndex ? "bg-t-hover" : "hover:bg-t-hover",
					)}
				>
					<span className="w-20 shrink-0 font-mono text-xs font-medium text-t-green">
						{r.symbol}
					</span>
					<span className="min-w-0 flex-1 truncate text-xs text-t-text-secondary">
						{r.name ?? ""}
					</span>
					<span className="shrink-0 text-[10px] uppercase text-t-text-muted">{r.type}</span>
					{r.tier === 1 && (
						<span className="shrink-0 rounded bg-t-green-dim px-1 py-0.5 font-mono text-[10px] text-t-green">
							T1
						</span>
					)}
				</button>
			))}
		</div>
	);
}
