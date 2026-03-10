import { useState } from "react";
import { useSearch } from "../../hooks/use-search";

interface SymbolPickerProps {
	onSelect: (symbol: string) => void;
}

export function SymbolPicker({ onSelect }: SymbolPickerProps) {
	const [query, setQuery] = useState("");
	const { data } = useSearch(query);
	const results = data?.results ?? [];

	return (
		<div className="flex w-64 flex-col items-center gap-2 p-4">
			<p className="font-mono text-xs text-t-text-muted">Add symbol</p>
			<input
				type="text"
				placeholder="Search..."
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				className="w-full rounded border border-t-border bg-t-bg px-2 py-1 font-mono text-xs text-t-text placeholder:text-t-text-muted focus:border-t-green focus:outline-none"
			/>
			{results.length > 0 && (
				<div className="max-h-40 w-full overflow-y-auto">
					{results.slice(0, 8).map((r) => (
						<button
							key={r.symbol}
							type="button"
							onClick={() => onSelect(r.symbol)}
							className="flex w-full items-center justify-between px-2 py-1 text-left transition-colors hover:bg-t-hover"
						>
							<span className="font-mono text-xs text-t-green">{r.symbol}</span>
							<span className="max-w-[140px] truncate text-xs text-t-text-muted">{r.name}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
