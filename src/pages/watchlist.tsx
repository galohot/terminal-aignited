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
		<div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(255,191,71,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(61,220,145,0.10),transparent_24%)]">
			<div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 pb-6">
				<section className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(12,20,20,0.98),rgba(7,11,11,0.97))] shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
					<div className="flex flex-col gap-5 p-5 sm:p-6">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							<div className="min-w-0 max-w-3xl">
								<div className="mb-3 inline-flex items-center gap-2 rounded-full border border-t-amber/30 bg-t-amber/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-t-amber">
									<ListChecks className="h-3.5 w-3.5" />
									Watchlist
								</div>
								<h1 className="break-words text-3xl font-semibold tracking-tight text-white sm:text-[2.45rem]">
									Watchlist
								</h1>
								<p className="mt-3 max-w-3xl break-words text-sm leading-6 text-t-text-secondary sm:text-[15px]">
									Track saved symbols with live prices, leaders, laggards, and keyboard navigation.
								</p>
							</div>
							<div className="grid max-w-full min-w-0 gap-2 rounded-[24px] border border-white/10 bg-black/20 p-3 text-sm text-t-text-secondary">
								<HeaderLine label="Symbols" value={`${symbols.length}`} />
								<HeaderLine label="Navigation" value="J / K / Enter" />
								<HeaderLine label="Remove" value="Delete / Backspace" />
							</div>
						</div>

						<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
					</div>
				</section>

				<WatchlistPanel selectedIndex={selectedIndex} />
			</div>
		</div>
	);
}

function HeaderLine({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col items-start gap-1 font-mono text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-8">
			<span className="uppercase tracking-[0.2em] text-t-text-muted">{label}</span>
			<span className="break-words text-white sm:text-right">{value}</span>
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
		<div className="min-w-0 rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
			<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-t-text-muted">
				<span className="text-t-amber">{icon}</span>
				{label}
			</div>
			<div className="mt-2 break-words text-sm font-semibold leading-6 text-white">{value}</div>
			<div className="mt-2 break-words text-sm leading-6 text-t-text-secondary">{note}</div>
		</div>
	);
}
