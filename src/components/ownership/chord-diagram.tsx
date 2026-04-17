import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { ChordData } from "./types";

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

interface ChordDiagramProps {
  data: ChordData;
  onArcClick?: (index: number) => void;
  onRibbonClick?: (sourceIndex: number, targetIndex: number) => void;
}

export function ChordDiagram({
  data,
  onArcClick,
  onRibbonClick,
}: ChordDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!width || !svgRef.current || !data.matrix.length) return;

    const size = Math.min(width, 520);
    const outerRadius = size / 2 - 50;
    const innerRadius = outerRadius - 22;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", size).attr("height", size);

    const defs = svg.append("defs");

    const filter = defs.append("filter").attr("id", "chord-shadow");
    filter
      .append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 1)
      .attr("stdDeviation", 3)
      .attr("flood-color", "rgba(0,0,0,0.3)");

    data.colors.forEach((c, i) => {
      data.colors.forEach((c2, j) => {
        if (i >= j) return;
        const grad = defs
          .append("linearGradient")
          .attr("id", `ribbon-grad-${i}-${j}`)
          .attr("gradientUnits", "userSpaceOnUse");
        grad.append("stop").attr("offset", "0%").attr("stop-color", c);
        grad.append("stop").attr("offset", "100%").attr("stop-color", c2);
      });
    });

    const g = svg
      .append("g")
      .attr("transform", `translate(${size / 2},${size / 2})`);

    const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending);
    const chords = chord(data.matrix);

    const arc = d3
      .arc<d3.ChordGroup>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);
    const arcHover = d3
      .arc<d3.ChordGroup>()
      .innerRadius(innerRadius - 2)
      .outerRadius(outerRadius + 3);
    const ribbon = d3
      .ribbon<d3.Chord, d3.ChordSubgroup>()
      .radius(innerRadius);

    const tooltip = d3.select(tooltipRef.current);

    // Ribbons
    g.selectAll(".ribbon")
      .data(chords)
      .enter()
      .append("path")
      .attr("class", "ribbon")
      .attr("d", ribbon as any)
      .attr("fill", (d) => {
        const si = Math.min(d.source.index, d.target.index);
        const ti = Math.max(d.source.index, d.target.index);
        return `url(#ribbon-grad-${si}-${ti})`;
      })
      .style("opacity", 0)
      .on("mouseenter", function (event, d) {
        g.selectAll(".ribbon")
          .transition()
          .duration(200)
          .style("opacity", 0.06);
        d3.select(this).transition().duration(200).style("opacity", 0.75);
        tooltip
          .style("display", "block")
          .style("left", `${event.offsetX + 14}px`)
          .style("top", `${event.offsetY - 12}px`)
          .html(
            `<strong>${data.names[d.source.index]}</strong> ↔ <strong>${data.names[d.target.index]}</strong><br/>` +
              `<span style="color:#72857e">Co-investments:</span> ${d.source.value}`,
          );
      })
      .on("mouseleave", () => {
        g.selectAll(".ribbon")
          .transition()
          .duration(200)
          .style("opacity", 0.35);
        tooltip.style("display", "none");
      })
      .on("click", (_event, d) => {
        onRibbonClick?.(d.source.index, d.target.index);
      })
      .transition()
      .delay(400)
      .duration(600)
      .style("opacity", 0.35);

    // Arcs
    const groups = g
      .selectAll(".arc")
      .data(chords.groups)
      .enter()
      .append("g")
      .attr("class", "arc");

    groups
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => data.colors[d.index])
      .attr("stroke", "#233534")
      .attr("stroke-width", 1.5)
      .attr("filter", "url(#chord-shadow)")
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("d", (d: any) => arcHover(d) ?? "");
        g.selectAll(".ribbon")
          .transition()
          .duration(200)
          .style("opacity", (r: any) =>
            r.source.index === d.index || r.target.index === d.index
              ? 0.7
              : 0.04,
          );
        tooltip
          .style("display", "block")
          .style("left", `${event.offsetX + 14}px`)
          .style("top", `${event.offsetY - 12}px`)
          .html(`<strong>${data.names[d.index]}</strong>`);
      })
      .on("mouseleave", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("d", (d: any) => arc(d) ?? "");
        g.selectAll(".ribbon")
          .transition()
          .duration(200)
          .style("opacity", 0.35);
        tooltip.style("display", "none");
      })
      .on("click", (_event, d) => {
        onArcClick?.(d.index);
      });

    // Arc labels
    groups
      .append("text")
      .each(function (d) {
        const angle = (d.startAngle + d.endAngle) / 2;
        d3.select(this)
          .attr(
            "transform",
            `rotate(${(angle * 180) / Math.PI - 90}) translate(${outerRadius + 12}) ${angle > Math.PI ? "rotate(180)" : ""}`,
          )
          .attr("text-anchor", angle > Math.PI ? "end" : "start");
      })
      .attr("font-size", "10px")
      .attr("font-weight", "600")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("fill", "#72857e")
      .text((d) => data.names[d.index])
      .attr("opacity", 0)
      .transition()
      .delay(600)
      .duration(400)
      .attr("opacity", 1);
  }, [data, width, onArcClick, onRibbonClick]);

  return (
    <div ref={containerRef} className="relative flex justify-center">
      <svg ref={svgRef} />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute bg-t-surface border border-t-border rounded-lg shadow-xl px-3 py-2 font-mono text-[11px] text-t-text"
        style={{ display: "none" }}
      />
    </div>
  );
}
