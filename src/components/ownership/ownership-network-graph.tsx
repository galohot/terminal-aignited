import * as d3 from "d3";
import { useCallback, useEffect, useRef, useState } from "react";
import { INVESTOR_TYPE_COLORS, INVESTOR_TYPE_LABELS, LOCAL_FOREIGN_LABELS } from "./constants";
import type { GraphData, GraphNode } from "./types";

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

interface SimNode extends GraphNode, d3.SimulationNodeDatum {}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  percentage: number;
}

interface NetworkGraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
}

function nodeRadius(d: SimNode) {
  return d.type === "investor"
    ? Math.sqrt(d.size) * 3 + 5
    : Math.sqrt(d.size) * 2.5 + 4;
}

function nodeColor(d: SimNode) {
  if (d.type === "investor" && d.investorType)
    return INVESTOR_TYPE_COLORS[d.investorType];
  return "#72857e";
}

export function NetworkGraph({ data, onNodeClick }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(containerRef);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  const drawGraph = useCallback(() => {
    if (!width || !height || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (!data.nodes.length) return;

    const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
    const links: SimLink[] = data.links.map((l) => ({
      source: l.source,
      target: l.target,
      percentage: l.percentage,
    }));

    if (simRef.current) simRef.current.stop();

    const defs = svg.append("defs");

    // Glow filter
    const glow = defs.append("filter").attr("id", "node-glow");
    glow.append("feGaussianBlur").attr("stdDeviation", 3).attr("result", "blur");
    glow
      .append("feComposite")
      .attr("in", "SourceGraphic")
      .attr("in2", "blur")
      .attr("operator", "over");

    // Arrow marker
    defs
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -3 6 6")
      .attr("refX", 14)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-3L6,0L0,3")
      .attr("fill", "#ffbf47")
      .attr("opacity", 0.3);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => {
            const s = l.source as SimNode;
            const t = l.target as SimNode;
            return 60 + (nodeRadius(s) + nodeRadius(t)) * 1.5;
          })
          .strength(0.4),
      )
      .force("charge", d3.forceManyBody().strength(-200).distanceMax(400))
      .force(
        "center",
        d3.forceCenter(width / 2, height / 2).strength(0.05),
      )
      .force(
        "collision",
        d3
          .forceCollide<SimNode>()
          .radius((d) => nodeRadius(d) + 6)
          .strength(0.8),
      )
      .force("x", d3.forceX(width / 2).strength(0.03))
      .force("y", d3.forceY(height / 2).strength(0.03))
      .alphaDecay(0.025)
      .velocityDecay(0.4);

    simRef.current = simulation;

    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 6])
      .on("zoom", (event) => g.attr("transform", event.transform.toString()));
    svg.call(zoom);

    const tooltip = d3.select(tooltipRef.current);

    // Links
    const linkG = g
      .append("g")
      .attr("class", "links-layer")
      .selectAll("path")
      .data(links)
      .enter()
      .append("path")
      .attr("class", "graph-link")
      .attr("fill", "none")
      .attr("stroke", "#233534")
      .attr("stroke-width", (d) =>
        Math.max(1, Math.sqrt(d.percentage) * 0.8),
      )
      .attr("marker-end", "url(#arrow)");

    // Node groups
    const nodeG = g
      .append("g")
      .attr("class", "nodes-layer")
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .enter()
      .append("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Investor nodes
    const investors = nodeG.filter((d) => d.type === "investor");

    investors
      .append("circle")
      .attr("class", "halo")
      .attr("r", (d) => nodeRadius(d) + 4)
      .attr("fill", "none")
      .attr("stroke", (d) => nodeColor(d))
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0)
      .attr("stroke-dasharray", "3 2");

    investors
      .append("circle")
      .attr("class", "node-shape")
      .attr("r", (d) => nodeRadius(d))
      .attr("fill", (d) => nodeColor(d))
      .attr("fill-opacity", 0.15)
      .attr("stroke", (d) => nodeColor(d))
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.8);

    investors
      .append("circle")
      .attr("r", (d) => Math.max(2.5, nodeRadius(d) * 0.3))
      .attr("fill", (d) => nodeColor(d))
      .attr("fill-opacity", 0.9);

    // Company nodes
    const companies = nodeG.filter((d) => d.type === "company");

    companies
      .append("rect")
      .attr("class", "halo")
      .attr("width", (d) => (nodeRadius(d) + 4) * 2)
      .attr("height", (d) => (nodeRadius(d) + 4) * 2)
      .attr("x", (d) => -(nodeRadius(d) + 4))
      .attr("y", (d) => -(nodeRadius(d) + 4))
      .attr("rx", 5)
      .attr("fill", "none")
      .attr("stroke", "#72857e")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0)
      .attr("stroke-dasharray", "3 2")
      .attr("transform", "rotate(45)");

    companies
      .append("rect")
      .attr("class", "node-shape")
      .attr("width", (d) => nodeRadius(d) * 2)
      .attr("height", (d) => nodeRadius(d) * 2)
      .attr("x", (d) => -nodeRadius(d))
      .attr("y", (d) => -nodeRadius(d))
      .attr("rx", 4)
      .attr("fill", "#101918")
      .attr("stroke", "#233534")
      .attr("stroke-width", 1.5)
      .attr("transform", "rotate(45)");

    companies
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", (d) => `${Math.max(7, nodeRadius(d) * 0.7)}px`)
      .attr("font-weight", "600")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("fill", "#b8c3be")
      .attr("pointer-events", "none")
      .text((d) => d.id.replace("co:", ""));

    // Labels
    investors
      .append("text")
      .attr("dy", (d) => nodeRadius(d) + 12)
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => (d.size >= 8 ? "10px" : "9px"))
      .attr("font-weight", (d) => (d.size >= 8 ? "600" : "400"))
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("fill", "#72857e")
      .attr("pointer-events", "none")
      .text((d) => truncate(d.label, d.size >= 8 ? 22 : 16));

    companies
      .append("text")
      .attr("dy", (d) => nodeRadius(d) + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("font-family", "var(--font-mono, monospace)")
      .attr("fill", "#72857e")
      .attr("pointer-events", "none")
      .text((d) => truncate(d.label, 18));

    // Interactions
    nodeG
      .on("mouseenter", function (event, d) {
        const connected = new Set<string>();
        connected.add(d.id);
        links.forEach((l) => {
          const src =
            typeof l.source === "object"
              ? (l.source as SimNode).id
              : String(l.source);
          const tgt =
            typeof l.target === "object"
              ? (l.target as SimNode).id
              : String(l.target);
          if (src === d.id) connected.add(tgt);
          if (tgt === d.id) connected.add(src);
        });

        nodeG
          .transition()
          .duration(150)
          .style("opacity", (n) => (connected.has(n.id) ? 1 : 0.08));

        linkG
          .transition()
          .duration(150)
          .style("opacity", (l) => {
            const src =
              typeof l.source === "object"
                ? (l.source as SimNode).id
                : l.source;
            const tgt =
              typeof l.target === "object"
                ? (l.target as SimNode).id
                : l.target;
            return src === d.id || tgt === d.id ? 0.8 : 0.02;
          })
          .attr("stroke-width", (l) => {
            const src =
              typeof l.source === "object"
                ? (l.source as SimNode).id
                : l.source;
            const tgt =
              typeof l.target === "object"
                ? (l.target as SimNode).id
                : l.target;
            if (src === d.id || tgt === d.id) {
              return Math.max(2, Math.sqrt(l.percentage) * 1.2);
            }
            return Math.max(1, Math.sqrt(l.percentage) * 0.8);
          });

        d3.select(this).select(".halo").attr("stroke-opacity", 0.6);

        const typeLabel =
          d.type === "investor" && d.investorType
            ? INVESTOR_TYPE_LABELS[d.investorType]
            : "Company";
        const originLabel = d.localForeign
          ? (LOCAL_FOREIGN_LABELS[d.localForeign] ?? "")
          : "";

        tooltip
          .style("display", "block")
          .style("left", `${event.offsetX + 14}px`)
          .style("top", `${event.offsetY - 14}px`)
          .html(
            `<strong>${d.label}</strong><br/>` +
              `<span style="opacity:0.7">${typeLabel}${originLabel ? ` · ${originLabel}` : ""}</span><br/>` +
              `<span style="opacity:0.7">${d.type === "investor" ? `${d.size} companies` : `${d.size} insiders`}</span>`,
          );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.offsetX + 14}px`)
          .style("top", `${event.offsetY - 14}px`);
      })
      .on("mouseleave", function () {
        nodeG.transition().duration(200).style("opacity", 1);
        linkG
          .transition()
          .duration(200)
          .style("opacity", 1)
          .attr("stroke-width", (d) =>
            Math.max(1, Math.sqrt(d.percentage) * 0.8),
          );

        d3.select(this).select(".halo").attr("stroke-opacity", 0);
        tooltip.style("display", "none");
      })
      .on("click", (_, d) => {
        onNodeClick?.({
          id: d.id,
          label: d.label,
          type: d.type,
          investorType: d.investorType,
          localForeign: d.localForeign,
          size: d.size,
        });
      });

    // Tick
    simulation.on("tick", () => {
      linkG.attr("d", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      nodeG.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Zoom to fit
    const padding = 60;
    simulation.on("end", () => {
      const xs = nodes.map((n) => n.x ?? 0);
      const ys = nodes.map((n) => n.y ?? 0);
      const x0 = Math.min(...xs) - padding;
      const y0 = Math.min(...ys) - padding;
      const x1 = Math.max(...xs) + padding;
      const y1 = Math.max(...ys) + padding;
      const bw = x1 - x0;
      const bh = y1 - y0;
      if (bw > 0 && bh > 0) {
        const scale = Math.min(width / bw, height / bh, 1.5);
        const tx = (width - bw * scale) / 2 - x0 * scale;
        const ty = (height - bh * scale) / 2 - y0 * scale;
        svg
          .transition()
          .duration(600)
          .call(
            zoom.transform,
            d3.zoomIdentity.translate(tx, ty).scale(scale),
          );
      }
    });

    return () => simulation.stop();
  }, [data, width, height, onNodeClick]);

  useEffect(() => {
    drawGraph();
    return () => {
      if (simRef.current) simRef.current.stop();
    };
  }, [drawGraph]);

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-t-bg rounded-lg border border-t-border overflow-hidden"
      style={{ height: "calc(100vh - 10rem)" }}
    >
      <svg ref={svgRef} width={width || "100%"} height={height || "100%"} />
      {data.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto text-t-text-muted/40"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="font-mono text-sm text-t-text-muted">
              No investors match the selected filters
            </p>
            <p className="font-mono text-xs text-t-text-muted/60">
              Try adjusting the investor type, origin, or lowering the minimum
              connections
            </p>
          </div>
        </div>
      )}
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute bg-t-surface border border-t-border rounded-lg shadow-xl px-3 py-2 font-mono text-[11px] text-t-text"
        style={{ display: "none" }}
      />
    </div>
  );
}
