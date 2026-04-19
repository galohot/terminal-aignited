import { Eye, Keyboard, ListChecks, TrendingUp } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useNavigate } from "react-router";
import { WatchlistPanel } from "../components/watchlist/watchlist-panel";
import { useKeyboardShortcut } from "../hooks/use-keyboard";
import { usePageTitle } from "../hooks/use-page-title";
import { useWatchlistStore } from "../stores/watchlist-store";

export function WatchlistPage() {
	usePageTitle("Watchlist");
	const navigate = useNavigate();
	const symbols = useWatchlistStore((state) => state.symbols);
	const removeSymbol = useWatchlistStore((state) => state.removeSymbol);
	const [selectedIndex, setSelectedIndex] = useState(-1);

	useKeyboardShortcut(
		"j",
		() => setSelectedIndex((index) => Math.min(index + 1, symbols.length - 1)),
		[symbols.length],
	);
	useKeyboardShortcut("k", () => setSelectedIndex((index) => Math.max(index - 1, 0)), []);
	useKeyboardShortcut(
		"arrowdown",
		() => setSelectedIndex((index) => Math.min(index + 1, symbols.length - 1)),
		[symbols.length],
	);
	useKeyboardShortcut("arrowup", () => setSelectedIndex((index) => Math.max(index - 1, 0)), []);
	useKeyboardShortcut("enter", () => {
		if (selectedIndex >= 0 && selectedIndex < symbols.length) {
			navigate(`/stock/${symbols[selectedIndex]}`);
		}
	}, [navigate, selectedIndex, symbols]);
	useKeyboardShortcut("delete", () => {
		if (selectedIndex >= 0 && selectedIndex < symbols.length) {
			removeSymbol(symbols[selectedIndex]);
			setSelectedIndex((index) => Math.min(index, symbols.length - 2));
		}
	}, [removeSymbol, selectedIndex, symbols]);
	useKeyboardShortcut("backspace", () => {
		if (selectedIndex >= 0 && selectedIndex < symbols.length) {
			removeSymbol(symbols[selectedIndex]);
			setSelectedIndex((index) => Math.min(index, symbols.length - 2));
		}
	}, [removeSymbol, selectedIndex, symbols]);

	return (
		<div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 pb-8">
			<section>
				<div className="mb-3 flex items-center gap-3">
					<span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ember-600">
						<ListChecks className="h-3.5 w-3.5" />
						Watchlist
					</span>
					<span className="h-px max-w-[80px] flex-1 bg-ember-400/40" />
				</div>
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div className="min-w-0 max-w-3xl">
						<h1
							className="break-words text-[clamp(2rem,4vw,2.5rem)] leading-[1.05] text-ink"
							style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
						>
							Your <em className="text-ember-600">Watchlist</em>
						</h1>
						<p className="mt-3 max-w-3xl break-words text-sm leading-6 text-ink-3">
							Track saved symbols with live prices, leaders, laggards, and keyboard navigation.
						</p>
					</div>
					<div className="grid min-w-0 max-w-full gap-2 rounded-[18px] border border-rule bg-card p-3 text-sm text-ink-3">
						<HeaderLine label="Symbols" value={`${symbols.length}`} />
						<HeaderLine label="Navigation" value="J / K / Enter" />
						<HeaderLine label="Remove" value="Delete / Backspace" />
					</div>
				</div>

				<div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
					<PageCard
						icon={<Eye className="h-4 w-4" />}
						label="Coverage"
						value={`${symbols.length} tracked`}
						note="Saved symbols."
					/>
					<PageCard
						icon={<TrendingUp className="h-4 w-4" />}
						label="Flow"
						value="Realtime overlay"
						note="Rows update in place."
					/>
					<PageCard
						icon={<Keyboard className="h-4 w-4" />}
						label="Speed"
						value="Keyboard ready"
						note="J, K, Enter, Delete."
					/>
					<PageCard
						icon={<ListChecks className="h-4 w-4" />}
						label="Mode"
						value="Daily monitor"
						note="Saved local board."
					/>
				</div>
			</section>

			<WatchlistPanel selectedIndex={selectedIndex} />
		</div>
	);
}

function HeaderLine({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col items-start gap-1 font-mono text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-8">
			<span className="uppercase tracking-[0.2em] text-ink-4">{label}</span>
			<span className="break-words text-ink sm:text-right">{value}</span>
		</div>
	);
}

function PageCard({
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
		<div className="min-w-0 rounded-[18px] border border-rule bg-card p-4">
			<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-4">
				<span className="text-ember-600">{icon}</span>
				{label}
			</div>
			<div className="mt-2 break-words text-sm font-semibold leading-6 text-ink">{value}</div>
			<div className="mt-2 break-words text-sm leading-6 text-ink-3">{note}</div>
		</div>
	);
}
