import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Columns2, Grid2x2, Layers, LayoutDashboard } from "lucide-react";
import { useSearchParams } from "react-router";
import { ChartSlot } from "../components/charts/chart-slot";
import { ComparisonChart } from "../components/charts/comparison-chart";
import { useKeyboardShortcut } from "../hooks/use-keyboard";
import { api } from "../lib/api";
import { type LayoutMode, slotCount, useChartLayoutStore } from "../stores/chart-layout-store";

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
	const [searchParams] = useSearchParams();
	const layout = useChartLayoutStore((s) => s.layout);
	const setLayout = useChartLayoutStore((s) => s.setLayout);
	const cycleLayout = useChartLayoutStore((s) => s.cycleLayout);
	const symbols = useChartLayoutStore((s) => s.symbols);
	const setSymbol = useChartLayoutStore((s) => s.setSymbol);
	const compareMode = useChartLayoutStore((s) => s.compareMode);
	const toggleCompare = useChartLayoutStore((s) => s.toggleCompare);

	// Initialize from URL params on first render
	const urlSymbols = searchParams.get("symbols");
	if (urlSymbols && symbols.every((s) => s === "")) {
		const parsed = urlSymbols.split(",").filter(Boolean);
		for (let i = 0; i < parsed.length && i < 4; i++) {
			setSymbol(i, parsed[i]);
		}
		if (parsed.length > 1) {
			setLayout("split");
		}
	}

	useKeyboardShortcut("l", cycleLayout, [cycleLayout]);
	useKeyboardShortcut("shift+c", toggleCompare, [toggleCompare]);

	const count = slotCount(layout);
	const activeSymbols = symbols.slice(0, count).filter(Boolean);

	// Fetch history for comparison mode
	const comparisonQueries = useQuery({
		queryKey: ["comparison", ...activeSymbols],
		queryFn: async () => {
			const results = await Promise.all(
				activeSymbols.map(async (sym) => {
					const res = await api.history(sym, { period: "1y", interval: "1d" });
					return { symbol: sym, data: res.data };
				}),
			);
			return results;
		},
		enabled: compareMode && activeSymbols.length >= 2,
		staleTime: 60_000,
	});

	return (
		<div className="flex h-full flex-col">
			{/* Toolbar */}
			<div className="flex items-center justify-between border-b border-t-border bg-t-surface px-4 py-2">
				<div className="flex items-center gap-1">
					{(Object.keys(LAYOUT_ICONS) as LayoutMode[]).map((mode) => {
						const Icon = LAYOUT_ICONS[mode];
						return (
							<button
								key={mode}
								type="button"
								onClick={() => setLayout(mode)}
								title={`${LAYOUT_LABELS[mode]} (L)`}
								className={clsx(
									"rounded p-1.5 transition-colors",
									layout === mode
										? "bg-t-border-active text-t-text"
										: "text-t-text-muted hover:bg-t-hover hover:text-t-text-secondary",
								)}
							>
								<Icon className="h-4 w-4" />
							</button>
						);
					})}
					<div className="mx-2 h-4 w-px bg-t-border" />
					<button
						type="button"
						onClick={toggleCompare}
						title="Compare mode (Shift+C)"
						className={clsx(
							"rounded px-2 py-1 font-mono text-xs transition-colors",
							compareMode
								? "bg-t-green/20 text-t-green"
								: "text-t-text-muted hover:bg-t-hover hover:text-t-text-secondary",
						)}
					>
						Compare
					</button>
				</div>
				<span className="font-mono text-[10px] text-t-text-muted">L cycle layout</span>
			</div>

			{/* Chart area */}
			<div className="flex-1 overflow-hidden">
				{compareMode && activeSymbols.length >= 2 ? (
					<div className="h-full p-2">
						{comparisonQueries.data ? (
							<ComparisonChart datasets={comparisonQueries.data} height={500} />
						) : comparisonQueries.isLoading ? (
							<div className="flex h-full items-center justify-center font-mono text-xs text-t-text-muted">
								Loading comparison...
							</div>
						) : (
							<div className="flex h-full items-center justify-center font-mono text-xs text-t-text-muted">
								Add at least 2 symbols to compare
							</div>
						)}
					</div>
				) : (
					<div
						className={clsx(
							"grid h-full gap-1 p-1",
							layout === "single" && "grid-cols-1 grid-rows-1",
							layout === "split" && "grid-cols-2 grid-rows-1",
							layout === "quad" && "grid-cols-2 grid-rows-2",
							layout === "triple" && "grid-cols-2 grid-rows-2",
						)}
					>
						{Array.from({ length: count }).map((_, i) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed layout slots
								key={i}
								className={clsx(layout === "triple" && i === 0 && "row-span-2")}
							>
								<ChartSlot
									symbol={symbols[i]}
									onSymbolChange={(sym) => setSymbol(i, sym)}
									compact={layout !== "single" && !(layout === "triple" && i === 0)}
								/>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
