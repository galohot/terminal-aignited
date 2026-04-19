import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import {
	Columns2,
	Grid2x2,
	Layers,
	LayoutDashboard,
	LineChart,
	RefreshCw,
	Sparkles,
} from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { useSearchParams } from "react-router";
import { ChartSlot } from "../components/charts/chart-slot";
import { ComparisonChart } from "../components/charts/comparison-chart";
import { useKeyboardShortcut } from "../hooks/use-keyboard";
import { usePageTitle } from "../hooks/use-page-title";
import { api } from "../lib/api";
import { type LayoutMode, slotCount, useChartLayoutStore } from "../stores/chart-layout-store";
import { useWatchlistStore } from "../stores/watchlist-store";

const LAYOUT_ICONS: Record<LayoutMode, typeof Columns2> = {
	single: LayoutDashboard,
	split: Columns2,
	triple: Layers,
	quad: Grid2x2,
};

const LAYOUT_LABELS: Record<LayoutMode, string> = {
	single: "Single",
	split: "Split",
	triple: "Triple",
	quad: "Quad",
};

export function ChartsPage() {
	usePageTitle("Charts");
	const [searchParams] = useSearchParams();
	const layout = useChartLayoutStore((s) => s.layout);
	const setLayout = useChartLayoutStore((s) => s.setLayout);
	const cycleLayout = useChartLayoutStore((s) => s.cycleLayout);
	const symbols = useChartLayoutStore((s) => s.symbols);
	const setSymbol = useChartLayoutStore((s) => s.setSymbol);
	const setSymbols = useChartLayoutStore((s) => s.setSymbols);
	const compareMode = useChartLayoutStore((s) => s.compareMode);
	const toggleCompare = useChartLayoutStore((s) => s.toggleCompare);
	const clearWorkspace = useChartLayoutStore((s) => s.clearWorkspace);
	const watchlistSymbols = useWatchlistStore((s) => s.symbols);

	useEffect(() => {
		const urlSymbols = searchParams.get("symbols");
		if (!urlSymbols) return;
		if (!symbols.every((symbol) => symbol === "")) return;

		const parsed = urlSymbols
			.split(",")
			.map((symbol) => symbol.trim())
			.filter(Boolean)
			.slice(0, 4);

		if (parsed.length > 0) {
			setSymbols(parsed);
		}
	}, [searchParams, setSymbols, symbols]);

	useKeyboardShortcut("l", cycleLayout, [cycleLayout]);
	useKeyboardShortcut("shift+c", toggleCompare, [toggleCompare]);

	const count = slotCount(layout);
	const activeSymbols = symbols.slice(0, count).filter(Boolean);
	const compareReady = activeSymbols.length >= 2;

	const comparisonQueries = useQuery({
		queryKey: ["comparison", ...activeSymbols],
		queryFn: async () => {
			const results = await Promise.all(
				activeSymbols.map(async (symbol) => {
					const response = await api.history(symbol, { period: "1y", interval: "1d" });
					return { symbol, data: response.data };
				}),
			);
			return results;
		},
		enabled: compareMode && compareReady,
		staleTime: 60_000,
	});

	return (
		<div className="min-h-full">
			<div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 pb-6">
				<section className="aig-section overflow-hidden">
					<div className="flex flex-col gap-5">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							<div className="min-w-0 max-w-3xl">
								<div className="mb-3 flex flex-wrap items-center gap-2">
									<Pill tone="blue">Charts</Pill>
									<Pill tone={compareMode ? "green" : "neutral"}>
										{compareMode ? "Compare mode on" : "Single-chart mode"}
									</Pill>
									<Pill tone="neutral">{LAYOUT_LABELS[layout]} layout</Pill>
								</div>
								<h1
									className="break-words text-3xl font-semibold tracking-tight text-ink sm:text-[2.45rem]"
									style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
								>
									Charts
								</h1>
								<p className="mt-3 max-w-3xl break-words text-sm leading-6 text-ink-3 sm:text-[15px]">
									Manage layouts, compare symbols, and load names from the watchlist.
								</p>
							</div>
							<div className="grid max-w-full min-w-0 gap-2 rounded-[18px] border border-rule bg-paper-2 p-3 text-sm text-ink-3">
								<KeyValue label="Active slots" value={`${count}`} />
								<KeyValue label="Loaded symbols" value={`${activeSymbols.length}`} />
								<KeyValue label="Shortcuts" value="L / Shift+C" />
							</div>
						</div>

						<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
							<WorkspaceCard
								label="Workspace"
								value={LAYOUT_LABELS[layout]}
								note="Saved locally."
							/>
							<WorkspaceCard
								label="Compare Mode"
								value={compareMode ? "Enabled" : "Disabled"}
								note={
									compareMode
										? compareReady
											? "Relative performance view ready."
											: "Add two symbols."
										: "Normalized 1Y performance."
								}
							/>
							<WorkspaceCard
								label="Watchlist"
								value={`${Math.min(watchlistSymbols.length, 4)} symbols available`}
								note="Load up to four symbols."
							/>
							<WorkspaceCard
								label="Loaded"
								value={activeSymbols.length ? activeSymbols.join(" · ") : "No symbols yet"}
								note="Active symbols."
							/>
						</div>

						<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
							<div className="flex flex-wrap items-center gap-2">
								{(Object.keys(LAYOUT_ICONS) as LayoutMode[]).map((mode) => {
									const Icon = LAYOUT_ICONS[mode];
									return (
										<button
											key={mode}
											type="button"
											onClick={() => setLayout(mode)}
											className={clsx(
												"inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors",
												layout === mode
													? "border-ink bg-ink text-paper"
													: "border-rule bg-card text-ink-3 hover:bg-paper-2 hover:text-ink",
											)}
										>
											<Icon className="h-3.5 w-3.5" />
											{LAYOUT_LABELS[mode]}
										</button>
									);
								})}
								<button
									type="button"
									onClick={toggleCompare}
									className={clsx(
										"inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors",
										compareMode
											? "border-[rgba(23,165,104,0.28)] bg-[rgba(23,165,104,0.1)] text-pos"
											: "border-rule bg-card text-ink-3 hover:bg-paper-2 hover:text-ink",
									)}
								>
									<LineChart className="h-3.5 w-3.5" />
									Compare
								</button>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									onClick={() => setSymbols(watchlistSymbols)}
									className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
								>
									<Sparkles className="h-3.5 w-3.5" />
									Load Watchlist
								</button>
								<button
									type="button"
									onClick={clearWorkspace}
									className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
								>
									<RefreshCw className="h-3.5 w-3.5" />
									Clear
								</button>
							</div>
						</div>
					</div>
				</section>

				<section className="aig-section p-3">
					{compareMode ? (
						<div className="flex min-h-[640px] flex-col">
							<div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-3 py-3">
								<div>
									<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember-600">
										Comparison View
									</div>
									<p className="mt-1 text-sm text-ink-3">
										One-year relative performance.
									</p>
								</div>
								<div className="max-w-full break-words font-mono text-xs text-ink-4 sm:text-right">
									{activeSymbols.length ? activeSymbols.join(" · ") : "Add symbols to start"}
								</div>
							</div>
							<div className="flex-1 p-3">
								{compareReady ? (
									comparisonQueries.data ? (
										<ComparisonChart datasets={comparisonQueries.data} height={560} />
									) : comparisonQueries.isLoading ? (
										<ChartEmptyState
											title="Loading comparison"
											body="Fetching one-year history for the active chart set."
										/>
									) : (
										<ChartEmptyState
											title="Comparison unavailable"
											body="Historical data could not be loaded for one or more symbols."
										/>
									)
								) : (
									<ChartEmptyState
										title="Add at least two symbols"
										body="Load at least two symbols to compare."
									/>
								)}
							</div>
						</div>
					) : (
						<div
							className={clsx(
								"grid min-h-[640px] gap-3",
								layout === "single" && "grid-cols-1 grid-rows-1",
								layout === "split" && "grid-cols-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1",
								layout === "quad" && "grid-cols-1 grid-rows-4 md:grid-cols-2 md:grid-rows-2",
								layout === "triple" && "grid-cols-1 grid-rows-3 md:grid-cols-2 md:grid-rows-2",
							)}
						>
							{Array.from({ length: count }).map((_, index) => {
								const slotKey = `slot-${index}`;
								return (
									<div
										key={slotKey}
										className={clsx(layout === "triple" && index === 0 && "md:row-span-2")}
									>
										<ChartSlot
											symbol={symbols[index]}
											onSymbolChange={(symbol) => setSymbol(index, symbol)}
											compact={layout !== "single" && !(layout === "triple" && index === 0)}
										/>
									</div>
								);
							})}
						</div>
					)}
				</section>
			</div>
		</div>
	);
}

