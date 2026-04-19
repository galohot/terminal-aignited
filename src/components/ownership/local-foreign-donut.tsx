import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { LocalForeignSplit } from "./types";

function useResizeObserver(ref: React.RefObject<HTMLElement | null>) {
	const [size, setSize] = useState({ width: 0, height: 0 });
	useEffect(() => {
		if (!ref.current) return;
		const ro = new ResizeObserver(([entry]) => {
			setSize({
				width: entry.contentRect.width,
				height: entry.contentRect.height,
			});
		});
		ro.observe(ref.current);
		return () => ro.disconnect();
	}, [ref]);
	return size;
}

interface LocalForeignDonutProps {
	data: LocalForeignSplit;
}

export function LocalForeignDonut({ data }: LocalForeignDonutProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const { width } = useResizeObserver(containerRef);
	const svgRef = useRef<SVGSVGElement>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!width || !svgRef.current) return;

		const size = Math.min(width, 280);
		const outerRadius = size / 2 - 16;
		const innerRadius = outerRadius * 0.62;

		const svg = d3.select(svgRef.current);
		svg.selectAll("*").remove();
		svg.attr("width", size).attr("height", size + 40);

		const defs = svg.append("defs");

		const localGrad = defs
			.append("linearGradient")
			.attr("id", "local-grad")
			.attr("x1", "0%")
			.attr("y1", "0%")
			.attr("x2", "100%")
			.attr("y2", "100%");
		localGrad.append("stop").attr("offset", "0%").attr("stop-color", "#17a568");
		localGrad.append("stop").attr("offset", "100%").attr("stop-color", "#0e8a56");

		const foreignGrad = defs
			.append("linearGradient")
			.attr("id", "foreign-grad")
			.attr("x1", "0%")
			.attr("y1", "0%")
			.attr("x2", "100%")
			.attr("y2", "100%");
		foreignGrad.append("stop").attr("offset", "0%").attr("stop-color", "#ff6a0a");
		foreignGrad.append("stop").attr("offset", "100%").attr("stop-color", "#ff8a2a");

		const filter = defs.append("filter").attr("id", "donut-shadow");
		filter
			.append("feDropShadow")
			.attr("dx", 0)
			.attr("dy", 2)
			.attr("stdDeviation", 4)
			.attr("flood-color", "rgba(20,23,53,0.12)");

		const g = svg
			.append("g")
			.attr("transform", `translate(${size / 2},${size / 2})`)
			.attr("filter", "url(#donut-shadow)");
		const tooltip = d3.select(tooltipRef.current);

		const total = data.local.count + data.foreign.count;
		const localPct = total > 0 ? ((data.local.count / total) * 100).toFixed(1) : "0";
		const foreignPct = total > 0 ? ((data.foreign.count / total) * 100).toFixed(1) : "0";

		const segments = [
			{
				label: "Local",
				count: data.local.count,
				totalPct: data.local.totalPct,
				pct: localPct,
				gradient: "url(#local-grad)",
				color: "#17a568",
			},
			{
				label: "Foreign",
				count: data.foreign.count,
				totalPct: data.foreign.totalPct,
				pct: foreignPct,
				gradient: "url(#foreign-grad)",
				color: "#ff6a0a",
			},
		];

		const pie = d3
			.pie<(typeof segments)[0]>()
			.value((d) => d.count)
			.sort(null)
			.padAngle(0.04);

		const arc = d3
			.arc<d3.PieArcDatum<(typeof segments)[0]>>()
			.innerRadius(innerRadius)
			.outerRadius(outerRadius)
			.cornerRadius(4);

		const arcHover = d3
			.arc<d3.PieArcDatum<(typeof segments)[0]>>()
			.innerRadius(innerRadius - 2)
			.outerRadius(outerRadius + 4)
			.cornerRadius(4);

		g.selectAll("path")
			.data(pie(segments))
			.enter()
			.append("path")
			.attr("d", arc)
			.attr("fill", (d) => d.data.gradient)
			.style("cursor", "pointer")
			.on("mouseenter", function (event, d) {
				d3.select(this)
					.transition()
					.duration(200)
					.attr("d", (d: any) => arcHover(d) ?? "");
				tooltip
					.style("display", "block")
					.style("left", `${event.offsetX + 12}px`)
					.style("top", `${event.offsetY - 10}px`)
					.html(
						`<strong>${d.data.label}</strong><br/>` +
							`<span style="color:#55598a">Holdings:</span> ${d.data.count.toLocaleString()}<br/>` +
							`<span style="color:#55598a">Share:</span> ${d.data.pct}%<br/>` +
							`<span style="color:#55598a">Ownership:</span> ${d.data.totalPct.toFixed(1)}%`,
					);
			})
			.on("mouseleave", function () {
				d3.select(this)
					.transition()
					.duration(200)
					.attr("d", (d: any) => arc(d) ?? "");
				tooltip.style("display", "none");
			})
			.transition()
			.duration(900)
			.ease(d3.easeBackOut)
			.attrTween("d", (d) => {
				const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
				return (t) => arc(i(t) as d3.PieArcDatum<(typeof segments)[0]>) ?? "";
			});

		// Center text
		const dominant = segments[0].count >= segments[1].count ? segments[0] : segments[1];

		g.append("text")
			.attr("text-anchor", "middle")
			.attr("dominant-baseline", "central")
			.attr("y", -10)
			.attr("font-size", "26px")
			.attr("font-weight", "700")
			.attr("font-family", "var(--font-mono, monospace)")
			.attr("fill", dominant.color)
			.attr("opacity", 0)
			.text(`${dominant.pct}%`)
			.transition()
			.delay(400)
			.duration(500)
			.attr("opacity", 1);

		g.append("text")
			.attr("text-anchor", "middle")
			.attr("dominant-baseline", "central")
			.attr("y", 14)
			.attr("font-size", "11px")
			.attr("font-weight", "500")
			.attr("font-family", "var(--font-mono, monospace)")
			.attr("fill", "#55598a")
			.attr("opacity", 0)
			.text(dominant.label)
			.transition()
			.delay(500)
			.duration(500)
			.attr("opacity", 1);

		// Legend below donut
		const legendG = svg.append("g").attr("transform", `translate(${size / 2}, ${size + 12})`);

		segments.forEach((s, i) => {
			const xOffset = i === 0 ? -60 : 16;
			const lg = legendG.append("g").attr("transform", `translate(${xOffset}, 0)`);
			lg.append("rect")
				.attr("width", 10)
				.attr("height", 10)
				.attr("rx", 3)
				.attr("y", -5)
				.attr("fill", s.color)
				.attr("opacity", 0.8);
			lg.append("text")
				.attr("x", 16)
				.attr("dominant-baseline", "central")
				.attr("font-size", "11px")
				.attr("font-weight", "500")
				.attr("font-family", "var(--font-mono, monospace)")
				.attr("fill", "#55598a")
				.text(`${s.label} ${s.pct}%`);
		});
	}, [data, width]);

	return (
		<div ref={containerRef} className="relative flex justify-center">
			<svg ref={svgRef} />
			<div
				ref={tooltipRef}
				className="pointer-events-none absolute rounded-lg border border-rule bg-card px-3 py-2 font-mono text-[11px] text-ink shadow-xl"
				style={{ display: "none" }}
			/>
		</div>
	);
}
