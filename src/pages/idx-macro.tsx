import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { IdxNav } from "../components/idx/idx-nav";
import { Skeleton } from "../components/ui/loading";
import { useMacroOverview } from "../hooks/use-ksei";
import { usePageTitle } from "../hooks/use-page-title";
import type { MacroSeriesPoint } from "../types/market";

function fmtT(n: number): string {
	if (Math.abs(n) >= 1e15) return `${(n / 1e15).toFixed(0)}K T`;
	if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(0)} T`;
	if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)} B`;
	return n.toLocaleString("en-US");
}

function HeadlineCard({
	label,
	value,
	unit,
	period,
	color,
}: {
	label: string;
	value: number | null | undefined;
	unit: string;
	period: string | null | undefined;
	color: string;
}) {
	return (
		<div className="rounded-[18px] border border-rule bg-card p-4">
			<div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">{label}</div>
			<div className="mt-1 flex items-baseline gap-2">
				<span className="font-mono text-2xl font-bold tabular-nums" style={{ color }}>
					{value != null ? value.toFixed(2) : "—"}
				</span>
				<span className="font-mono text-sm text-ink-4">{unit}</span>
			</div>
			{period && <div className="mt-1 font-mono text-[10px] text-ink-4">{period}</div>}
		</div>
	);
}

function MiniLineChart({
	data,
	color,
	height = 120,
	label,
}: {
	data: MacroSeriesPoint[];
	color: string;
	height?: number;
	label: string;
}) {
	const svgRef = useRef<SVGSVGElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const svg = svgRef.current;
		const container = containerRef.current;
		if (!svg || !container || data.length < 2) return;

		const W = container.clientWidth || 400;
		const H = height;
		const margin = { top: 10, right: 10, bottom: 24, left: 45 };
		const w = W - margin.left - margin.right;
		const h = H - margin.top - margin.bottom;

		const valid = data.filter((d) => d.value != null && d.period).reverse();
		if (valid.length < 2) return;

		const sel = d3.select(svg);
		sel.selectAll("*").remove();
		sel.attr("width", W).attr("height", H);

		const g = sel.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

		const x = d3
			.scalePoint<string>()
			.domain(valid.map((d) => d.period!))
			.range([0, w]);

		const values = valid.map((d) => d.value!);
		const yMin = d3.min(values)! * 0.95;
		const yMax = d3.max(values)! * 1.05;
		const y = d3.scaleLinear().domain([yMin, yMax]).range([h, 0]);

		g.selectAll(".grid-line")
			.data(y.ticks(4))
			.join("line")
			.attr("x1", 0)
			.attr("x2", w)
			.attr("y1", (d) => y(d))
			.attr("y2", (d) => y(d))
			.attr("stroke", "#e7e0d2")
			.attr("stroke-dasharray", "2,3");

		g.selectAll(".y-label")
			.data(y.ticks(4))
			.join("text")
			.attr("x", -6)
			.attr("y", (d) => y(d))
			.attr("text-anchor", "end")
			.attr("dominant-baseline", "middle")
			.attr("font-family", "monospace")
			.attr("font-size", 9)
			.attr("fill", "#55598a")
			.text((d) => d.toFixed(1));

		const xLabels = valid.filter((_, i) => i % Math.max(1, Math.floor(valid.length / 5)) === 0);
		g.selectAll(".x-label")
			.data(xLabels)
			.join("text")
			.attr("x", (d) => x(d.period!)!)
			.attr("y", h + 16)
			.attr("text-anchor", "middle")
			.attr("font-family", "monospace")
			.attr("font-size", 9)
			.attr("fill", "#55598a")
			.text((d) => {
				const p = d.period!;
				if (p.includes("Q")) return p;
				if (p.length === 7) return p.slice(2);
				return p.slice(-4);
			});

		const line = d3
			.line<MacroSeriesPoint>()
			.x((d) => x(d.period!)!)
			.y((d) => y(d.value!))
			.curve(d3.curveMonotoneX);

		g.append("path")
			.datum(valid)
			.attr("d", line)
			.attr("fill", "none")
			.attr("stroke", color)
			.attr("stroke-width", 2)
			.attr("stroke-linecap", "round");

		g.selectAll(".dot")
			.data(valid)
			.join("circle")
			.attr("cx", (d) => x(d.period!)!)
			.attr("cy", (d) => y(d.value!))
			.attr("r", 3)
			.attr("fill", color)
			.attr("stroke", "#ffffff")
			.attr("stroke-width", 1.5);
	}, [data, color, height]);

	return (
		<div className="rounded-[18px] border border-rule bg-card p-4">
			<div className="mb-2 font-mono text-[11px] font-medium text-ink-2">{label}</div>
			<div ref={containerRef}>
				<svg ref={svgRef} className="w-full" />
			</div>
		</div>
	);
}

