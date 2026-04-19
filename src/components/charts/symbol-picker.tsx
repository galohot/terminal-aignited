import { Search } from "lucide-react";
import { useState } from "react";
import { useSearch } from "../../hooks/use-search";

interface SymbolPickerProps {
	onSelect: (symbol: string) => void;
}

export function SymbolPicker({ onSelect }: SymbolPickerProps) {
	const [query, setQuery] = useState("");
	const { data, isLoading } = useSearch(query);
	const results = data?.results ?? [];

	return (
		<div className="w-full max-w-md rounded-[18px] border border-rule bg-card p-4 shadow-[0_8px_24px_rgba(20,23,53,0.08)]">
			<div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ember-600">
				<Search className="h-3.5 w-3.5" />
				Add symbol
			</div>
			<p className="mb-3 text-sm leading-6 text-ink-3">
				Search a ticker or company name to load this chart slot.
			</p>
			<input
				type="text"
				placeholder="Search symbols, banks, commodities..."
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				className="w-full rounded-[14px] border border-rule bg-paper-2 px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-4 focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/15"
			/>
			<div className="mt-3 max-h-56 overflow-y-auto rounded-[14px] border border-rule bg-paper-2/60">
				{query.length === 0 ? (
					<div className="p-4 text-sm text-ink-4">
						Start typing to search across local, US, FX, commodity, or crypto names.
					</div>
				) : isLoading ? (
					<div className="p-4 text-sm text-ink-4">Searching…</div>
				) : results.length > 0 ? (
					results.slice(0, 8).map((result) => (
						<button
							key={result.symbol}
							type="button"
							onClick={() => onSelect(result.symbol)}
							className="flex w-full items-start justify-between gap-3 border-b border-rule px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-card"
						>
							<div>
								<div className="font-mono text-xs font-semibold text-ember-600">{result.symbol}</div>
								<div className="mt-1 text-xs text-ink-3">
									{result.name ?? "Unnamed instrument"}
								</div>
							</div>
							<div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4">
								{result.type}
							</div>
						</button>
					))
				) : (
					<div className="p-4 text-sm text-ink-4">No matches for "{query}".</div>
				)}
			</div>
		</div>
	);
}
