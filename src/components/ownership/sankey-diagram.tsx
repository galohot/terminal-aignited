import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { SankeyData } from "./types";

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

interface SNode {
  id: string;
  label: string;
  color: string;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  sourceLinks?: SLink[];
  targetLinks?: SLink[];
  value?: number;
}

interface SLink {
  source: SNode;
  target: SNode;
  value: number;
  width?: number;
  y0?: number;
  y1?: number;
}

interface SankeyDiagramProps {
  data: SankeyData;
  onNodeClick?: (nodeId: string) => void;
  onLinkClick?: (sourceId: string, targetId: string) => void;
}

export function SankeyDiagram({
  data,
  onNodeClick,
  onLinkClick,
}: SankeyDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(containerRef);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!width || !svgRef.current || !data.nodes.length) return;

    const height = 480;
    const sideMargin = width < 500 ? 80 : 160;
    const margin = { top: 24, right: sideMargin, bottom: 24, left: sideMargin };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    const tooltip = d3.select(tooltipRef.current);

    // Build node map
    const nodeMap = new Map<string, SNode>();
    for (const n of data.nodes) {
      nodeMap.set(n.id, { ...n, sourceLinks: [], targetLinks: [] });
    }

    // Build links
    const links: SLink[] = data.links
      .filter((l) => nodeMap.has(l.source) && nodeMap.has(l.target))
      .map((l) => ({
        source: nodeMap.get(l.source)!,
        target: nodeMap.get(l.target)!,
        value: l.value,
      }));

    for (const link of links) {
      link.source.sourceLinks!.push(link);
      link.target.targetLinks!.push(link);
    }

    for (const [, node] of nodeMap) {
      node.value = Math.max(
        d3.sum(node.sourceLinks!, (l) => l.value),
        d3.sum(node.targetLinks!, (l) => l.value),
      );
    }

    const leftNodes = Array.from(nodeMap.values()).filter((n) =>
      n.id.startsWith("src:"),
    );
    const rightNodes = Array.from(nodeMap.values()).filter((n) =>
      n.id.startsWith("cat:"),
    );

    leftNodes.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    rightNodes.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const nodeWidth = 12;
    const nodePadding = 4;

    const leftTotal = d3.sum(leftNodes, (n) => n.value ?? 0);
    const leftScale = innerH / (leftTotal + nodePadding * leftNodes.length);
    let yPos = 0;
    for (const node of leftNodes) {
      const h = Math.max(2, (node.value ?? 0) * leftScale);
      node.x0 = 0;
      node.x1 = nodeWidth;
      node.y0 = yPos;
      node.y1 = yPos + h;
      yPos += h + nodePadding;
    }

    const rightTotal = d3.sum(rightNodes, (n) => n.value ?? 0);
    const rightScale = innerH / (rightTotal + nodePadding * rightNodes.length);
    yPos = 0;
    for (const node of rightNodes) {
      const h = Math.max(2, (node.value ?? 0) * rightScale);
      node.x0 = innerW - nodeWidth;
      node.x1 = innerW;
      node.y0 = yPos;
      node.y1 = yPos + h;
      yPos += h + nodePadding;
    }

    for (const node of leftNodes) {
      let sy = node.y0!;
      const nodeH = node.y1! - node.y0! || 1;
      for (const link of node.sourceLinks!.sort((a, b) => b.value - a.value)) {
        link.width = (link.value / (node.value || 1)) * nodeH;
        link.y0 = sy + (link.width ?? 0) / 2;
        sy += link.width ?? 0;
      }
    }
    for (const node of rightNodes) {
      let ty = node.y0!;
      const nodeH = node.y1! - node.y0! || 1;
      for (const link of node.targetLinks!.sort(
        (a, b) => b.value - a.value,
      )) {
        link.width =
          link.width ?? (link.value / (node.value || 1)) * nodeH;
        link.y1 = ty + (link.width ?? 0) / 2;
        ty += link.width ?? 0;
      }
    }

    // Draw links
    g.selectAll(".sankey-link")
      .data(links.filter((l) => l.y0 !== undefined && l.y1 !== undefined))
      .enter()
      .append("path")
      .attr("class", "sankey-link")
      .attr("d", (d) => {
        const x0 = d.source.x1 ?? 0;
        const x1 = d.target.x0 ?? 0;
        const xi = d3.interpolateNumber(x0, x1);
        return `M${x0},${d.y0} C${xi(0.5)},${d.y0} ${xi(0.5)},${d.y1} ${x1},${d.y1}`;
      })
      .attr("fill", "none")
      .attr("stroke", (d) => d.source.color)
      .attr("stroke-opacity", 0.25)
      .attr("stroke-width", (d) => Math.max(1, d.width ?? 1))
      .style("cursor", onLinkClick ? "pointer" : "default")
      .on("mouseenter", function (event, d) {
        d3.select(this).attr("stroke-opacity", 0.6);
        tooltip
          .style("display", "block")
          .style("left", `${event.offsetX + 12}px`)
          .style("top", `${event.offsetY - 10}px`)
          .html(
            `<strong>${d.source.label}</strong> → <strong>${d.target.label}</strong><br/>Records: ${d.value}`,
          );
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke-opacity", 0.25);
        tooltip.style("display", "none");
      })
      .on("click", (_, d) => {
        onLinkClick?.(d.source.id, d.target.id);
      });

    // Draw nodes
    const allNodes = [...leftNodes, ...rightNodes];
    g.selectAll(".sankey-node")
      .data(allNodes)
      .enter()
      .append("rect")
      .attr("x", (d) => d.x0!)
      .attr("y", (d) => d.y0!)
      .attr("width", nodeWidth)
      .attr("height", (d) => Math.max(2, d.y1! - d.y0!))
      .attr("fill", (d) => d.color)
      .attr("rx", 2)
      .style("cursor", onNodeClick ? "pointer" : "default")
      .on("click", (_, d) => {
        onNodeClick?.(d.id);
      });

    // Left labels
    g.selectAll(".left-label")
      .data(leftNodes.filter((n) => n.y1! - n.y0! > 8))
      .enter()
      .append("text")
      .attr("x", -6)
      .attr("y", (d) => (d.y0! + d.y1!) / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", width < 500 ? "7px" : "9px")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("fill", "#72857e")
      .style("cursor", onNodeClick ? "pointer" : "default")
      .text((d) =>
        width < 500 && d.label.length > 12
          ? `${d.label.slice(0, 12)}\u2026`
          : d.label,
      )
      .on("mouseenter", function () {
        d3.select(this).attr("fill", "#ffbf47");
      })
      .on("mouseleave", function () {
        d3.select(this).attr("fill", "#72857e");
      })
      .on("click", (_, d) => {
        onNodeClick?.(d.id);
      });

    // Right labels
    g.selectAll(".right-label")
      .data(rightNodes)
      .enter()
      .append("text")
      .attr("x", innerW + 6)
      .attr("y", (d) => (d.y0! + d.y1!) / 2)
      .attr("text-anchor", "start")
      .attr("dominant-baseline", "middle")
      .attr("font-size", width < 500 ? "8px" : "10px")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("fill", "#72857e")
      .style("cursor", onNodeClick ? "pointer" : "default")
      .text((d) =>
        width < 500 && d.label.length > 12
          ? `${d.label.slice(0, 12)}\u2026`
          : d.label,
      )
      .on("mouseenter", function () {
        d3.select(this).attr("fill", "#ffbf47");
      })
      .on("mouseleave", function () {
        d3.select(this).attr("fill", "#72857e");
      })
      .on("click", (_, d) => {
        onNodeClick?.(d.id);
      });
  }, [data, width, onNodeClick, onLinkClick]);

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
