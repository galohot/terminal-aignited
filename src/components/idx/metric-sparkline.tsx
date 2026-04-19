import * as d3 from "d3";
import { useEffect, useRef } from "react";

const VIEW_W = 140;
const VIEW_H = 40;
const PAD = { top: 4, right: 4, bottom: 4, left: 4 };
const INNER_W = VIEW_W - PAD.left - PAD.right;
const INNER_H = VIEW_H - PAD.top - PAD.bottom;

export function MetricSparkline({
	data,
	color,
	type,
}: {
	data: (number | null)[];
	color: string;
	type: "line" | "bar";
}) {
	const svgRef = useRef<SVGSVGElement>(null);

	useEffect(() => {
		const svg = svgRef.current;
		if (!svg) return;

		const selection = d3.select(svg);
		selection.selectAll("*").remove();

		const g = selection.append("g").attr("transform", `translate(${PAD.left},${PAD.top})`);

		if (type === "line") {
			const indexed: { i: number; v: number }[] = [];
			data.forEach((v, i) => {
				if (v != null) indexed.push({ i, v });
			});
			if (indexed.length < 2) return;

			const [rawMin, rawMax] = d3.extent(indexed, (d) => d.v) as [number, number];
			const valuePad = Math.max(Math.abs(rawMax - rawMin) * 0.1, 0.1);
			const yMin = rawMin - valuePad;
			const yMax = rawMax + valuePad;

			const xScale = d3
				.scaleLinear()
				.domain([0, data.length - 1])
				.range([0, INNER_W]);

			const yScale = d3.scaleLinear().domain([yMin, yMax]).range([INNER_H, 0]);

			// Zero line if domain spans negative
			if (yMin < 0 && yMax > 0) {
				g.append("line")
					.attr("x1", 0)
					.attr("x2", INNER_W)
					.attr("y1", yScale(0))
					.attr("y2", yScale(0))
					.attr("stroke", "#ffffff15")
					.attr("stroke-width", 1)
					.attr("stroke-dasharray", "3,3");
			}

			// Area
			const areaGen = d3
				.area<{ i: number; v: number }>()
				.x((d) => xScale(d.i))
				.y0(yScale(Math.max(yMin, 0)))
				.y1((d) => yScale(d.v))
				.curve(d3.curveMonotoneX);

			g.append("path")
				.datum(indexed)
				.attr("d", areaGen)
				.attr("fill", color)
				.attr("fill-opacity", 0.15);

			// Line
			const lineGen = d3
				.line<{ i: number; v: number }>()
				.x((d) => xScale(d.i))
				.y((d) => yScale(d.v))
				.curve(d3.curveMonotoneX);

			g.append("path")
				.datum(indexed)
				.attr("d", lineGen)
				.attr("fill", "none")
				.attr("stroke", color)
				.attr("stroke-width", 1.5);

			// Last point dot
			const last = indexed[indexed.length - 1];
			g.append("circle")
				.attr("cx", xScale(last.i))
				.attr("cy", yScale(last.v))
				.attr("r", 2.5)
				.attr("fill", color);
		} else {
			// Bar chart
			const n = data.length;
			if (n === 0) return;

			const values = data.map((v) => v ?? 0);
			const [rawMin, rawMax] = d3.extent(values) as [number, number];
			const yMin = Math.min(rawMin, 0);
			const yMax = Math.max(rawMax, 0);
			const valuePad = Math.max((yMax - yMin) * 0.05, 0.1);

			const xScale = d3.scaleBand<number>().domain(d3.range(n)).range([0, INNER_W]).paddingInner(0);

			const yScale = d3
				.scaleLinear()
				.domain([yMin - valuePad, yMax + valuePad])
				.range([INNER_H, 0]);

			const bw = Math.max(xScale.bandwidth() - 1, 1);
			const baseline = yScale(0);

			data.forEach((v, i) => {
				const val = v ?? 0;
				const barColor = val >= 0 ? color : "#ef4444";
				const y = val >= 0 ? yScale(val) : baseline;
				const h = Math.abs(yScale(val) - baseline);

				g.append("rect")
					.attr("x", xScale(i) ?? 0)
					.attr("y", y)
					.attr("width", bw)
					.attr("height", Math.max(h, 1))
					.attr("fill", barColor);
			});
		}
	}, [data, color, type]);

	return (
		<svg
			ref={svgRef}
			viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
			className="w-full"
			style={{ height: 40 }}
			aria-hidden="true"
		/>
	);
}
