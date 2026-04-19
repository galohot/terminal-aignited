import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { SectorPerformanceItem } from "../../types/flow";

interface HeatmapTooltip {
	x: number;
	y: number;
	sector: SectorPerformanceItem;
}

interface RootDatum {
	name: string;
	children: SectorDatum[];
}

interface SectorDatum {
	name: string;
	value: number;
	sector: SectorPerformanceItem;
}

export function SectorHeatmap({ sectors }: { sectors: SectorPerformanceItem[] }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const [tooltip, setTooltip] = useState<HeatmapTooltip | null>(null);

	const validSectors = sectors.filter((s) => (s.total_stocks ?? 0) > 0);
	const totalStocks = validSectors.reduce((s, sec) => s + (sec.total_stocks ?? 0), 0);
	const isEmpty = validSectors.length === 0 || totalStocks === 0;

	useEffect(() => {
		const container = containerRef.current;
		const svgEl = svgRef.current;
		if (!container || !svgEl || isEmpty) return;

		const W = container.clientWidth || 800;
		const H = 320;

		const svg = d3.select(svgEl);
		svg.selectAll("*").remove();

		const maxAbs = Math.max(...validSectors.map((s) => Math.abs(s.avg_change_percent ?? 0)), 1);
		const colorScale = d3
			.scaleLinear<string>()
			.domain([-maxAbs, 0, maxAbs])
			.range(["#d2344a", "#f2ede4", "#17a568"])
			.clamp(true);

		svg.attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H);

		const root: d3.HierarchyNode<RootDatum | SectorDatum> = d3
			.hierarchy<RootDatum | SectorDatum>({
				name: "root",
				children: validSectors.map((s) => ({
					name: s.sector,
					value: s.total_stocks ?? 1,
					sector: s,
				})),
			} as RootDatum)
			.sum((d) => (d as SectorDatum).value ?? 0)
			.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

		d3.treemap<RootDatum | SectorDatum>().size([W, H]).paddingOuter(3).paddingInner(2).round(true)(
			root,
		);

		const leaves = root.leaves() as d3.HierarchyRectangularNode<SectorDatum>[];

		const cells = svg
			.selectAll<SVGGElement, d3.HierarchyRectangularNode<SectorDatum>>("g.cell")
			.data(leaves)
			.join("g")
			.attr("class", "cell")
			.attr("transform", (d) => `translate(${d.x0},${d.y0})`);

		cells
			.append("rect")
			.attr("width", (d) => Math.max(0, d.x1 - d.x0))
			.attr("height", (d) => Math.max(0, d.y1 - d.y0))
			.attr("fill", (d) => colorScale(d.data.sector.avg_change_percent ?? 0))
			.attr("stroke", "#ffffff")
			.attr("stroke-width", 1)
			.attr("rx", 3);

		cells
			.filter((d) => d.x1 - d.x0 > 50 && d.y1 - d.y0 > 22)
			.each(function (d) {
				const g = d3.select(this);
				const cellW = d.x1 - d.x0;
				const cellH = d.y1 - d.y0;
				const maxChars = Math.floor(cellW / 7);

				const name = d.data.sector.sector;
				const label = name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;

				g.append("text")
					.attr("x", 6)
					.attr("y", 15)
					.attr("fill", "#141735")
					.attr("font-size", "10px")
					.attr("font-family", "ui-monospace, monospace")
					.attr("pointer-events", "none")
					.text(label);

				if (cellH >= 36) {
					const change = d.data.sector.avg_change_percent ?? 0;
					g.append("text")
						.attr("x", 6)
						.attr("y", 28)
						.attr("fill", change >= 0 ? "#0b7a4a" : "#a02636")
						.attr("font-size", "11px")
						.attr("font-weight", "600")
						.attr("font-family", "ui-monospace, monospace")
						.attr("pointer-events", "none")
						.text(`${change >= 0 ? "+" : ""}${change.toFixed(2)}%`);
				}

				if (cellH >= 50) {
					const s = d.data.sector;
					g.append("text")
						.attr("x", 6)
						.attr("y", 41)
						.attr("fill", "#55598a")
						.attr("font-size", "9px")
						.attr("font-family", "ui-monospace, monospace")
						.attr("pointer-events", "none")
						.text(`↑${s.advances ?? 0} ↓${s.declines ?? 0}`);
				}
			});

		cells
			.on("mouseover", function (event: MouseEvent, d) {
				d3.select(this).select("rect").attr("stroke", "#141735").attr("stroke-width", 1.5);
				const rect = containerRef.current?.getBoundingClientRect();
				if (!rect) return;
				setTooltip({
					x: event.clientX - rect.left,
					y: event.clientY - rect.top,
					sector: d.data.sector,
				});
			})
			.on("mousemove", (event: MouseEvent) => {
				const rect = containerRef.current?.getBoundingClientRect();
				if (!rect) return;
				setTooltip((prev) =>
					prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : prev,
				);
			})
			.on("mouseout", function () {
				d3.select(this).select("rect").attr("stroke", "#ffffff").attr("stroke-width", 1);
				setTooltip(null);
			});

		return () => {
			svg.selectAll("*").remove();
		};
	}, [validSectors, isEmpty]);

	return (
		<div className="rounded-[18px] border border-rule bg-card">
			<div className="border-b border-rule px-4 py-3">
				<h3 className="font-mono text-sm font-semibold text-ink">Sector Performance</h3>
				{!isEmpty && (
					<p className="mt-0.5 font-mono text-[10px] text-ink-4">
						Based on {totalStocks} Tier 1 stocks
					</p>
				)}
			</div>
			{isEmpty ? (
				<div className="flex h-[320px] flex-col items-center justify-center gap-2 px-4">
					<p className="font-mono text-xs text-ink-4">No sector data available yet</p>
					<p className="text-center font-mono text-[10px] text-ink-4">
						Data builds up from daily snapshots — check back after market close (4:15 PM WIB)
					</p>
				</div>
			) : (
				<div ref={containerRef} className="relative w-full" style={{ height: 320 }}>
					<svg ref={svgRef} className="w-full" style={{ height: 320, display: "block" }} />
					{tooltip && (
						<div
							className="pointer-events-none absolute z-10 rounded-[12px] border border-rule bg-card px-3 py-2 shadow-[0_10px_30px_rgba(20,23,53,0.12)]"
							style={{
								left: tooltip.x + 12,
								top: tooltip.y - 10,
								transform:
									tooltip.x > (containerRef.current?.clientWidth ?? 0) * 0.65
										? "translateX(-110%)"
										: undefined,
							}}
						>
							<div className="font-mono text-sm font-semibold text-ink">
								{tooltip.sector.sector}
							</div>
							<div
								className={`mt-1 font-mono text-xs font-medium ${
									(tooltip.sector.avg_change_percent ?? 0) >= 0 ? "text-pos" : "text-neg"
								}`}
							>
								{(tooltip.sector.avg_change_percent ?? 0) >= 0 ? "+" : ""}
								{(tooltip.sector.avg_change_percent ?? 0).toFixed(2)}%
							</div>
							<div className="mt-1 font-mono text-[10px] text-ink-4">
								↑{tooltip.sector.advances ?? 0} ↓{tooltip.sector.declines ?? 0} ·{" "}
								{tooltip.sector.total_stocks ?? 0} stocks
							</div>
							{(tooltip.sector.stocks ?? []).slice(0, 5).map((stk) => (
								<div
									key={stk.symbol}
									className="mt-0.5 flex justify-between gap-4 font-mono text-[10px]"
								>
									<span className="text-ink-2">{stk.symbol.replace(".JK", "")}</span>
									<span className={(stk.change_percent ?? 0) >= 0 ? "text-pos" : "text-neg"}>
										{(stk.change_percent ?? 0) >= 0 ? "+" : ""}
										{(stk.change_percent ?? 0).toFixed(2)}%
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
