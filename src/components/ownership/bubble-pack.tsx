import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { BubbleNode } from "./types";

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

const CLUSTER_COLORS = [
	"#ff8a2a",
	"#1d5fc9",
	"#17a568",
	"#7a4bc8",
	"#d2344a",
	"#0891b2",
	"#d97706",
	"#84cc16",
	"#db2777",
	"#0ea5a5",
	"#6d28d9",
	"#e11d48",
	"#ff6a0a",
	"#2a7be3",
	"#0e8a56",
	"#9333ea",
	"#be185d",
	"#0f766e",
	"#f59e0b",
	"#3b82f6",
];

function companyTooltipHtml(d: d3.HierarchyNode<BubbleNode>): string {
	const { id, name, size, totalInsiderPct, sharedInvestors } = d.data;
	const clusterName = d.parent?.data.name ?? "";
	const pct = totalInsiderPct?.toFixed(2) ?? "0";
	const color = CLUSTER_COLORS[(d.parent?.data.cluster ?? 0) % CLUSTER_COLORS.length];

	return `
    <div style="font-family:var(--font-mono,monospace)">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block"></span>
        <strong>${id}</strong>
        <span style="color:#55598a;font-size:10px">${clusterName}</span>
      </div>
      <div style="color:#2b2f57;font-size:10px;margin:2px 0">${name}</div>
      <div style="border-top:1px solid #e7e0d2;margin:4px 0"></div>
      <div style="display:flex;gap:12px;font-size:10px">
        <div><span style="color:#55598a">Insiders</span> <strong>${size}</strong></div>
        <div><span style="color:#55598a">Holding</span> <strong>${pct}%</strong></div>
        <div><span style="color:#55598a">Shared</span> <strong>${sharedInvestors ?? 0}</strong></div>
      </div>
      <div style="color:#55598a;font-size:9px;margin-top:4px">Click to view company</div>
    </div>`;
}

function clusterTooltipHtml(d: d3.HierarchyNode<BubbleNode>): string {
	const { name, memberCount, totalClusterInvestors, avgClusterPct, children } = d.data;
	const color = CLUSTER_COLORS[d.data.cluster % CLUSTER_COLORS.length];
	const topCompanies = (children ?? []).sort((a, b) => b.size - a.size).slice(0, 5);

	return `
    <div style="font-family:var(--font-mono,monospace)">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block"></span>
        <strong>${name}</strong>
      </div>
      <div style="border-top:1px solid #e7e0d2;margin:4px 0"></div>
      <div style="display:flex;gap:12px;font-size:10px">
        <div><span style="color:#55598a">Companies</span> <strong>${memberCount ?? 0}</strong></div>
        <div><span style="color:#55598a">Investors</span> <strong>${totalClusterInvestors ?? 0}</strong></div>
        <div><span style="color:#55598a">Avg %</span> <strong>${avgClusterPct?.toFixed(1) ?? "0"}%</strong></div>
      </div>
      ${
				topCompanies.length > 0
					? `
        <div style="border-top:1px solid #e7e0d2;margin:4px 0"></div>
        <div style="color:#55598a;font-size:9px;margin-bottom:2px">Top Companies</div>
        ${topCompanies.map((c) => `<div style="font-size:10px"><strong>${c.id}</strong> <span style="color:#55598a">${c.name}</span></div>`).join("")}
      `
					: ""
			}
    </div>`;
}

interface BubblePackProps {
	data: BubbleNode;
	onCompanyClick?: (code: string) => void;
}

