import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { useIdxFinancialSummary } from "../../hooks/use-idx-company";
import type { IdxFinancialSummaryLatest, IdxPeer } from "../../types/market";

const AXES = [
	{ key: "roe" as const, label: "ROE", min: -10, max: 30, invert: false },
	{ key: "roa" as const, label: "ROA", min: -5, max: 20, invert: false },
	{ key: "npm" as const, label: "NPM", min: -20, max: 40, invert: false },
	{ key: "der" as const, label: "DER", min: 4, max: 0, invert: true },
	{ key: "pbv" as const, label: "PBV", min: 8, max: 0.5, invert: true },
	{ key: "per" as const, label: "PER", min: 50, max: 5, invert: true },
] as const;

const CX = 140;
const CY = 140;
const MAX_R = 90;
const LABEL_R = 108;
const N = AXES.length;

function normalize(value: number | null, min: number, max: number): number {
	if (value == null) return 0;
	const raw = (value - min) / (max - min);
	return Math.min(1, Math.max(0, raw));
}

function angle(i: number): number {
	return (i * (2 * Math.PI)) / N - Math.PI / 2;
}

function axisPoint(i: number, r: number): [number, number] {
	const a = angle(i);
	return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function polygonPath(scores: number[]): string {
	const points = scores.map((s, i) => {
		const [x, y] = axisPoint(i, s * MAX_R);
		return [x, y] as [number, number];
	});
	const lineGen = d3
		.line<[number, number]>()
		.x((d) => d[0])
		.y((d) => d[1]);
	return lineGen([...points, points[0]]) ?? "";
}

function getScores(f: IdxFinancialSummaryLatest): number[] {
	return AXES.map(({ key, min, max }) => normalize(f[key], min, max));
}

function countValid(f: IdxFinancialSummaryLatest): number {
	return AXES.filter(({ key }) => f[key] != null).length;
}

function textAnchor(i: number): string {
	const a = angle(i);
	const cos = Math.cos(a);
	if (cos > 0.1) return "start";
	if (cos < -0.1) return "end";
	return "middle";
}

function dominantBaseline(i: number): string {
	const a = angle(i);
	const sin = Math.sin(a);
	if (sin > 0.1) return "hanging";
	if (sin < -0.1) return "auto";
	return "middle";
}

interface Company {
	label: string;
	color: string;
	data: IdxFinancialSummaryLatest | null | undefined;
}

export function PeerRadarChart({
	kode,
	financials,
	peers,
}: {
	kode: string;
	financials: IdxFinancialSummaryLatest | null;
	peers: IdxPeer[];
}) {
	const svgRef = useRef<SVGSVGElement>(null);

	const topPeers = peers.slice(0, 2);
	const peer1 = useIdxFinancialSummary(topPeers[0]?.kode_emiten ?? "");
	const peer2 = useIdxFinancialSummary(topPeers[1]?.kode_emiten ?? "");

	const companies: Company[] = [
		{ label: kode, color: "#f59e0b", data: financials },
		{
			label: topPeers[0]?.kode_emiten ?? "",
			color: "#3b82f6",
			data: peer1.data?.latest,
		},
		{
			label: topPeers[1]?.kode_emiten ?? "",
			color: "#22c55e",
			data: peer2.data?.latest,
		},
	];

	const rendered = companies.filter((c) => c.label && c.data != null && countValid(c.data) >= 2);

	useEffect(() => {
		const svg = svgRef.current;
		if (!svg) return;

		const sel = d3.select(svg);
		sel.selectAll("*").remove();

		// Concentric rings
		[0.25, 0.5, 0.75, 1.0].forEach((t) => {
			const ringPoints = d3.range(N).map((i) => axisPoint(i, t * MAX_R));
			const ringGen = d3
				.line<[number, number]>()
				.x((d) => d[0])
				.y((d) => d[1]);
			sel
				.append("path")
				.attr("d", ringGen([...ringPoints, ringPoints[0]]) ?? "")
				.attr("fill", "none")
				.attr("stroke", "#ffffff08")
				.attr("stroke-width", 1);
		});

		// Axis lines
		d3.range(N).forEach((i) => {
			const [x, y] = axisPoint(i, MAX_R);
			sel
				.append("line")
				.attr("x1", CX)
				.attr("y1", CY)
				.attr("x2", x)
				.attr("y2", y)
				.attr("stroke", "#ffffff15")
				.attr("stroke-width", 1);
		});

		// Axis labels
		AXES.forEach(({ label }, i) => {
			const [x, y] = axisPoint(i, LABEL_R);
			sel
				.append("text")
				.attr("x", x)
				.attr("y", y)
				.attr("text-anchor", textAnchor(i))
				.attr("dominant-baseline", dominantBaseline(i))
				.attr("font-family", "ui-monospace, monospace")
				.attr("font-size", 10)
				.attr("fill", "#6b7280")
				.text(label);
		});

		// Company polygons
		rendered.forEach(({ color, data }) => {
			if (!data) return;
			const scores = getScores(data);
			const path = polygonPath(scores);

			sel
				.append("path")
				.attr("d", path)
				.attr("fill", color)
				.attr("fill-opacity", 0.15)
				.attr("stroke", color)
				.attr("stroke-width", 1.5)
				.attr("stroke-linejoin", "round");

			// Dots at each vertex
			scores.forEach((s, i) => {
				const [x, y] = axisPoint(i, s * MAX_R);
				sel
					.append("circle")
					.attr("cx", x)
					.attr("cy", y)
					.attr("r", 3)
					.attr("fill", color);
			});
		});
	}, [financials, peer1.data, peer2.data, rendered]);

	if (!financials) return null;
	if (rendered.length === 0) return null;

	return (
		<div className="rounded border border-t-border bg-t-surface">
			<div className="border-b border-t-border px-3 py-2">
				<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
					Peer Comparison
				</h3>
				<p className="mt-0.5 font-mono text-[10px] text-t-text-muted">
					Radar of key financial ratios
				</p>
			</div>
			<div className="flex flex-col items-center py-4">
				<svg
					ref={svgRef}
					viewBox="0 0 280 280"
					className="w-full max-w-[280px]"
					aria-label="Peer comparison radar chart"
				/>
				<div className="mt-3 flex flex-row items-center gap-4">
					{rendered.map(({ label, color }) => (
						<div key={label} className="flex items-center gap-1.5">
							<span
								className="inline-block h-2.5 w-2.5 rounded-full"
								style={{ backgroundColor: color }}
							/>
							<span className="font-mono text-[11px] text-t-text-muted">{label}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
