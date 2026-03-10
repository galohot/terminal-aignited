import { useState } from "react";
import { useNavigate } from "react-router";
import { WatchlistPanel } from "../components/watchlist/watchlist-panel";
import { useKeyboardShortcut } from "../hooks/use-keyboard";
import { useWatchlistStore } from "../stores/watchlist-store";

export function WatchlistPage() {
	const navigate = useNavigate();
	const symbols = useWatchlistStore((s) => s.symbols);
	const removeSymbol = useWatchlistStore((s) => s.removeSymbol);
	const [selectedIndex, setSelectedIndex] = useState(-1);

	useKeyboardShortcut("j", () => setSelectedIndex((i) => Math.min(i + 1, symbols.length - 1)), [
		symbols.length,
	]);
	useKeyboardShortcut("k", () => setSelectedIndex((i) => Math.max(i - 1, 0)), []);
	useKeyboardShortcut(
		"arrowdown",
		() => setSelectedIndex((i) => Math.min(i + 1, symbols.length - 1)),
		[symbols.length],
	);
	useKeyboardShortcut("arrowup", () => setSelectedIndex((i) => Math.max(i - 1, 0)), []);
	useKeyboardShortcut("enter", () => {
		if (selectedIndex >= 0 && selectedIndex < symbols.length) {
			navigate(`/stock/${symbols[selectedIndex]}`);
		}
	}, [selectedIndex, symbols, navigate]);
	useKeyboardShortcut("delete", () => {
		if (selectedIndex >= 0 && selectedIndex < symbols.length) {
			removeSymbol(symbols[selectedIndex]);
			setSelectedIndex((i) => Math.min(i, symbols.length - 2));
		}
	}, [selectedIndex, symbols, removeSymbol]);
	useKeyboardShortcut("backspace", () => {
		if (selectedIndex >= 0 && selectedIndex < symbols.length) {
			removeSymbol(symbols[selectedIndex]);
			setSelectedIndex((i) => Math.min(i, symbols.length - 2));
		}
	}, [selectedIndex, symbols, removeSymbol]);

	return (
		<div>
			<div className="flex items-center justify-between border-b border-t-border bg-t-surface px-4 py-3">
				<h1 className="font-mono text-sm font-medium uppercase tracking-wider text-t-text-secondary">
					Watchlist
				</h1>
				<span className="font-mono text-[10px] text-t-text-muted">
					j/k navigate &middot; Enter open &middot; Del remove
				</span>
			</div>
			<WatchlistPanel selectedIndex={selectedIndex} />
		</div>
	);
}
