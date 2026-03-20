import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { HeatmapStock } from "../../types/market";

interface StockTooltip {
	x: number;
	y: number;
	stock: HeatmapStock;
}

interface RootDatum {
	name: string;
	children: SectorGroupDatum[];
}

interface SectorGroupDatum {
	name: string;
	children: StockLeafDatum[];
}

interface StockLeafDatum {
	name: string;
	value: number;
	stock: HeatmapStock;
}

type TreeDatum = RootDatum | SectorGroupDatum | StockLeafDatum;

export function StockHeatmap({ stocks }: { stocks: HeatmapStock[] }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const [tooltip, setTooltip] = useState<StockTooltip | null>(null);

	const isEmpty = stocks.length === 0;

	useEffect(() => {
		const container = containerRef.current;
		const svgEl = svgRef.current;
		if (!container || !svgEl || isEmpty) return;

		const W = container.clientWidth || 800;
		const H = 360;

		const svg = d3.select(svgEl);
		svg.selectAll("*").remove();
		svg.attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H);

		// Group by sector
		const bySector = new Map<string, HeatmapStock[]>();
		for (const s of stocks) {
			const arr = bySector.get(s.sector) || [];
			arr.push(s);
			bySector.set(s.sector, arr);
		}

		const rootData: RootDatum = {
			name: "root",
			children: Array.from(bySector.entries()).map(([sector, sectorStocks]) => ({
				name: sector,
				children: sectorStocks.map((s) => ({
					name: s.symbol,
					value: s.market_cap ?? s.volume,
					stock: s,
				})),
			})),
		};

		const maxAbs = Math.max(
			...stocks.map((s) => Math.abs(s.change_percent)),
			1,
		);
		const colorScale = d3
			.scaleLinear<string>()
			.domain([-maxAbs, 0, maxAbs])
			.range(["#ef4444", "#262626", "#22c55e"])
			.clamp(true);

		const root = d3
			.hierarchy<TreeDatum>(rootData)
			.sum((d) => (d as StockLeafDatum).value ?? 0)
			.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

		d3.treemap<TreeDatum>()
			.size([W, H])
			.paddingOuter(2)
			.paddingInner(1)
			.paddingTop(14)
			.round(true)(root);

		const leaves = root.leaves() as d3.HierarchyRectangularNode<StockLeafDatum>[];

		// Draw sector labels
		const sectorNodes = root.children as d3.HierarchyRectangularNode<SectorGroupDatum>[] | undefined;
		if (sectorNodes) {
			svg
				.selectAll<SVGTextElement, d3.HierarchyRectangularNode<SectorGroupDatum>>("text.sector-label")
				.data(sectorNodes.filter((d) => d.x1 - d.x0 > 40))
				.join("text")
				.attr("class", "sector-label")
				.attr("x", (d) => d.x0 + 3)
				.attr("y", (d) => d.y0 + 11)
				.attr("fill", "#6b7280")
				.attr("font-size", "9px")
				.attr("font-family", "ui-monospace, monospace")
				.attr("pointer-events", "none")
				.text((d) => {
					const maxChars = Math.floor((d.x1 - d.x0) / 6);
					const name = d.data.name;
					return name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
				});
		}

		// Draw stock cells
		const cells = svg
			.selectAll<SVGGElement, d3.HierarchyRectangularNode<StockLeafDatum>>("g.cell")
			.data(leaves)
			.join("g")
			.attr("class", "cell")
			.attr("transform", (d) => `translate(${d.x0},${d.y0})`);

		cells
			.append("rect")
			.attr("width", (d) => Math.max(0, d.x1 - d.x0))
			.attr("height", (d) => Math.max(0, d.y1 - d.y0))
			.attr("fill", (d) => colorScale(d.data.stock.change_percent))
			.attr("stroke", "#0a0a0a")
			.attr("stroke-width", 0.5)
			.attr("rx", 2);

		// Ticker text
		cells
			.filter((d) => d.x1 - d.x0 > 32 && d.y1 - d.y0 > 18)
			.each(function (d) {
				const g = d3.select(this);
				const cellW = d.x1 - d.x0;
				const cellH = d.y1 - d.y0;
				const ticker = d.data.stock.symbol.replace(".JK", "");
				const maxChars = Math.floor(cellW / 6.5);
				const label = ticker.length > maxChars ? ticker.slice(0, maxChars) : ticker;

				g.append("text")
					.attr("x", cellW / 2)
					.attr("y", cellH / 2 - (cellH > 30 ? 3 : 0))
					.attr("text-anchor", "middle")
					.attr("dominant-baseline", "central")
					.attr("fill", "#ffffffcc")
					.attr("font-size", cellW > 60 ? "10px" : "8px")
					.attr("font-weight", "600")
					.attr("font-family", "ui-monospace, monospace")
					.attr("pointer-events", "none")
					.text(label);

				if (cellH > 30 && cellW > 36) {
					const change = d.data.stock.change_percent;
					g.append("text")
						.attr("x", cellW / 2)
						.attr("y", cellH / 2 + 10)
						.attr("text-anchor", "middle")
						.attr("dominant-baseline", "central")
						.attr("fill", change >= 0 ? "#22c55ecc" : "#ef4444cc")
						.attr("font-size", "8px")
						.attr("font-family", "ui-monospace, monospace")
						.attr("pointer-events", "none")
						.text(`${change >= 0 ? "+" : ""}${change.toFixed(1)}%`);
				}
			});

		// Hover
		cells
			.on("mouseover", function (event: MouseEvent, d) {
				d3.select(this).select("rect").attr("stroke", "#ffffff40").attr("stroke-width", 1.5);
				const rect = containerRef.current?.getBoundingClientRect();
				if (!rect) return;
				setTooltip({
					x: event.clientX - rect.left,
					y: event.clientY - rect.top,
					stock: d.data.stock,
				});
			})
			.on("mousemove", function (event: MouseEvent) {
				const rect = containerRef.current?.getBoundingClientRect();
				if (!rect) return;
				setTooltip((prev) =>
					prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : prev,
				);
			})
			.on("mouseout", function () {
				d3.select(this).select("rect").attr("stroke", "#0a0a0a").attr("stroke-width", 0.5);
				setTooltip(null);
			});

		return () => {
			svg.selectAll("*").remove();
		};
	}, [stocks, isEmpty]);

	return (
		<div className="rounded-lg border border-t-border bg-white/[0.02]">
			<div className="border-b border-t-border px-4 py-3">
				<h3 className="font-mono text-sm font-semibold text-white">Stock Heatmap</h3>
				<p className="mt-0.5 font-mono text-[10px] text-t-text-muted">
					{stocks.length} stocks · Size = market cap · Color = daily change
				</p>
			</div>
			{isEmpty ? (
				<div className="flex h-[360px] items-center justify-center">
					<p className="font-mono text-xs text-t-text-muted">No heatmap data available</p>
				</div>
			) : (
				<div ref={containerRef} className="relative w-full" style={{ height: 360 }}>
					<svg ref={svgRef} className="w-full" style={{ height: 360, display: "block" }} />
					{tooltip && (
						<div
							className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-black/90 px-3 py-2 shadow-xl"
							style={{
								left: tooltip.x + 12,
								top: tooltip.y - 10,
								transform:
									tooltip.x > (containerRef.current?.clientWidth ?? 0) * 0.65
										? "translateX(-110%)"
										: undefined,
							}}
						>
							<div className="font-mono text-sm font-semibold text-white">
								{tooltip.stock.symbol.replace(".JK", "")}
							</div>
							<div className="font-mono text-[10px] text-t-text-muted">{tooltip.stock.name}</div>
							<div
								className={`mt-1 font-mono text-xs font-medium ${
									tooltip.stock.change_percent >= 0 ? "text-t-green" : "text-t-red"
								}`}
							>
								{tooltip.stock.change_percent >= 0 ? "+" : ""}
								{tooltip.stock.change_percent.toFixed(2)}% · Rp{tooltip.stock.price.toLocaleString()}
							</div>
							<div className="mt-0.5 font-mono text-[10px] text-t-text-muted">
								{tooltip.stock.sector} · Vol {(tooltip.stock.volume / 1e6).toFixed(1)}M
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
