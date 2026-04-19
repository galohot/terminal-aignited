import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { IdxSector } from "../../types/market";

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

interface TreemapTooltip {
	x: number;
	y: number;
	sector: string;
	count: number;
	color: string;
}

interface RootDatum {
	name: string;
	children: SectorDatum[];
}

interface SectorDatum {
	name: string;
	value: number;
	sector: string;
}

export function SectorTreemap({
	sectors,
	onSectorClick,
}: {
	sectors: IdxSector[];
	onSectorClick: (sector: string) => void;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const svgRef = useRef<SVGSVGElement>(null);
	const [tooltip, setTooltip] = useState<TreemapTooltip | null>(null);

	const totalCompanies = sectors.reduce((sum, s) => sum + s.company_count, 0);

	// Assign colors alphabetically
	const sortedSectorNames = [...sectors.map((s) => s.sector)].sort();
	const sectorColor = new Map<string, string>();
	sortedSectorNames.forEach((name, i) => {
		sectorColor.set(name, SECTOR_PALETTE[i % SECTOR_PALETTE.length]);
	});

	useEffect(() => {
		const container = containerRef.current;
		const svgEl = svgRef.current;
		if (!container || !svgEl || sectors.length === 0) return;

		const W = container.clientWidth || 800;
		const H = 380;

		const svg = d3.select(svgEl);
		svg.selectAll("*").remove();

		svg
			.attr("viewBox", `0 0 ${W} ${H}`)
			.attr("width", W)
			.attr("height", H)
			.style("background", "transparent");

		const root: d3.HierarchyNode<RootDatum | SectorDatum> = d3
			.hierarchy<RootDatum | SectorDatum>({
				name: "root",
				children: sectors.map((s) => ({
					name: s.sector,
					value: s.company_count,
					sector: s.sector,
				})),
			} as RootDatum)
			.sum((d) => {
				const node = d as SectorDatum;
				return node.value ?? 0;
			})
			.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

		d3
			.treemap<RootDatum | SectorDatum>()
			.size([W, H])
			.paddingOuter(4)
			.paddingInner(2)
			.paddingTop(0)
			.round(true)(root);

		const leaves = root.leaves() as d3.HierarchyRectangularNode<SectorDatum>[];

		const cells = svg
			.selectAll<SVGGElement, d3.HierarchyRectangularNode<SectorDatum>>("g.cell")
			.data(leaves)
			.join("g")
			.attr("class", "cell")
			.attr("transform", (d) => `translate(${d.x0},${d.y0})`)
			.style("cursor", "pointer");

		cells
			.append("rect")
			.attr("width", (d) => Math.max(0, d.x1 - d.x0))
			.attr("height", (d) => Math.max(0, d.y1 - d.y0))
			.attr("fill", (d) => {
				const color = sectorColor.get(d.data.sector) ?? "#6b7280";
				return color + "33"; // 20% opacity (hex 33 ≈ 0.2 * 255)
			})
			.attr("stroke", (d) => {
				const color = sectorColor.get(d.data.sector) ?? "#6b7280";
				return color + "66"; // 40% opacity
			})
			.attr("stroke-width", 1)
			.attr("rx", 2);

		// Text: only if cell wide enough
		cells
			.filter((d) => d.x1 - d.x0 > 50)
			.each(function (d) {
				const g = d3.select(this);
				const cellW = d.x1 - d.x0;
				const cellH = d.y1 - d.y0;
				const color = sectorColor.get(d.data.sector) ?? "#6b7280";

				if (cellH < 22) return;

				// Sector name
				g.append("text")
					.attr("x", 6)
					.attr("y", 14)
					.attr("fill", "#141735")
					.attr("font-size", "10px")
					.attr("font-family", "ui-monospace, monospace")
					.attr("pointer-events", "none")
					.text(() => {
						const maxChars = Math.floor(cellW / 6.5);
						const name = d.data.sector;
						return name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
					});

				if (cellH >= 34) {
					// Company count
					g.append("text")
						.attr("x", 6)
						.attr("y", 26)
						.attr("fill", "#55598a")
						.attr("font-size", "9px")
						.attr("font-family", "ui-monospace, monospace")
						.attr("pointer-events", "none")
						.text(`${d.data.value}`);
				}
			});

		// Hover / click events
		cells
			.on("mouseover", function (event: MouseEvent, d) {
				d3.select(this)
					.select("rect")
					.attr("fill", () => {
						const color = sectorColor.get(d.data.sector) ?? "#6b7280";
						return color + "59"; // ~35% opacity
					});

				const containerRect = containerRef.current?.getBoundingClientRect();
				if (!containerRect) return;
				setTooltip({
					x: event.clientX - containerRect.left,
					y: event.clientY - containerRect.top,
					sector: d.data.sector,
					count: d.data.value,
					color: sectorColor.get(d.data.sector) ?? "#6b7280",
				});
			})
			.on("mousemove", (event: MouseEvent) => {
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
			.on("mouseout", function (_event: MouseEvent, d) {
				d3.select(this)
					.select("rect")
					.attr("fill", () => {
						const color = sectorColor.get(d.data.sector) ?? "#6b7280";
						return color + "33";
					});
				setTooltip(null);
			})
			.on("click", (_event: MouseEvent, d) => {
				onSectorClick(d.data.sector);
			});

		return () => {
			svg.selectAll("*").remove();
		};
	}, [sectors]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div className="rounded-[18px] border border-rule bg-card overflow-hidden">
			{/* Header */}
			<div className="px-4 py-3 border-b border-rule">
				<div className="flex items-center justify-between">
					<h3 className="font-mono text-sm font-semibold text-ink">Sector Map</h3>
					<span className="font-mono text-[10px] text-ink-4 uppercase tracking-wider">
						click to filter
					</span>
				</div>
				<p className="mt-0.5 font-mono text-[11px] text-ink-4">
					{totalCompanies} companies across {sectors.length} sectors
				</p>
			</div>

			{/* Treemap */}
			<div ref={containerRef} className="relative w-full" style={{ height: 380 }}>
				<svg ref={svgRef} className="w-full" style={{ height: 380, display: "block" }} />

				{/* Tooltip */}
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
						<div className="font-mono text-sm font-semibold" style={{ color: tooltip.color }}>
							{tooltip.sector}
						</div>
						<div className="mt-1 font-mono text-[11px] text-ink-2">
							{tooltip.count} companies
						</div>
						<div className="mt-1 font-mono text-[10px] text-ink-4">
							Click to filter screener
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
