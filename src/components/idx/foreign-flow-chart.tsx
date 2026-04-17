import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { useIdxForeignFlow } from "../../hooks/use-idx-company";
import { Skeleton } from "../ui/loading";

const MARGIN = { top: 16, right: 12, bottom: 28, left: 56 };

function formatCompact(v: number): string {
	if (Math.abs(v) >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
	if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
	if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
	return `${(v / 1e3).toFixed(0)}K`;
}

export function ForeignFlowChart({ kode, days = 30 }: { kode: string; days?: number }) {
	const { data, isLoading, error } = useIdxForeignFlow(kode, days);
	const svgRef = useRef<SVGSVGElement>(null);

	useEffect(() => {
		const svg = svgRef.current;
		if (!svg || !data?.history?.length) return;

		const selection = d3.select(svg);
		selection.selectAll("*").remove();

		const { width: W } = svg.getBoundingClientRect();
		const H = 200;
		svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

		const g = selection.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
		const innerW = W - MARGIN.left - MARGIN.right;
		const innerH = H - MARGIN.top - MARGIN.bottom;

		const flow = data.history;

		const x = d3
			.scaleBand<number>()
			.domain(d3.range(flow.length))
			.range([0, innerW])
			.paddingInner(0.15);

		const maxVal = d3.max(flow, (d) => Math.max(d.foreign_buy, d.foreign_sell)) ?? 1;
		const y = d3
			.scaleLinear()
			.domain([0, maxVal * 1.1])
			.range([innerH, 0]);

		const bw = x.bandwidth() / 2;

		// Buy bars (green)
		flow.forEach((d, i) => {
			g.append("rect")
				.attr("x", x(i)!)
				.attr("y", y(d.foreign_buy))
				.attr("width", bw)
				.attr("height", Math.max(innerH - y(d.foreign_buy), 0))
				.attr("fill", "#22c55e")
				.attr("fill-opacity", 0.6)
				.attr("rx", 1);
		});

		// Sell bars (red)
		flow.forEach((d, i) => {
			g.append("rect")
				.attr("x", (x(i) ?? 0) + bw)
				.attr("y", y(d.foreign_sell))
				.attr("width", bw)
				.attr("height", Math.max(innerH - y(d.foreign_sell), 0))
				.attr("fill", "#ef4444")
				.attr("fill-opacity", 0.6)
				.attr("rx", 1);
		});

		// Net line overlay
		const netExtent = d3.extent(flow, (d) => d.foreign_net) as [number, number];
		const pad = Math.max(Math.abs(netExtent[1] - netExtent[0]) * 0.15, 1);
		const yNet = d3
			.scaleLinear()
			.domain([netExtent[0] - pad, netExtent[1] + pad])
			.range([innerH, 0]);

		const line = d3
			.line<(typeof flow)[0]>()
			.x((_, i) => (x(i) ?? 0) + x.bandwidth() / 2)
			.y((d) => yNet(d.foreign_net))
			.curve(d3.curveMonotoneX);

		g.append("path")
			.datum(flow)
			.attr("d", line)
			.attr("fill", "none")
			.attr("stroke", "#f59e0b")
			.attr("stroke-width", 2);

		// Zero line for net
		if (netExtent[0] < 0 && netExtent[1] > 0) {
			g.append("line")
				.attr("x1", 0)
				.attr("x2", innerW)
				.attr("y1", yNet(0))
				.attr("y2", yNet(0))
				.attr("stroke", "#ffffff20")
				.attr("stroke-dasharray", "3,3");
		}

		// Y axis
		g.append("g")
			.call(
				d3
					.axisLeft(y)
					.ticks(4)
					.tickFormat((d) => formatCompact(d as number)),
			)
			.call((axis) => axis.select(".domain").remove())
			.call((axis) => axis.selectAll(".tick line").attr("stroke", "#ffffff10"))
			.call((axis) =>
				axis
					.selectAll(".tick text")
					.attr("fill", "#a3a3a3")
					.style("font-size", "9px")
					.style("font-family", "'JetBrains Mono', monospace"),
			);

		// X axis — sparse labels
		const step = Math.max(1, Math.floor(flow.length / 6));
		const tickIndices = d3.range(0, flow.length, step);
		g.append("g")
			.attr("transform", `translate(0,${innerH})`)
			.call(
				d3
					.axisBottom(
						d3
							.scaleLinear()
							.domain([0, flow.length - 1])
							.range([x.bandwidth() / 2, innerW - x.bandwidth() / 2]),
					)
					.tickValues(tickIndices)
					.tickFormat((i) => {
						const d = flow[i as number]?.date;
						return d ? d.slice(5) : "";
					}),
			)
			.call((axis) => axis.select(".domain").remove())
			.call((axis) => axis.selectAll(".tick line").remove())
			.call((axis) =>
				axis
					.selectAll(".tick text")
					.attr("fill", "#a3a3a3")
					.style("font-size", "9px")
					.style("font-family", "'JetBrains Mono', monospace"),
			);
	}, [data]);

	if (isLoading) return <Skeleton className="h-[240px] w-full rounded-xl" />;

	if (error || !data?.history?.length) {
		return (
			<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
				Foreign flow data unavailable.
			</div>
		);
	}

	return (
		<div>
			<div className="mb-1 flex items-center gap-3">
				<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
					Foreign Flow
				</span>
				<span className="flex items-center gap-1.5 text-[10px] text-t-text-muted">
					<span className="inline-block h-2 w-2 rounded-sm bg-[#22c55e]/60" /> Buy
					<span className="ml-1 inline-block h-2 w-2 rounded-sm bg-[#ef4444]/60" /> Sell
					<span className="ml-1 inline-block h-0.5 w-3 bg-[#f59e0b]" /> Net
				</span>
			</div>
			<div className="overflow-hidden rounded-xl border border-white/8 bg-[#0a0a0a] p-2">
				<svg ref={svgRef} className="w-full" style={{ height: 200 }} />
			</div>
		</div>
	);
}
