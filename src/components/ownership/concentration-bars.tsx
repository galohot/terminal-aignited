import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { ConcentrationBucket } from "./types";

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

const BUCKET_GRADIENTS = [
  { start: "#ef4444", end: "#f87171" },
  { start: "#f97316", end: "#fb923c" },
  { start: "#eab308", end: "#fbbf24" },
  { start: "#22c55e", end: "#4ade80" },
  { start: "#14b8a6", end: "#3ddc91" },
];

interface ConcentrationBarsProps {
  data: ConcentrationBucket[];
}

export function ConcentrationBars({ data }: ConcentrationBarsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!width || !svgRef.current || !data.length) return;

    const margin = { top: 16, right: 8, bottom: 36, left: 8 };
    const height = 220;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const defs = svg.append("defs");
    data.forEach((_, i) => {
      const colors = BUCKET_GRADIENTS[i] ?? BUCKET_GRADIENTS[BUCKET_GRADIENTS.length - 1];
      const grad = defs
        .append("linearGradient")
        .attr("id", `conc-grad-${i}`)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
      grad
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colors.start);
      grad
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colors.end)
        .attr("stop-opacity", 0.6);
    });

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    const tooltip = d3.select(tooltipRef.current);

    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.bucket))
      .range([0, innerW])
      .padding(0.3);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.count) ?? 1])
      .nice()
      .range([innerH, 0]);

    // Grid lines
    const ticks = y.ticks(4);
    g.selectAll(".grid-line")
      .data(ticks)
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "#233534")
      .attr("stroke-dasharray", "3,3");

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call((sel) => sel.select(".domain").remove())
      .selectAll("text")
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("fill", "#72857e")
      .attr("dy", "8");

    // Bars
    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.bucket)!)
      .attr("y", innerH)
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("rx", 6)
      .attr("fill", (_, i) => `url(#conc-grad-${i})`)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("x", x(d.bucket)! - 2)
          .attr("width", x.bandwidth() + 4);
        tooltip
          .style("display", "block")
          .style("left", `${event.offsetX + 12}px`)
          .style("top", `${event.offsetY - 10}px`)
          .html(
            `<strong>${d.bucket} insider ownership</strong><br/>` +
              `<span style="color:#72857e">${d.count} companies</span>`,
          );
      })
      .on("mouseleave", function (_event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr("x", x(d.bucket)!)
          .attr("width", x.bandwidth());
        tooltip.style("display", "none");
      })
      .transition()
      .duration(700)
      .delay((_, i) => i * 100)
      .ease(d3.easeBackOut.overshoot(0.4))
      .attr("y", (d) => y(d.count))
      .attr("height", (d) => innerH - y(d.count));

    // Count labels
    g.selectAll(".count-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "count-label")
      .attr("x", (d) => x(d.bucket)! + x.bandwidth() / 2)
      .attr("y", (d) => y(d.count) - 8)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "700")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("fill", "#b8c3be")
      .attr("opacity", 0)
      .text((d) => d.count)
      .transition()
      .duration(700)
      .delay((_, i) => i * 100)
      .attr("opacity", 1);
  }, [data, width]);

  return (
    <div ref={containerRef} className="relative">
      <svg ref={svgRef} />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute bg-t-surface border border-t-border rounded-lg shadow-xl px-3 py-2 font-mono text-[11px] text-t-text"
        style={{ display: "none" }}
      />
    </div>
  );
}
