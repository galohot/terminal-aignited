import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { IdxTopConnector } from "../../types/market";

function barColor(types: string[]): string {
	const hasDirector = types.includes("director");
	const hasCommissioner = types.includes("commissioner");
	const hasShareholder = types.includes("shareholder");
	const roleCount = [hasDirector, hasCommissioner, hasShareholder].filter(Boolean).length;
	if (roleCount > 1) return "#a855f7";
	if (hasDirector) return "#3b82f6";
	if (hasCommissioner) return "#f59e0b";
	if (hasShareholder) return "#22c55e";
	return "#6b7280";
}

const LEGEND_ITEMS: { color: string; label: string }[] = [
	{ color: "#3b82f6", label: "Director" },
	{ color: "#f59e0b", label: "Commissioner" },
	{ color: "#22c55e", label: "Shareholder" },
	{ color: "#a855f7", label: "Multiple roles" },
];

export function ConnectorsBar({ connectors }: { connectors: IdxTopConnector[] }) {
	const svgRef = useRef<SVGSVGElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();
	const navRef = useRef(navigate);
	navRef.current = navigate;

	const [tooltip, setTooltip] = useState<{
		x: number;
		y: number;
		name: string;
		companies: number;
		types: string[];
		entity_group: string | null;
	} | null>(null);

	const data = connectors.slice(0, 30);

	useEffect(() => {
		const svg = svgRef.current;
		const container = containerRef.current;
		if (!svg || !container || data.length === 0) return;

		const marginTop = 8;
		const marginRight = 60;
		const marginBottom = 24;
		const marginLeft = 180;
		const rowHeight = 28;

		const width = container.clientWidth || 600;
		const innerWidth = width - marginLeft - marginRight;
		const innerHeight = data.length * rowHeight;
		const height = innerHeight + marginTop + marginBottom;

		const maxCompanies = d3.max(data, (d) => d.companies) ?? 1;

		const xScale = d3
			.scaleLinear()
			.domain([0, maxCompanies])
			.range([0, innerWidth])
			.nice();

		const yScale = d3
			.scaleBand()
			.domain(data.map((d) => d.name))
			.range([0, innerHeight])
			.padding(0.25);

		const sel = d3.select(svg);
		sel.selectAll("*").remove();
		sel.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);

		const g = sel
			.append("g")
			.attr("transform", `translate(${marginLeft},${marginTop})`);

		// Bars
		const bars = g
			.append("g")
			.attr("class", "bars")
			.selectAll<SVGRectElement, IdxTopConnector>("rect")
			.data(data)
			.join("rect")
			.attr("x", 0)
			.attr("y", (d) => yScale(d.name) ?? 0)
			.attr("height", yScale.bandwidth())
			.attr("width", (d) => xScale(d.companies))
			.attr("fill", (d) => barColor(d.types))
			.attr("fill-opacity", 0.7)
			.attr("stroke", (d) => barColor(d.types))
			.attr("stroke-opacity", 0.5)
			.attr("stroke-width", 1)
			.attr("cursor", "pointer");

		// Entity group label (first word) inside bar at right edge
		g.append("g")
			.attr("class", "group-labels")
			.selectAll<SVGTextElement, IdxTopConnector>("text")
			.data(data.filter((d) => d.entity_group != null))
			.join("text")
			.attr("x", (d) => xScale(d.companies) - 4)
			.attr("y", (d) => (yScale(d.name) ?? 0) + yScale.bandwidth() / 2)
			.attr("dy", "0.35em")
			.attr("text-anchor", "end")
			.attr("font-family", "ui-monospace, monospace")
			.attr("font-size", "9px")
			.attr("fill", "#f59e0b")
			.attr("pointer-events", "none")
			.text((d) => (d.entity_group ?? "").split(/[\s_]/)[0]);

		// Company count labels at end of bar
		g.append("g")
			.attr("class", "count-labels")
			.selectAll<SVGTextElement, IdxTopConnector>("text")
			.data(data)
			.join("text")
			.attr("x", (d) => xScale(d.companies) + 5)
			.attr("y", (d) => (yScale(d.name) ?? 0) + yScale.bandwidth() / 2)
			.attr("dy", "0.35em")
			.attr("font-family", "ui-monospace, monospace")
			.attr("font-size", "10px")
			.attr("fill", "#9ca3af")
			.attr("pointer-events", "none")
			.text((d) => `${d.companies}`);

		// Y-axis name labels (clickable)
		g.append("g")
			.attr("class", "name-labels")
			.selectAll<SVGTextElement, IdxTopConnector>("text")
			.data(data)
			.join("text")
			.attr("x", -8)
			.attr("y", (d) => (yScale(d.name) ?? 0) + yScale.bandwidth() / 2)
			.attr("dy", "0.35em")
			.attr("text-anchor", "end")
			.attr("font-family", "ui-monospace, monospace")
			.attr("font-size", "10px")
			.attr("fill", "#9ca3af")
			.attr("cursor", "pointer")
			.text((d) => d.name)
			.on("click", (_event, d) => {
				navRef.current(`/idx/insiders?name=${encodeURIComponent(d.name)}`);
			})
			.on("mouseover", function () {
				d3.select(this).attr("fill", "#ffffff");
			})
			.on("mouseout", function () {
				d3.select(this).attr("fill", "#9ca3af");
			});

		// Bar hover + click interactions
		bars
			.on("mouseover", function (event: MouseEvent, d) {
				d3.select(this).attr("fill-opacity", 0.9);
				const rect = container.getBoundingClientRect();
				setTooltip({
					x: event.clientX - rect.left,
					y: event.clientY - rect.top,
					name: d.name,
					companies: d.companies,
					types: d.types,
					entity_group: d.entity_group,
				});
			})
			.on("mousemove", function (event: MouseEvent) {
				const rect = container.getBoundingClientRect();
				setTooltip((prev) =>
					prev
						? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top }
						: null,
				);
			})
			.on("mouseout", function () {
				d3.select(this).attr("fill-opacity", 0.7);
				setTooltip(null);
			})
			.on("click", (_event, d) => {
				navRef.current(`/idx/insiders?name=${encodeURIComponent(d.name)}`);
			});

		// X axis
		const xAxis = d3
			.axisBottom(xScale)
			.ticks(Math.min(maxCompanies, 8))
			.tickFormat((d) => `${d}`)
			.tickSizeOuter(0)
			.tickSize(4);

		const xAxisG = g
			.append("g")
			.attr("class", "x-axis")
			.attr("transform", `translate(0,${innerHeight})`)
			.call(xAxis);

		xAxisG.select(".domain").remove();
		xAxisG.selectAll("line").attr("stroke", "#ffffff10");
		xAxisG
			.selectAll("text")
			.attr("font-family", "ui-monospace, monospace")
			.attr("font-size", "9px")
			.attr("fill", "#6b7280");
	}, [data]);

	return (
		<div className="rounded border border-t-border bg-t-surface">
			<div className="border-b border-t-border px-3 py-2">
				<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
					Top Connectors
				</h3>
				<p className="mt-0.5 font-mono text-[10px] text-t-text-muted">
					most-connected insiders across IDX
				</p>
			</div>

			{/* Color legend */}
			<div className="flex flex-wrap items-center gap-4 border-b border-white/5 px-3 py-2">
				{LEGEND_ITEMS.map((item) => (
					<span key={item.label} className="flex items-center gap-1.5">
						<span
							className="inline-block h-2 w-2 rounded-sm"
							style={{ backgroundColor: item.color, opacity: 0.8 }}
						/>
						<span className="font-mono text-[10px] text-t-text-muted">{item.label}</span>
					</span>
				))}
			</div>

			<div ref={containerRef} className="relative overflow-hidden">
				<svg ref={svgRef} style={{ background: "transparent", display: "block" }} />
				{tooltip && (
					<div
						className="pointer-events-none absolute z-10 max-w-[220px] rounded border border-white/10 bg-[#0d0d0d]/95 px-2.5 py-1.5 shadow-xl backdrop-blur-sm"
						style={{
							left: Math.min(
								tooltip.x + 14,
								containerRef.current
									? containerRef.current.clientWidth - 230
									: tooltip.x + 14,
							),
							top: Math.max(tooltip.y - 10, 4),
						}}
					>
						<p
							className="font-mono font-semibold leading-snug"
							style={{ fontSize: "11px", color: barColor(tooltip.types) }}
						>
							{tooltip.name}
						</p>
						<p
							className="mt-0.5 font-mono font-medium leading-snug"
							style={{ fontSize: "11px", color: barColor(tooltip.types) }}
						>
							{tooltip.companies} companies
						</p>
						{tooltip.types.length > 0 && (
							<p className="mt-1 font-mono leading-snug text-t-text-muted" style={{ fontSize: "10px" }}>
								{tooltip.types.join(", ")}
							</p>
						)}
						{tooltip.entity_group && (
							<p
								className="mt-0.5 font-mono leading-snug"
								style={{ fontSize: "10px", color: "#f59e0b" }}
							>
								{tooltip.entity_group}
							</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
