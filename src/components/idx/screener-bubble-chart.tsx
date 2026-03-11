import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { IdxScreenerResult } from "../../types/market";

const SECTOR_PALETTE = [
	"#f59e0b",
	"#3b82f6",
	"#22c55e",
	"#a855f7",
	"#ef4444",
	"#06b6d4",
	"#f97316",
	"#84cc16",
	"#ec4899",
	"#14b8a6",
	"#8b5cf6",
	"#f43f5e",
];

function formatMarketCap(value: number | null): string {
	if (value == null) return "—";
	const abs = Math.abs(value);
	if (abs >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
	if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
	if (abs >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
	return value.toLocaleString();
}

interface TooltipState {
	x: number;
	y: number;
	d: IdxScreenerResult;
	color: string;
}

export function ScreenerBubbleChart({ results }: { results: IdxScreenerResult[] }) {
	const svgRef = useRef<SVGSVGElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const navRef = useRef<ReturnType<typeof useNavigate> | null>(null);
	const navigate = useNavigate();
	navRef.current = navigate;

	const [tooltip, setTooltip] = useState<TooltipState | null>(null);

	const valid = useMemo(
		() =>
			results.filter(
				(r): r is IdxScreenerResult & { per: number; roe: number } =>
					r.per != null && r.roe != null && r.per > 0 && r.per < 150,
			),
		[results],
	);

	const sectorColor = useMemo(() => {
		const sectors = [...new Set(valid.map((r) => r.sector))].sort();
		const map = new Map<string, string>();
		sectors.forEach((s, i) => {
			map.set(s, SECTOR_PALETTE[i % SECTOR_PALETTE.length]);
		});
		return map;
	}, [valid]);

	const legendSectors = useMemo(() => {
		const seen = new Set<string>();
		const order: string[] = [];
		for (const r of valid) {
			if (!seen.has(r.sector)) {
				seen.add(r.sector);
				order.push(r.sector);
			}
		}
		return order.sort();
	}, [valid]);

	useEffect(() => {
		const container = containerRef.current;
		const svgEl = svgRef.current;
		if (!container || !svgEl || valid.length === 0) return;

		const margin = { top: 20, right: 24, bottom: 48, left: 56 };
		const W = container.clientWidth || 800;
		const H = container.clientHeight || 480;
		const innerW = W - margin.left - margin.right;
		const innerH = H - margin.top - margin.bottom;

		const svg = d3.select(svgEl);
		svg.selectAll("*").remove();

		svg
			.attr("viewBox", `0 0 ${W} ${H}`)
			.attr("preserveAspectRatio", "xMidYMid meet")
			.style("background", "transparent");

		// Clip path
		const clipId = "bubble-clip";
		svg
			.append("defs")
			.append("clipPath")
			.attr("id", clipId)
			.append("rect")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", innerW)
			.attr("height", innerH);

		const root = svg
			.append("g")
			.attr("transform", `translate(${margin.left},${margin.top})`);

		// Scales
		const xExtent = d3.extent(valid, (d) => d.per) as [number, number];
		const yExtent = d3.extent(valid, (d) => d.roe) as [number, number];

		const xScale = d3
			.scaleLinear()
			.domain([Math.max(0, xExtent[0] - 2), xExtent[1] + 2])
			.nice()
			.range([0, innerW]);

		const yScale = d3
			.scaleLinear()
			.domain([yExtent[0] - 2, yExtent[1] + 2])
			.nice()
			.range([innerH, 0]);

		const rScale = d3
			.scaleSqrt()
			.domain([0, d3.max(valid, (d) => d.market_cap ?? 0) ?? 1])
			.range([3, 22]);

		// Keep rescaled copies for zoom updates
		let xCurrent = xScale.copy();
		let yCurrent = yScale.copy();

		// Grid lines group
		const gridGroup = root.append("g").attr("class", "grid");

		function drawGrid(xs: d3.ScaleLinear<number, number>, ys: d3.ScaleLinear<number, number>) {
			gridGroup.selectAll("*").remove();

			gridGroup
				.selectAll<SVGLineElement, number>(".grid-x")
				.data(xs.ticks(8))
				.join("line")
				.attr("class", "grid-x")
				.attr("x1", (d) => xs(d))
				.attr("x2", (d) => xs(d))
				.attr("y1", 0)
				.attr("y2", innerH)
				.attr("stroke", "#ffffff15")
				.attr("stroke-width", 1);

			gridGroup
				.selectAll<SVGLineElement, number>(".grid-y")
				.data(ys.ticks(6))
				.join("line")
				.attr("class", "grid-y")
				.attr("x1", 0)
				.attr("x2", innerW)
				.attr("y1", (d) => ys(d))
				.attr("y2", (d) => ys(d))
				.attr("stroke", "#ffffff15")
				.attr("stroke-width", 1);

			// Zero ROE line when domain spans negative
			const [yMin, yMax] = ys.domain();
			if (yMin < 0 && yMax > 0) {
				gridGroup
					.selectAll(".zero-line")
					.data([0])
					.join("line")
					.attr("class", "zero-line")
					.attr("x1", 0)
					.attr("x2", innerW)
					.attr("y1", ys(0))
					.attr("y2", ys(0))
					.attr("stroke", "#ffffff35")
					.attr("stroke-width", 1)
					.attr("stroke-dasharray", "4 3");
			}
		}

		drawGrid(xCurrent, yCurrent);

		// Axes
		const xAxisGroup = root
			.append("g")
			.attr("class", "x-axis")
			.attr("transform", `translate(0,${innerH})`);

		const yAxisGroup = root.append("g").attr("class", "y-axis");

		function axisStyle(g: d3.Selection<SVGGElement, unknown, null, undefined>) {
			g.select(".domain").remove();
			g.selectAll(".tick line")
				.attr("stroke", "#ffffff15")
				.attr("stroke-width", 1);
			g.selectAll(".tick text")
				.attr("fill", "#6b7280")
				.attr("font-size", "10px")
				.attr("font-family", "ui-monospace, monospace");
		}

		function drawAxes(xs: d3.ScaleLinear<number, number>, ys: d3.ScaleLinear<number, number>) {
			xAxisGroup
				.call(d3.axisBottom(xs).ticks(8).tickSize(4))
				.call(axisStyle);
			yAxisGroup
				.call(d3.axisLeft(ys).ticks(6).tickSize(4))
				.call(axisStyle);
		}

		drawAxes(xCurrent, yCurrent);

		// Axis labels
		root
			.append("text")
			.attr("x", innerW / 2)
			.attr("y", innerH + 40)
			.attr("text-anchor", "middle")
			.attr("fill", "#6b7280")
			.attr("font-size", "11px")
			.attr("font-family", "ui-monospace, monospace")
			.text("PER ×");

		root
			.append("text")
			.attr("transform", `rotate(-90)`)
			.attr("x", -innerH / 2)
			.attr("y", -44)
			.attr("text-anchor", "middle")
			.attr("fill", "#6b7280")
			.attr("font-size", "11px")
			.attr("font-family", "ui-monospace, monospace")
			.text("ROE %");

		// Bubbles group with clip path
		const bubblesGroup = root
			.append("g")
			.attr("clip-path", `url(#${clipId})`);

		const circles = bubblesGroup
			.selectAll<SVGCircleElement, (typeof valid)[0]>("circle")
			.data(valid, (d) => d.kode_emiten)
			.join("circle")
			.attr("cx", (d) => xCurrent(d.per!))
			.attr("cy", (d) => yCurrent(d.roe!))
			.attr("r", (d) => rScale(d.market_cap ?? 0))
			.attr("fill", (d) => sectorColor.get(d.sector) ?? "#6b7280")
			.attr("fill-opacity", 0.65)
			.attr("stroke", (d) => sectorColor.get(d.sector) ?? "#6b7280")
			.attr("stroke-opacity", 0.8)
			.attr("stroke-width", 1)
			.style("cursor", "pointer");

		circles
			.on("mouseover", function (event: MouseEvent, d) {
				d3.select(this).raise().attr("fill-opacity", 1);
				const containerRect = containerRef.current?.getBoundingClientRect();
				if (!containerRect) return;
				setTooltip({
					x: event.clientX - containerRect.left,
					y: event.clientY - containerRect.top,
					d,
					color: sectorColor.get(d.sector) ?? "#6b7280",
				});
			})
			.on("mousemove", function (event: MouseEvent) {
				const containerRect = containerRef.current?.getBoundingClientRect();
				if (!containerRect) return;
				setTooltip((prev) =>
					prev
						? {
								...prev,
								x: event.clientX - containerRect.left,
								y: event.clientY - containerRect.top,
							}
						: prev,
				);
			})
			.on("mouseout", function () {
				d3.select(this).attr("fill-opacity", 0.65);
				setTooltip(null);
			})
			.on("click", (_event: MouseEvent, d) => {
				navRef.current?.(`/idx/${d.kode_emiten}`);
			});

		// Zoom behavior
		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.5, 10])
			.extent([
				[0, 0],
				[innerW, innerH],
			])
			.translateExtent([
				[-innerW, -innerH],
				[innerW * 2, innerH * 2],
			])
			.on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
				const t = event.transform;
				xCurrent = t.rescaleX(xScale);
				yCurrent = t.rescaleY(yScale);

				circles
					.attr("cx", (d) => xCurrent(d.per!))
					.attr("cy", (d) => yCurrent(d.roe!));

				drawAxes(xCurrent, yCurrent);
				drawGrid(xCurrent, yCurrent);
			});

		d3.select(svgEl).call(zoom);

		return () => {
			svg.selectAll("*").remove();
		};
	}, [valid, sectorColor]);

	if (valid.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-t-border p-8 text-center">
				<p className="text-sm text-t-text-muted">No data available for scatter chart.</p>
				<p className="mt-1 text-xs text-t-text-muted">
					At least one result needs valid PER (0–150) and ROE values.
				</p>
			</div>
		);
	}

	return (
		<div>
			{/* Legend */}
			<div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
				{legendSectors.map((sector) => {
					const color = sectorColor.get(sector) ?? "#6b7280";
					return (
						<div key={sector} className="flex items-center gap-1.5">
							<span
								className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
								style={{ backgroundColor: color }}
							/>
							<span
								className="font-mono text-[10px]"
								style={{ color }}
							>
								{sector}
							</span>
						</div>
					);
				})}
			</div>

			{/* Chart */}
			<div ref={containerRef} className="relative h-[480px] w-full">
				<svg ref={svgRef} className="h-full w-full" />

				{/* Tooltip */}
				{tooltip && (
					<div
						className="pointer-events-none absolute z-10 rounded-lg border border-white/10 bg-black/90 px-3 py-2 shadow-xl"
						style={{
							left: tooltip.x + 14,
							top: tooltip.y - 10,
							transform:
								tooltip.x > (containerRef.current?.clientWidth ?? 0) * 0.65
									? "translateX(-110%)"
									: undefined,
						}}
					>
						<div
							className="font-mono text-sm font-semibold"
							style={{ color: tooltip.color }}
						>
							{tooltip.d.kode_emiten}
						</div>
						<div className="mt-0.5 max-w-[180px] truncate font-mono text-[11px] text-t-text-secondary">
							{tooltip.d.name}
						</div>
						<div className="mt-1 font-mono text-[10px] text-t-text-muted">{tooltip.d.sector}</div>
						<div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5">
							<div className="font-mono text-[10px] text-t-text-muted">PER</div>
							<div className="font-mono text-[10px] text-t-text">
								{tooltip.d.per != null ? `${tooltip.d.per.toFixed(1)}×` : "—"}
							</div>
							<div className="font-mono text-[10px] text-t-text-muted">ROE</div>
							<div className="font-mono text-[10px] text-t-text">
								{tooltip.d.roe != null ? `${tooltip.d.roe.toFixed(1)}%` : "—"}
							</div>
							<div className="font-mono text-[10px] text-t-text-muted">Mkt Cap</div>
							<div className="font-mono text-[10px] text-t-text">
								{formatMarketCap(tooltip.d.market_cap)}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Caption */}
			<p className="mt-2 text-center font-mono text-[10px] text-t-text-muted">
				scroll to zoom · bubble size = market cap · click to open
			</p>
		</div>
	);
}
