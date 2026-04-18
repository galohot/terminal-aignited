import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useSearch } from "../../hooks/use-search";
import { addRecentSearch, getRecentSearches } from "../../lib/recent-searches";
import { SearchResults } from "./search-results";

export function CommandBar() {
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();

	const { data, isLoading } = useSearch(debouncedQuery);
	const results = data?.results ?? [];
	const recentSearches = getRecentSearches();

	// Debounce
	useEffect(() => {
		const id = setTimeout(() => setDebouncedQuery(query.trim()), 300);
		return () => clearTimeout(id);
	}, [query]);

	// Reset selection on results change
	const resultsKey = results.map((r) => r.symbol).join(",");
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset index when results change
	useEffect(() => setSelectedIndex(0), [resultsKey]);

	// Global keyboard shortcut
	useEffect(() => {
		function handleKey(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				inputRef.current?.focus();
			}
			if (
				e.key === "/" &&
				!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
			) {
				e.preventDefault();
				inputRef.current?.focus();
			}
		}
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, []);

	// Close on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const selectSymbol = useCallback(
		(symbol: string) => {
			addRecentSearch(symbol);
			setQuery("");
			setDebouncedQuery("");
			setIsOpen(false);
			navigate(`/stock/${symbol}`);
		},
		[navigate],
	);

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Escape") {
			setIsOpen(false);
			inputRef.current?.blur();
			return;
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
			return;
		}
		if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIndex((i) => Math.max(i - 1, 0));
			return;
		}
		if (e.key === "Enter") {
			e.preventDefault();
			if (results.length > 0 && results[selectedIndex]) {
				selectSymbol(results[selectedIndex].symbol);
			} else if (query.trim()) {
				// Direct navigation if user types a symbol
				selectSymbol(query.trim().toUpperCase());
			}
		}
	}

	return (
		<div ref={containerRef} className="relative min-w-0 flex-1 sm:max-w-[420px]">
			<div className="flex h-[38px] items-center gap-2 rounded-[10px] border border-aig-navy-3/70 bg-aig-navy-1 px-3 transition-colors focus-within:border-aig-ember-500 focus-within:ring-2 focus-within:ring-aig-ember-500/10">
				<Search className="h-4 w-4 shrink-0 text-aig-text-4" />
				<input
					ref={inputRef}
					type="text"
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setIsOpen(true);
					}}
					onFocus={() => setIsOpen(true)}
					onKeyDown={handleKeyDown}
					placeholder="Search ticker, company, or command…"
					className="w-full bg-transparent font-mono text-xs tracking-[0.04em] text-aig-text placeholder:text-aig-text-4 focus:outline-none"
				/>
				<kbd className="hidden shrink-0 rounded-md border border-aig-navy-3/70 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-aig-text-4 sm:inline">
					⌘ K
				</kbd>
			</div>
			{isOpen && (
				<div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-aig-navy-3/70 bg-aig-navy-2 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
					<SearchResults
						results={results}
						recentSearches={recentSearches}
						isLoading={isLoading && debouncedQuery.length > 0}
						query={debouncedQuery}
						selectedIndex={selectedIndex}
						onSelect={selectSymbol}
					/>
				</div>
			)}
		</div>
	);
}
