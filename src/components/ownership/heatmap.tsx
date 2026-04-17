import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { HeatmapData } from "./types";

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + "\u2026" : s;
}

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

interface HeatmapProps {
  data: HeatmapData;
}

export function Heatmap({ data }: HeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!width || !svgRef.current || !data.cells.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const leftMargin = width < 500 ? 100 : 190;
    const topMargin = width < 500 ? 80 : 130;
    const margin = { top: topMargin, right: 20, bottom: 20, left: leftMargin };
    const cellSize = Math.max(
      13,
      Math.min(
        22,
        (width - margin.left - margin.right) / data.companies.length,
      ),
    );
    const w = margin.left + data.companies.length * cellSize + margin.right;
    const h = margin.top + data.investors.length * cellSize + margin.bottom;

    svg.attr("width", w).attr("height", h);

    const defs = svg.append("defs");

    // Dark-theme color scale: #071111 (zero) -> #ffbf47 (high)
    const colorScale = (pct: number) => {
      if (pct <= 0) return "#071111";
      if (pct <= 2)
        return d3.interpolateRgb("#1a2e2e", "#3d5c3a")(pct / 2);
      if (pct <= 10)
        return d3.interpolateRgb("#3d5c3a", "#8b7420")((pct - 2) / 8);
      if (pct <= 30)
        return d3.interpolateRgb("#8b7420", "#d4a020")((pct - 10) / 20);
      return d3.interpolateRgb("#d4a020", "#ffbf47")(
        Math.min((pct - 30) / 30, 1),
      );
    };

    const g = svg.append("g");

    // Build lookup
    const cellMap = new Map<string, number>();
    for (const c of data.cells) {
      cellMap.set(`${c.investor}|${c.companyCode}`, c.percentage);
    }

    // Company labels (top) -- rotated
    g.selectAll(".col-label")
      .data(data.companies)
      .enter()
      .append("text")
      .attr("class", "col-label")
      .attr("x", 0)
      .attr("y", 0)
      .attr(
        "transform",
        (_, i) =>
          `translate(${margin.left + i * cellSize + cellSize / 2}, ${margin.top - 8}) rotate(-60)`,
      )
      .attr("text-anchor", "start")
      .attr("font-size", "9px")
      .attr("font-weight", "500")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("fill", "#72857e")
      .text((d) => d.code);

    // Investor labels (left)
    g.selectAll(".row-label")
      .data(data.investors)
      .enter()
      .append("text")
      .attr("class", "row-label")
      .attr("x", margin.left - 8)
      .attr("y", (_, i) => margin.top + i * cellSize + cellSize / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "9px")
      .attr("font-weight", "500")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("fill", "#72857e")
      .text((d) => truncate(d, width < 500 ? 12 : 24));

    // Cells with staggered fade-in
    const tooltip = d3.select(tooltipRef.current);

    for (let ri = 0; ri < data.investors.length; ri++) {
      for (let ci = 0; ci < data.companies.length; ci++) {
        const pct =
          cellMap.get(`${data.investors[ri]}|${data.companies[ci].code}`) ?? 0;
        g.append("rect")
          .attr("x", margin.left + ci * cellSize)
          .attr("y", margin.top + ri * cellSize)
          .attr("width", cellSize - 1.5)
          .attr("height", cellSize - 1.5)
          .attr("rx", 2.5)
          .attr("fill", colorScale(pct))
          .attr(
            "stroke",
            pct > 0 ? "rgba(255,191,71,0.3)" : "none",
          )
          .attr("stroke-width", 0.5)
          .attr("opacity", 0)
          .style("cursor", pct > 0 ? "pointer" : "default")
          .on("mouseenter", function (event) {
            if (pct === 0) return;
            d3.select(this)
              .transition()
              .duration(150)
              .attr("stroke", "#ffbf47")
              .attr("stroke-width", 2)
              .attr("stroke-opacity", 0.8);

            g.selectAll(".row-label")
              .filter((_, idx) => idx === ri)
              .attr("fill", "#ffbf47")
              .attr("font-weight", "700");
            g.selectAll(".col-label")
              .filter((_, idx) => idx === ci)
              .attr("fill", "#ffbf47")
              .attr("font-weight", "700");

            tooltip
              .style("display", "block")
              .style("left", `${event.offsetX + 14}px`)
              .style("top", `${event.offsetY - 12}px`)
              .html(
                `<strong>${truncate(data.investors[ri], 30)}</strong><br/>` +
                  `holds <strong style="color:#ffbf47">${pct.toFixed(2)}%</strong> of<br/>` +
                  `<strong>${data.companies[ci].code}</strong> — ${truncate(data.companies[ci].name, 30)}`,
              );
          })
          .on("mousemove", (event) => {
            tooltip
              .style("left", `${event.offsetX + 14}px`)
              .style("top", `${event.offsetY - 12}px`);
          })
          .on("mouseleave", function () {
            d3.select(this)
              .transition()
              .duration(150)
              .attr(
                "stroke",
                pct > 0 ? "rgba(255,191,71,0.3)" : "none",
              )
              .attr("stroke-width", 0.5)
              .attr("stroke-opacity", 1);
            g.selectAll(".row-label")
              .attr("fill", "#72857e")
              .attr("font-weight", "500");
            g.selectAll(".col-label")
              .attr("fill", "#72857e")
              .attr("font-weight", "500");
            tooltip.style("display", "none");
          })
          .transition()
          .duration(300)
          .delay(ri * 15 + ci * 5)
          .attr("opacity", 1);
      }
    }

    // Color legend
    const legendW = 200;
    const legendH = 10;
    const legendX = margin.left;
    const legendY = margin.top - 100;

    const legendGrad = defs
      .append("linearGradient")
      .attr("id", "heatmap-legend-grad");
    const stops = [0, 0.1, 0.25, 0.5, 0.75, 1];
    stops.forEach((s) => {
      legendGrad
        .append("stop")
        .attr("offset", `${s * 100}%`)
        .attr("stop-color", colorScale(s * 50));
    });

    const legend = g
      .append("g")
      .attr("transform", `translate(${legendX}, ${legendY})`);
    legend
      .append("rect")
      .attr("width", legendW)
      .attr("height", legendH)
      .attr("rx", 3)
      .attr("fill", "url(#heatmap-legend-grad)");

    legend
      .append("text")
      .attr("y", -4)
      .attr("font-size", "9px")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("fill", "#72857e")
      .text("0%");
    legend
      .append("text")
      .attr("x", legendW)
      .attr("y", -4)
      .attr("text-anchor", "end")
      .attr("font-size", "9px")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("fill", "#72857e")
      .text("50%+");
  }, [data, width]);

  return (
    <div ref={containerRef} className="relative overflow-x-auto">
      <svg ref={svgRef} />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute bg-t-surface border border-t-border rounded-lg shadow-xl px-3 py-2 font-mono text-[11px] text-t-text"
        style={{ display: "none" }}
      />
    </div>
  );
}
