import * as d3 from "d3";
import { useCallback, useEffect, useRef } from "react";
import { INVESTOR_TYPE_COLORS } from "./constants";
import type { InvestorType, TreemapNode } from "./types";

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + "\u2026" : s;
}

interface TreemapProps {
  data: TreemapNode;
  onCellClick?: (name: string) => void;
}

export function Treemap({ data, onCellClick }: TreemapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const onCellClickRef = useRef(onCellClick);
  onCellClickRef.current = onCellClick;

  const draw = useCallback(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    if (!container || !svgEl || !data.children?.length) return;

    let width = Math.floor(container.getBoundingClientRect().width);

    if (width < 200) {
      let el: HTMLElement | null = container.parentElement;
      while (el && el.getBoundingClientRect().width < 200) {
        el = el.parentElement;
      }
      if (el) width = Math.floor(el.getBoundingClientRect().width);
    }
    if (width < 100) return;

    const height = Math.max(320, Math.min(480, width * 0.38));
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    const root = d3
      .hierarchy(data)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    d3.treemap<TreemapNode>()
      .size([width, height])
      .padding(3)
      .paddingInner(2)
      .round(true)(root);

    const tooltip = d3.select(tooltipRef.current);

    const cells = svg
      .selectAll("g")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`);

    cells
      .append("rect")
      .attr("width", (d: any) => Math.max(0, d.x1 - d.x0))
      .attr("height", (d: any) => Math.max(0, d.y1 - d.y0))
      .attr("rx", 4)
      .attr("fill", (d) => {
        const type = d.data.type as InvestorType | undefined;
        if (d.data.name === "Public Float") return "#233534";
        return type ? INVESTOR_TYPE_COLORS[type] : "#6b7280";
      })
      .attr("fill-opacity", (d) =>
        d.data.name === "Public Float" ? 0.4 : 0.75,
      )
      .attr("stroke", (d) => {
        const type = d.data.type as InvestorType | undefined;
        if (d.data.name === "Public Float") return "#233534";
        return type ? INVESTOR_TYPE_COLORS[type] : "#6b7280";
      })
      .attr("stroke-opacity", 0.2)
      .attr("stroke-width", 1)
      .style("cursor", (d) =>
        d.data.name !== "Public Float" ? "pointer" : "default",
      )
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .attr(
            "fill-opacity",
            d.data.name === "Public Float" ? 0.5 : 0.95,
          )
          .attr("stroke-opacity", 0.6)
          .attr("stroke-width", 1.5);
        tooltip
          .style("display", "block")
          .style("left", `${event.offsetX + 12}px`)
          .style("top", `${event.offsetY - 10}px`)
          .html(
            `<strong>${d.data.name}</strong><br/>${(d.data.value ?? 0).toFixed(2)}%`,
          );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.offsetX + 12}px`)
          .style("top", `${event.offsetY - 10}px`);
      })
      .on("mouseleave", function () {
        d3.select(this)
          .attr("fill-opacity", (d: any) =>
            d.data.name === "Public Float" ? 0.4 : 0.75,
          )
          .attr("stroke-opacity", 0.2)
          .attr("stroke-width", 1);
        tooltip.style("display", "none");
      })
      .on("click", (_, d) => {
        if (d.data.name !== "Public Float")
          onCellClickRef.current?.(d.data.name);
      });

    // Name label
    cells
      .append("text")
      .attr("x", 8)
      .attr("y", 18)
      .attr("font-size", (d: any) => {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        if (w > 160 && h > 50) return "12px";
        return "10px";
      })
      .attr("font-weight", "500")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("fill", (d) =>
        d.data.name === "Public Float" ? "#72857e" : "#FFFFFF",
      )
      .attr("pointer-events", "none")
      .text((d: any) => {
        const w = d.x1 - d.x0;
        if (w < 45) return "";
        return truncate(d.data.name, Math.floor(w / 6));
      });

    // Percentage label
    cells
      .append("text")
      .attr("x", 8)
      .attr("y", (d: any) => {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        if (w > 160 && h > 50) return 34;
        return 31;
      })
      .attr("font-size", (d: any) => {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        if (w > 160 && h > 50) return "13px";
        return "10px";
      })
      .attr("font-weight", "700")
      .attr("fill", (d) =>
        d.data.name === "Public Float" ? "#72857e" : "rgba(255,255,255,0.85)",
      )
      .attr("pointer-events", "none")
      .attr("font-family", "var(--font-mono, monospace)")
      .text((d: any) => {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        if (w < 40 || h < 35) return "";
        return `${(d.data.value ?? 0).toFixed(1)}%`;
      });
  }, [data]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame1: number;
    let frame2: number;
    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        draw();
      });
    });

    const observer = new ResizeObserver(() => draw());
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
      observer.disconnect();
    };
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: "100%", minWidth: 0 }}
    >
      <svg
        ref={svgRef}
        style={{ display: "block", maxWidth: "100%" }}
      />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute bg-t-surface border border-t-border rounded-lg shadow-xl px-3 py-2 font-mono text-[11px] text-t-text"
        style={{ display: "none" }}
      />
    </div>
  );
}
