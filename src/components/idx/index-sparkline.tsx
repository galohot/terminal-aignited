import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { IdxIndexHistoryPoint } from "../../types/market";

const W = 80;
const H = 24;
const PAD = 2;

export function IndexSparkline({ data }: { data: IdxIndexHistoryPoint[] }) {
	const svgRef = useRef<SVGSVGElement>(null);

	useEffect(() => {
		const svg = svgRef.current;
		if (!svg || data.length < 2) return;

		const sel = d3.select(svg);
		sel.selectAll("*").remove();

		const g = sel.append("g").attr("transform", `translate(${PAD},${PAD})`);
		const iw = W - PAD * 2;
		const ih = H - PAD * 2;

		const closes = data.map((d) => d.close);
		const [min, max] = d3.extent(closes) as [number, number];
		const valPad = Math.max((max - min) * 0.1, 0.01);

		const x = d3
			.scaleLinear()
			.domain([0, data.length - 1])
			.range([0, iw]);
		const y = d3
			.scaleLinear()
			.domain([min - valPad, max + valPad])
			.range([ih, 0]);

		const last = closes[closes.length - 1];
		const first = closes[0];
		const color = last >= first ? "#22c55e" : "#ef4444";

		// Area
		const area = d3
			.area<number>()
			.x((_, i) => x(i))
			.y0(ih)
			.y1((d) => y(d))
			.curve(d3.curveMonotoneX);

		g.append("path").datum(closes).attr("d", area).attr("fill", color).attr("fill-opacity", 0.15);

		// Line
		const line = d3
			.line<number>()
			.x((_, i) => x(i))
			.y((d) => y(d))
			.curve(d3.curveMonotoneX);

		g.append("path")
			.datum(closes)
			.attr("d", line)
			.attr("fill", "none")
			.attr("stroke", color)
			.attr("stroke-width", 1.5);
	}, [data]);

	if (data.length < 2) return null;

	return (
		<svg
			ref={svgRef}
			viewBox={`0 0 ${W} ${H}`}
			className="w-full"
			style={{ height: H }}
			aria-hidden="true"
		/>
	);
}
