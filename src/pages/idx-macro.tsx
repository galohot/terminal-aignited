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

function HeadlineCard({ label, value, unit, period, color }: {
	label: string; value: number | null | undefined; unit: string; period: string | null | undefined; color: string;
}) {
	return (
		<div className="rounded-lg border border-t-border bg-t-surface p-4">
			<div className="font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">{label}</div>
			<div className="mt-1 flex items-baseline gap-2">
				<span className="font-mono text-2xl font-bold tabular-nums" style={{ color }}>
					{value != null ? value.toFixed(2) : "—"}
				</span>
				<span className="font-mono text-sm text-t-text-muted">{unit}</span>
			</div>
			{period && <div className="mt-1 font-mono text-[10px] text-t-text-muted">{period}</div>}
		</div>
	);
}

function MiniLineChart({ data, color, height = 120, label }: {
	data: MacroSeriesPoint[]; color: string; height?: number; label: string;
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

		const x = d3.scalePoint<string>()
			.domain(valid.map((d) => d.period!))
			.range([0, w]);

		const values = valid.map((d) => d.value!);
		const yMin = d3.min(values)! * 0.95;
		const yMax = d3.max(values)! * 1.05;
		const y = d3.scaleLinear().domain([yMin, yMax]).range([h, 0]);

		// Grid
		g.selectAll(".grid-line")
			.data(y.ticks(4))
			.join("line")
			.attr("x1", 0).attr("x2", w)
			.attr("y1", (d) => y(d)).attr("y2", (d) => y(d))
			.attr("stroke", "#233534").attr("stroke-dasharray", "2,3");

		// Y axis
		g.selectAll(".y-label")
			.data(y.ticks(4))
			.join("text")
			.attr("x", -6).attr("y", (d) => y(d))
			.attr("text-anchor", "end").attr("dominant-baseline", "middle")
			.attr("font-family", "monospace").attr("font-size", 9).attr("fill", "#72857e")
			.text((d) => d.toFixed(1));

		// X axis (sparse)
		const xLabels = valid.filter((_, i) => i % Math.max(1, Math.floor(valid.length / 5)) === 0);
		g.selectAll(".x-label")
			.data(xLabels)
			.join("text")
			.attr("x", (d) => x(d.period!)!)
			.attr("y", h + 16)
			.attr("text-anchor", "middle")
			.attr("font-family", "monospace").attr("font-size", 9).attr("fill", "#72857e")
			.text((d) => {
				const p = d.period!;
				if (p.includes("Q")) return p;
				if (p.length === 7) return p.slice(2); // 2026-04 → 26-04
				return p.slice(-4);
			});

		// Line
		const line = d3.line<MacroSeriesPoint>()
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

		// Dots
		g.selectAll(".dot")
			.data(valid)
			.join("circle")
			.attr("cx", (d) => x(d.period!)!)
			.attr("cy", (d) => y(d.value!))
			.attr("r", 3)
			.attr("fill", color)
			.attr("stroke", "#071111")
			.attr("stroke-width", 1.5);
	}, [data, color, height]);

	return (
		<div className="rounded-lg border border-t-border bg-t-surface p-4">
			<div className="mb-2 font-mono text-[11px] font-medium text-t-text-secondary">{label}</div>
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
				<div className="flex items-center gap-3 mb-2">
					<span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-t-amber">
						Macro Pulse
					</span>
					<span className="h-px flex-1 max-w-[60px] bg-t-amber/20" />
				</div>
				<h1 className="font-mono text-2xl font-semibold tracking-wide text-white">
					Indonesia Macro Dashboard
				</h1>
				<p className="mt-1 text-sm text-t-text-secondary">
					Key economic indicators that move the IDX. Data from Bank Indonesia, BPS, and Kemenkeu.
				</p>
			</div>

			{isLoading ? (
				<div className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<Skeleton className="h-[100px] rounded-lg" />
						<Skeleton className="h-[100px] rounded-lg" />
						<Skeleton className="h-[100px] rounded-lg" />
					</div>
					<Skeleton className="h-[200px] rounded-lg" />
					<Skeleton className="h-[200px] rounded-lg" />
				</div>
			) : error || !data ? (
				<div className="rounded-2xl border border-dashed border-t-border p-12 text-center text-sm text-t-text-muted">
					Failed to load macro data.
				</div>
			) : (
				<div className="space-y-6">
					{/* Headline Cards */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<HeadlineCard
							label="BI 7-Day Repo Rate"
							value={data.headlines.bi_rate.value}
							unit="%"
							period={data.headlines.bi_rate.period}
							color="#ffbf47"
						/>
						<HeadlineCard
							label="Inflation (YoY)"
							value={data.headlines.inflation_yoy.value}
							unit="%"
							period={data.headlines.inflation_yoy.period}
							color={data.headlines.inflation_yoy.value && data.headlines.inflation_yoy.value > 4 ? "#ff6b6b" : "#3ddc91"}
						/>
						<HeadlineCard
							label="GDP Growth"
							value={data.headlines.gdp_growth.value}
							unit="%"
							period={data.headlines.gdp_growth.period}
							color={data.headlines.gdp_growth.value && data.headlines.gdp_growth.value > 0 ? "#3ddc91" : "#ff6b6b"}
						/>
					</div>

					{/* APBN Card */}
					{(data.apbn.revenue_target || data.apbn.spending_target) && (
						<div className="rounded-lg border border-t-border bg-t-surface p-4">
							<div className="font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted mb-3">
								APBN {data.apbn.year} Target
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
								{data.apbn.revenue_target && (
									<div>
										<div className="font-mono text-[11px] text-t-text-muted">Revenue</div>
										<div className="font-mono text-lg font-bold text-t-green tabular-nums">
											Rp {fmtT(data.apbn.revenue_target)}
										</div>
									</div>
								)}
								{data.apbn.spending_target && (
									<div>
										<div className="font-mono text-[11px] text-t-text-muted">Spending</div>
										<div className="font-mono text-lg font-bold text-t-red tabular-nums">
											Rp {fmtT(data.apbn.spending_target)}
										</div>
									</div>
								)}
								{data.apbn.deficit_target && (
									<div>
										<div className="font-mono text-[11px] text-t-text-muted">Deficit</div>
										<div className="font-mono text-lg font-bold text-t-amber tabular-nums">
											Rp {fmtT(data.apbn.deficit_target)}
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Charts Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{data.bi_rate.length > 1 && (
							<MiniLineChart
								data={data.bi_rate}
								color="#ffbf47"
								label="BI 7-Day Repo Rate (%)"
							/>
						)}
						{data.inflation.length > 1 && (
							<MiniLineChart
								data={data.inflation}
								color="#ff6b6b"
								label="Inflation YoY (%)"
							/>
						)}
						{data.gdp.length > 1 && (
							<MiniLineChart
								data={data.gdp}
								color="#3ddc91"
								label="GDP Growth (%)"
							/>
						)}
						{data.debt.length > 1 && (
							<MiniLineChart
								data={data.debt}
								color="#8b7bff"
								height={140}
								label="Government Debt"
							/>
						)}
					</div>

					{/* Source */}
					<div className="font-mono text-[10px] text-t-text-muted text-right">
						Sources: Bank Indonesia, BPS, Kemenkeu DJPPR &middot;{" "}
						<a
							href="https://fiskal.aignited.id"
							target="_blank"
							rel="noopener noreferrer"
							className="text-t-amber hover:underline"
						>
							Deep dive on fiskal.aignited.id →
						</a>
					</div>
				</div>
			)}
		</div>
	);
}
