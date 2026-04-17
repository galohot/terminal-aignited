import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { TypeDistributionItem } from "./types";

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

interface TypeDistributionBarProps {
  data: TypeDistributionItem[];
}

export function TypeDistributionBar({ data }: TypeDistributionBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!width || !svgRef.current || !data.length) return;

    const margin = {
      top: 4,
      right: width < 400 ? 36 : 56,
      bottom: 4,
      left: width < 400 ? 60 : 100,
    };
    const barHeight = 28;
    const gap = 8;
    const height =
      data.length * (barHeight + gap) + margin.top + margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const defs = svg.append("defs");
    data.forEach((d) => {
      const grad = defs
        .append("linearGradient")
        .attr("id", `bar-grad-${d.type}`)
        .attr("x1", "0%")
        .attr("x2", "100%");
      grad
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d.color)
        .attr("stop-opacity", 0.9);
      grad
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d.color)
        .attr("stop-opacity", 0.5);
    });

    const maxCount = d3.max(data, (d) => d.count) ?? 1;
    const x = d3
      .scaleLinear()
      .domain([0, maxCount])
      .range([0, width - margin.left - margin.right]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    const tooltip = d3.select(tooltipRef.current);

    data.forEach((d, i) => {
      const y = i * (barHeight + gap);

      // Label
      g.append("text")
        .attr("x", -8)
        .attr("y", y + barHeight / 2)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "central")
        .attr("font-size", width < 400 ? "9px" : "11px")
        .attr("font-weight", "500")
        .attr("font-family", "var(--font-mono, monospace)")
        .attr("fill", "#72857e")
        .text(
          width < 400 && d.label.length > 8
            ? `${d.label.slice(0, 8)}\u2026`
            : d.label,
        );

      // Track background
      g.append("rect")
        .attr("x", 0)
        .attr("y", y + 2)
        .attr("width", width - margin.left - margin.right)
        .attr("height", barHeight - 4)
        .attr("rx", 6)
        .attr("fill", "#101918");

      // Bar with gradient
      g.append("rect")
        .attr("x", 0)
        .attr("y", y + 2)
        .attr("width", 0)
        .attr("height", barHeight - 4)
        .attr("rx", 6)
        .attr("fill", `url(#bar-grad-${d.type})`)
        .style("cursor", "pointer")
        .on("mouseenter", function (event) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("y", y)
            .attr("height", barHeight);
          tooltip
            .style("display", "block")
            .style("left", `${event.offsetX + 12}px`)
            .style("top", `${event.offsetY - 10}px`)
            .html(
              `<strong>${d.label}</strong><br/>` +
                `<span style="color:#72857e">Holdings:</span> ${d.count.toLocaleString()}<br/>` +
                `<span style="color:#72857e">Total ownership:</span> ${d.totalPct.toFixed(1)}%<br/>` +
                `<span style="color:#72857e">Avg per holding:</span> ${d.avgPct.toFixed(1)}%`,
            );
        })
        .on("mouseleave", function () {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("y", y + 2)
            .attr("height", barHeight - 4);
          tooltip.style("display", "none");
        })
        .transition()
        .duration(700)
        .delay(i * 60)
        .ease(d3.easeBackOut.overshoot(0.3))
        .attr("width", x(d.count));

      // Count label
      g.append("text")
        .attr("x", 0)
        .attr("y", y + barHeight / 2)
        .attr("dominant-baseline", "central")
        .attr("font-size", "10px")
        .attr("font-family", "var(--font-mono, monospace)")
        .attr("font-weight", "600")
        .attr("fill", "#b8c3be")
        .attr("opacity", 0)
        .text(d.count.toLocaleString())
        .transition()
        .duration(700)
        .delay(i * 60)
        .attr("x", x(d.count) + 8)
        .attr("opacity", 1);
    });
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
