import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { IdxEntityHolding } from "../../types/market";

function dotColor(pct: number): string {
	if (pct >= 50) return "#ff8a2a";
	if (pct >= 20) return "#1d5fc9";
	return "#8b8fb0";
}

export function HoldingsLollipop({ holdings }: { holdings: IdxEntityHolding[] }) {
	const svgRef = useRef<SVGSVGElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();
	const navRef = useRef(navigate);
	navRef.current = navigate;

	const [tooltip, setTooltip] = useState<{
		x: number;
		y: number;
		kode: string;
		company_name: string;
		percentage: number;
		via_entities: string[];
	} | null>(null);

	const sorted = useMemo(
		() =>
			[...holdings]
				.filter((h) => h.total_percentage != null)
				.sort((a, b) => (b.total_percentage ?? 0) - (a.total_percentage ?? 0)),
		[holdings],
	);

	useEffect(() => {
		const svg = svgRef.current;
		const container = containerRef.current;
		if (!svg || !container || sorted.length === 0) return;

		const marginTop = 8;
		const marginRight = 80;
		const marginBottom = 24;
		const marginLeft = 72;
		const rowHeight = 32;

		const width = container.clientWidth || 600;
		const innerWidth = width - marginLeft - marginRight;
		const innerHeight = sorted.length * rowHeight;
		const height = innerHeight + marginTop + marginBottom;

		const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
		const yScale = d3
			.scaleBand()
			.domain(sorted.map((h) => h.kode_emiten))
			.range([0, innerHeight])
			.padding(0.3);

		const sel = d3.select(svg);
		sel.selectAll("*").remove();
		sel.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);

		const g = sel.append("g").attr("transform", `translate(${marginLeft},${marginTop})`);

		// Reference line at 50%
		g.append("line")
			.attr("x1", xScale(50))
			.attr("x2", xScale(50))
			.attr("y1", 0)
			.attr("y2", innerHeight)
			.attr("stroke", "#d8cfb9")
			.attr("stroke-width", 1)
			.attr("stroke-dasharray", "4,3");

		g.append("text")
			.attr("x", xScale(50) + 3)
			.attr("y", -2)
			.attr("font-family", "ui-monospace, monospace")
			.attr("font-size", "9px")
			.attr("fill", "#8b8fb0")
			.text("50%");

		// Sticks (lines from 0 to percentage)
		g.append("g")
			.attr("class", "sticks")
			.selectAll<SVGLineElement, IdxEntityHolding>("line")
			.data(sorted)
			.join("line")
			.attr("x1", 0)
			.attr("x2", (d) => xScale(d.total_percentage ?? 0))
			.attr("y1", (d) => (yScale(d.kode_emiten) ?? 0) + yScale.bandwidth() / 2)
			.attr("y2", (d) => (yScale(d.kode_emiten) ?? 0) + yScale.bandwidth() / 2)
			.attr("stroke", "#e7e0d2")
			.attr("stroke-width", 1.5);

		// Dots
		const dots = g
			.append("g")
			.attr("class", "dots")
			.selectAll<SVGCircleElement, IdxEntityHolding>("circle")
			.data(sorted)
			.join("circle")
			.attr("cx", (d) => xScale(d.total_percentage ?? 0))
			.attr("cy", (d) => (yScale(d.kode_emiten) ?? 0) + yScale.bandwidth() / 2)
			.attr("r", 5)
			.attr("fill", (d) => dotColor(d.total_percentage ?? 0))
			.attr("cursor", "pointer");

		// Right-side percentage labels
		g.append("g")
			.attr("class", "pct-labels")
			.selectAll<SVGTextElement, IdxEntityHolding>("text")
			.data(sorted)
			.join("text")
			.attr("x", innerWidth + 6)
			.attr("y", (d) => (yScale(d.kode_emiten) ?? 0) + yScale.bandwidth() / 2)
			.attr("dy", "0.35em")
			.attr("font-family", "ui-monospace, monospace")
			.attr("font-size", "10px")
			.attr("fill", (d) => dotColor(d.total_percentage ?? 0))
			.text((d) => `${(d.total_percentage ?? 0).toFixed(1)}%`);

		// Left-side kode labels (clickable)
		g.append("g")
			.attr("class", "kode-labels")
			.selectAll<SVGTextElement, IdxEntityHolding>("text")
			.data(sorted)
			.join("text")
			.attr("x", -6)
			.attr("y", (d) => (yScale(d.kode_emiten) ?? 0) + yScale.bandwidth() / 2)
			.attr("dy", "0.35em")
			.attr("text-anchor", "end")
			.attr("font-family", "ui-monospace, monospace")
			.attr("font-size", "10px")
			.attr("fill", "#55598a")
			.attr("cursor", "pointer")
			.text((d) => d.kode_emiten)
			.on("click", (_event, d) => {
				navRef.current(`/idx/${d.kode_emiten}`);
			})
			.on("mouseover", function () {
				d3.select(this).attr("fill", "#141735");
			})
			.on("mouseout", function () {
				d3.select(this).attr("fill", "#55598a");
			});

		// Dot hover + click interactions
		dots
			.on("mouseover", function (event: MouseEvent, d) {
				d3.select(this).attr("r", 7);
				const rect = container.getBoundingClientRect();
				setTooltip({
					x: event.clientX - rect.left,
					y: event.clientY - rect.top,
					kode: d.kode_emiten,
					company_name: d.company_name,
					percentage: d.total_percentage ?? 0,
					via_entities: d.via_entities,
				});
			})
			.on("mousemove", (event: MouseEvent) => {
				const rect = container.getBoundingClientRect();
				setTooltip((prev) =>
					prev ? { ...prev, x: event.clientX - rect.left, y: event.clientY - rect.top } : null,
				);
			})
			.on("mouseout", function () {
				d3.select(this).attr("r", 5);
				setTooltip(null);
			})
			.on("click", (_event, d) => {
				navRef.current(`/idx/${d.kode_emiten}`);
			});

		// X axis
		const xAxis = d3
			.axisBottom(xScale)
			.tickValues([0, 25, 50, 75, 100])
			.tickFormat((d) => `${d}%`)
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
			.attr("fill", "#55598a");
	}, [sorted]);

	return (
		<div className="rounded-[18px] border border-rule bg-card">
			<div className="border-b border-rule px-3 py-2">
				<h3 className="text-xs font-medium uppercase tracking-wider text-ink-2">
					Ownership Stakes
				</h3>
				<p className="mt-0.5 font-mono text-[10px] text-ink-4">{sorted.length} companies</p>
			</div>
			<div ref={containerRef} className="relative overflow-hidden">
				<svg ref={svgRef} style={{ background: "transparent", display: "block" }} />
				{tooltip && (
					<div
						className="pointer-events-none absolute z-10 max-w-[220px] rounded border border-rule bg-card/95 px-2.5 py-1.5 shadow-xl backdrop-blur-sm"
						style={{
							left: Math.min(
								tooltip.x + 14,
								containerRef.current ? containerRef.current.clientWidth - 230 : tooltip.x + 14,
							),
							top: Math.max(tooltip.y - 10, 4),
						}}
					>
						<p
							className="font-mono font-semibold leading-snug"
							style={{ fontSize: "11px", color: dotColor(tooltip.percentage) }}
						>
							{tooltip.kode}
						</p>
						<p
							className="mt-0.5 font-mono leading-snug text-ink-4"
							style={{ fontSize: "10px" }}
						>
							{tooltip.company_name}
						</p>
						<p
							className="mt-1 font-mono font-medium leading-snug"
							style={{ fontSize: "11px", color: dotColor(tooltip.percentage) }}
						>
							{tooltip.percentage.toFixed(2)}%
						</p>
						{tooltip.via_entities.length > 0 && (
							<div className="mt-1 border-t border-rule pt-1">
								<p className="font-mono text-ink-4" style={{ fontSize: "9px" }}>
									Via:
								</p>
								{tooltip.via_entities.map((e) => (
									<p
										key={e}
										className="font-mono leading-snug text-ink-4"
										style={{ fontSize: "9px" }}
									>
										{e}
									</p>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
