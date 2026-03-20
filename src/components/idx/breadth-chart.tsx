import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { MarketBreadthEntry } from "../../types/market";

interface BreadthTooltip {
	x: number;
	y: number;
	entry: MarketBreadthEntry;
}

export function BreadthChart({ data }: { data: MarketBreadthEntry[] }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const [tooltip, setTooltip] = useState<BreadthTooltip | null>(null);

	const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
	const isEmpty = sorted.length === 0;

	useEffect(() => {
		const container = containerRef.current;
		const svgEl = svgRef.current;
		if (!container || !svgEl || isEmpty) return;

		const W = container.clientWidth || 600;
		const H = 200;
		const margin = { top: 10, right: 12, bottom: 28, left: 40 };
		const innerW = W - margin.left - margin.right;
		const innerH = H - margin.top - margin.bottom;

		const svg = d3.select(svgEl);
		svg.selectAll("*").remove();
		svg.attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H);

		const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

		const parseDate = d3.timeParse("%Y-%m-%d");
		const dates = sorted.map((d) => parseDate(d.date) ?? new Date(d.date));
		const ratios = sorted.map((d) => d.advance_decline_ratio);

		const x = d3.scaleTime().domain(d3.extent(dates) as [Date, Date]).range([0, innerW]);
		const maxR = Math.max(d3.max(ratios) ?? 2, 2);
		const y = d3.scaleLinear().domain([0, maxR]).range([innerH, 0]).nice();

		// X axis
		g.append("g")
			.attr("transform", `translate(0,${innerH})`)
			.call(
				d3
					.axisBottom(x)
					.ticks(6)
					.tickFormat((d) => d3.timeFormat("%m/%d")(d as Date)),
			)
			.call((axis) => {
				axis.select(".domain").attr("stroke", "#ffffff15");
				axis.selectAll(".tick line").attr("stroke", "#ffffff10");
				axis.selectAll(".tick text").attr("fill", "#6b7280").attr("font-size", "9px");
			});

		// Y axis
		g.append("g")
			.call(d3.axisLeft(y).ticks(4))
			.call((axis) => {
				axis.select(".domain").attr("stroke", "#ffffff15");
				axis.selectAll(".tick line").attr("stroke", "#ffffff10");
				axis.selectAll(".tick text").attr("fill", "#6b7280").attr("font-size", "9px");
			});

		// 1.0 reference line
		g.append("line")
			.attr("x1", 0)
			.attr("x2", innerW)
			.attr("y1", y(1))
			.attr("y2", y(1))
			.attr("stroke", "#ffffff30")
			.attr("stroke-dasharray", "3,3");

		// Area above 1.0 (green)
		const areaAbove = d3
			.area<number>()
			.x((_, i) => x(dates[i]))
			.y0(() => y(1))
			.y1((_, i) => y(Math.max(ratios[i], 1)))
			.curve(d3.curveMonotoneX);

		g.append("path")
			.datum(d3.range(sorted.length))
			.attr("d", areaAbove)
			.attr("fill", "#22c55e20")
			.attr("stroke", "none");

		// Area below 1.0 (red)
		const areaBelow = d3
			.area<number>()
			.x((_, i) => x(dates[i]))
			.y0(() => y(1))
			.y1((_, i) => y(Math.min(ratios[i], 1)))
			.curve(d3.curveMonotoneX);

		g.append("path")
			.datum(d3.range(sorted.length))
			.attr("d", areaBelow)
			.attr("fill", "#ef444420")
			.attr("stroke", "none");

		// Line
		const line = d3
			.line<number>()
			.x((_, i) => x(dates[i]))
			.y((_, i) => y(ratios[i]))
			.curve(d3.curveMonotoneX);

		g.append("path")
			.datum(d3.range(sorted.length))
			.attr("d", line)
			.attr("fill", "none")
			.attr("stroke", "#ffffffaa")
			.attr("stroke-width", 1.5);

		// Invisible overlay for hover
		g.append("rect")
			.attr("width", innerW)
			.attr("height", innerH)
			.attr("fill", "transparent")
			.on("mousemove", (event: MouseEvent) => {
				const [mx] = d3.pointer(event);
				const bisect = d3.bisector<Date, Date>((d) => d).left;
				const date = x.invert(mx);
				const idx = Math.min(bisect(dates, date), sorted.length - 1);
				const entry = sorted[idx];
				const rect = containerRef.current?.getBoundingClientRect();
				if (!rect) return;
				setTooltip({
					x: event.clientX - rect.left,
					y: event.clientY - rect.top,
					entry,
				});
			})
			.on("mouseout", () => setTooltip(null));

		return () => {
			svg.selectAll("*").remove();
		};
	}, [sorted, isEmpty]);

	return (
		<div className="rounded-lg border border-t-border bg-white/[0.02]">
			<div className="border-b border-t-border px-4 py-3">
				<h3 className="font-mono text-sm font-semibold text-white">Market Breadth</h3>
				<p className="mt-0.5 font-mono text-[10px] text-t-text-muted">
					Advance / Decline Ratio (30 days)
				</p>
			</div>
			{isEmpty ? (
				<div className="flex h-[200px] items-center justify-center">
					<p className="font-mono text-xs text-t-text-muted">No breadth data available</p>
				</div>
			) : (
				<div ref={containerRef} className="relative w-full" style={{ height: 200 }}>
					<svg ref={svgRef} className="w-full" style={{ height: 200, display: "block" }} />
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
							<div className="font-mono text-xs font-semibold text-white">
								{tooltip.entry.date}
							</div>
							<div className="mt-1 font-mono text-[10px] text-t-text-muted">
								↑ {tooltip.entry.advances} advances · ↓ {tooltip.entry.declines} declines
							</div>
							<div
								className={`mt-0.5 font-mono text-xs font-medium ${
									tooltip.entry.advance_decline_ratio >= 1 ? "text-t-green" : "text-t-red"
								}`}
							>
								Ratio: {tooltip.entry.advance_decline_ratio.toFixed(2)}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