function WorkspaceCard({ label, note, value }: { label: string; note: string; value: string }) {
	return (
		<div className="min-w-0 rounded-[18px] border border-rule bg-paper-2 p-4">
			<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-4">
				{label}
			</div>
			<div className="mt-2 break-words text-sm font-semibold leading-6 text-ink">{value}</div>
			<div className="mt-2 break-words text-sm leading-6 text-ink-3">{note}</div>
		</div>
	);
}

function KeyValue({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col items-start gap-1 font-mono text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-8">
			<span className="uppercase tracking-[0.2em] text-ink-4">{label}</span>
			<span className="break-words text-ink sm:text-right">{value}</span>
		</div>
	);
}

function Pill({ children, tone }: { children: ReactNode; tone: "blue" | "green" | "neutral" }) {
	const classes =
		tone === "blue"
			? "border-[rgba(29,95,201,0.28)] bg-[rgba(29,95,201,0.08)] text-cyan-700"
			: tone === "green"
				? "border-[rgba(23,165,104,0.28)] bg-[rgba(23,165,104,0.1)] text-pos"
				: "border-rule bg-paper-2 text-ink-3";

	return (
		<span
			className={`rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.22em] ${classes}`}
		>
			{children}
		</span>
	);
}

function ChartEmptyState({ body, title }: { body: string; title: string }) {
	return (
		<div className="flex h-full min-h-[320px] items-center justify-center rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-8 text-center">
			<div className="max-w-md">
				<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember-600">
					{title}
				</div>
				<p className="mt-3 text-sm leading-6 text-ink-3">{body}</p>
			</div>
		</div>
	);
}