export function IdxMacroPage() {
	usePageTitle("Macro Dashboard");
	const { data, isLoading, error } = useMacroOverview();

	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<IdxNav />

			<div className="mb-6">
				<div className="mb-2 flex items-center gap-3">
					<span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-ember-600">
						Macro Pulse
					</span>
					<span className="h-px max-w-[60px] flex-1 bg-ember-500/30" />
				</div>
				<h1
					className="text-[clamp(2rem,4vw,2.5rem)] leading-[1.05] text-ink"
					style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
				>
					Indonesia <em className="text-ember-600">Macro Dashboard</em>
				</h1>
				<p className="mt-2 max-w-2xl text-sm text-ink-3">
					Key economic indicators that move the IDX. Data from Bank Indonesia, BPS, and Kemenkeu.
				</p>
			</div>

			{isLoading ? (
				<div className="space-y-4">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<Skeleton className="h-[100px] rounded-lg" />
						<Skeleton className="h-[100px] rounded-lg" />
						<Skeleton className="h-[100px] rounded-lg" />
					</div>
					<Skeleton className="h-[200px] rounded-lg" />
					<Skeleton className="h-[200px] rounded-lg" />
				</div>
			) : error || !data ? (
				<div className="rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-12 text-center text-sm text-ink-4">
					Failed to load macro data.
				</div>
			) : (
				<div className="space-y-6">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<HeadlineCard
							label="BI 7-Day Repo Rate"
							value={data.headlines.bi_rate.value}
							unit="%"
							period={data.headlines.bi_rate.period}
							color="#ff8a2a"
						/>
						<HeadlineCard
							label="Inflation (YoY)"
							value={data.headlines.inflation_yoy.value}
							unit="%"
							period={data.headlines.inflation_yoy.period}
							color={
								data.headlines.inflation_yoy.value && data.headlines.inflation_yoy.value > 4
									? "#d2344a"
									: "#17a568"
							}
						/>
						<HeadlineCard
							label="GDP Growth"
							value={data.headlines.gdp_growth.value}
							unit="%"
							period={data.headlines.gdp_growth.period}
							color={
								data.headlines.gdp_growth.value && data.headlines.gdp_growth.value > 0
									? "#17a568"
									: "#d2344a"
							}
						/>
					</div>

					{(data.apbn.revenue_target || data.apbn.spending_target) && (
						<div className="rounded-[18px] border border-rule bg-card p-4">
							<div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
								APBN {data.apbn.year} Target
							</div>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
								{data.apbn.revenue_target && (
									<div>
										<div className="font-mono text-[11px] text-ink-4">Revenue</div>
										<div className="font-mono text-lg font-bold tabular-nums text-pos">
											Rp {fmtT(data.apbn.revenue_target)}
										</div>
									</div>
								)}
								{data.apbn.spending_target && (
									<div>
										<div className="font-mono text-[11px] text-ink-4">Spending</div>
										<div className="font-mono text-lg font-bold tabular-nums text-neg">
											Rp {fmtT(data.apbn.spending_target)}
										</div>
									</div>
								)}
								{data.apbn.deficit_target && (
									<div>
										<div className="font-mono text-[11px] text-ink-4">Deficit</div>
										<div className="font-mono text-lg font-bold tabular-nums text-ember-700">
											Rp {fmtT(data.apbn.deficit_target)}
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						{data.bi_rate.length > 1 && (
							<MiniLineChart data={data.bi_rate} color="#ff8a2a" label="BI 7-Day Repo Rate (%)" />
						)}
						{data.inflation.length > 1 && (
							<MiniLineChart data={data.inflation} color="#d2344a" label="Inflation YoY (%)" />
						)}
						{data.gdp.length > 1 && (
							<MiniLineChart data={data.gdp} color="#17a568" label="GDP Growth (%)" />
						)}
						{data.debt.length > 1 && (
							<MiniLineChart
								data={data.debt}
								color="#7a4bc8"
								height={140}
								label="Government Debt"
							/>
						)}
					</div>

					<div className="text-right font-mono text-[10px] text-ink-4">
						Sources: Bank Indonesia, BPS, Kemenkeu DJPPR &middot;{" "}
						<a
							href="https://fiskal.aignited.id"
							target="_blank"
							rel="noopener noreferrer"
							className="text-ember-600 hover:underline"
						>
							Deep dive on fiskal.aignited.id →
						</a>
					</div>
				</div>
			)}
		</div>
	);
}
