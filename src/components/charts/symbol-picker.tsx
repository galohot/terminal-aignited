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
		<div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
			<div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-t-amber">
				<Search className="h-3.5 w-3.5" />
				Add symbol
			</div>
			<p className="mb-3 text-sm leading-6 text-t-text-secondary">
				Search a ticker or company name to load this chart slot.
			</p>
			<input
				type="text"
				placeholder="Search symbols, banks, commodities..."
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm text-t-text placeholder:text-t-text-muted focus:border-t-green focus:outline-none"
			/>
			<div className="mt-3 max-h-56 overflow-y-auto rounded-2xl border border-white/8 bg-black/10">
				{query.length === 0 ? (
					<div className="p-4 text-sm text-t-text-muted">
						Start typing to search across local, US, FX, commodity, or crypto names.
					</div>
				) : isLoading ? (
					<div className="p-4 text-sm text-t-text-muted">Searching…</div>
				) : results.length > 0 ? (
					results.slice(0, 8).map((result) => (
						<button
							key={result.symbol}
							type="button"
							onClick={() => onSelect(result.symbol)}
							className="flex w-full items-start justify-between gap-3 border-b border-white/6 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-white/6"
						>
							<div>
								<div className="font-mono text-xs font-semibold text-t-green">{result.symbol}</div>
								<div className="mt-1 text-xs text-t-text-secondary">
									{result.name ?? "Unnamed instrument"}
								</div>
							</div>
							<div className="font-mono text-[10px] uppercase tracking-[0.18em] text-t-text-muted">
								{result.type}
							</div>
						</button>
					))
				) : (
					<div className="p-4 text-sm text-t-text-muted">No matches for "{query}".</div>
				)}
			</div>
		</div>
	);
}