export function BubblePack({ data, onCompanyClick }: BubblePackProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const { width } = useResizeObserver(containerRef);
	const svgRef = useRef<SVGSVGElement>(null);
	const tooltipRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!width || !svgRef.current || !data.children?.length) return;

		const height = 500;
		const svg = d3.select(svgRef.current);
		svg.selectAll("*").remove();
		svg.attr("width", width).attr("height", height);

		const tooltip = d3.select(tooltipRef.current);

		function showTooltip(event: MouseEvent, html: string) {
			const containerRect = containerRef.current?.getBoundingClientRect();
			if (!containerRect) return;
			const x = event.clientX - containerRect.left + 14;
			const y = event.clientY - containerRect.top - 10;
			tooltip.style("display", "block").style("left", `${x}px`).style("top", `${y}px`).html(html);
		}

		function hideTooltip() {
			tooltip.style("display", "none");
		}

		const root = d3
			.hierarchy(data)
			.sum((d) => d.size || 1)
			.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

		const pack = d3.pack<BubbleNode>().size([width, height]).padding(4);
		pack(root);

		const node = svg
			.selectAll("g")
			.data(root.descendants().filter((d) => d.depth > 0))
			.enter()
			.append("g")
			.attr("transform", (d: any) => `translate(${d.x},${d.y})`);

		// Cluster circles (depth 1)
		node
			.filter((d) => d.depth === 1)
			.append("circle")
			.attr("r", (d: any) => d.r)
			.attr("fill", (d) => CLUSTER_COLORS[d.data.cluster % CLUSTER_COLORS.length])
			.attr("fill-opacity", 0.08)
			.attr("stroke", (d) => CLUSTER_COLORS[d.data.cluster % CLUSTER_COLORS.length])
			.attr("stroke-opacity", 0.2)
			.attr("stroke-width", 1)
			.style("cursor", "default")
			.on("mouseenter", function (event, d) {
				d3.select(this).attr("fill-opacity", 0.15).attr("stroke-opacity", 0.4);
				showTooltip(event, clusterTooltipHtml(d));
			})
			.on("mousemove", (event, d) => {
				showTooltip(event, clusterTooltipHtml(d));
			})
			.on("mouseleave", function () {
				d3.select(this).attr("fill-opacity", 0.08).attr("stroke-opacity", 0.2);
				hideTooltip();
			});

		// Company circles (depth 2)
		node
			.filter((d) => d.depth === 2)
			.append("circle")
			.attr("r", (d: any) => d.r)
			.attr("fill", (d) => {
				const clusterIdx = d.parent?.data.cluster ?? 0;
				return CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length];
			})
			.attr("fill-opacity", 0.5)
			.attr("stroke", (d) => {
				const clusterIdx = d.parent?.data.cluster ?? 0;
				return CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length];
			})
			.attr("stroke-opacity", 0.3)
			.style("cursor", "pointer")
			.on("mouseenter", function (event, d) {
				d3.select(this).attr("fill-opacity", 0.9).attr("stroke-opacity", 0.8);
				showTooltip(event, companyTooltipHtml(d));
			})
			.on("mousemove", (event, d) => {
				showTooltip(event, companyTooltipHtml(d));
			})
			.on("mouseleave", function () {
				d3.select(this).attr("fill-opacity", 0.5).attr("stroke-opacity", 0.3);
				hideTooltip();
			})
			.on("click", (_, d) => {
				onCompanyClick?.(d.data.id);
			});

		// Labels for larger bubbles
		node
			.filter((d: any) => d.depth === 2 && d.r > 16)
			.append("text")
			.attr("text-anchor", "middle")
			.attr("dominant-baseline", "middle")
			.attr("font-size", (d: any) => Math.min(10, d.r / 3))
			.attr("font-family", "var(--font-mono, monospace)")
			.attr("fill", "#FFFFFF")
			.attr("pointer-events", "none")
			.text((d) => d.data.id);

		// Cluster labels
		node
			.filter((d: any) => d.depth === 1 && d.r > 30)
			.append("text")
			.attr("text-anchor", "middle")
			.attr("y", (d: any) => -d.r + 12)
			.attr("font-size", "9px")
			.attr("font-family", "var(--font-mono, monospace)")
			.attr("fill", "#55598a")
			.attr("pointer-events", "none")
			.text((d) => d.data.name);
	}, [data, width, onCompanyClick]);

	return (
		<div ref={containerRef} className="relative">
			<svg ref={svgRef} />
			<div
				ref={tooltipRef}
				className="pointer-events-none absolute rounded-lg border border-rule bg-card px-3 py-2 font-mono text-[11px] text-ink shadow-xl"
				style={{ display: "none" }}
			/>
		</div>
	);
}
