import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { IdxCommissioner, IdxDirector, IdxPeer, IdxShareholder } from "../../types/market";

interface GraphNode extends d3.SimulationNodeDatum {
	id: string;
	type: "company" | "peer" | "person";
	role?: "director" | "commissioner" | "shareholder";
	label: string;
	fullName: string;
	kode?: string;
	sharedCount?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
	value?: number;
}

const ROLE_COLORS: Record<string, string> = {
	director: "#60a5fa",
	commissioner: "#f59e0b",
	shareholder: "#22c55e",
	person: "#a78bfa",
};

export function InsiderNetworkGraph({
	kode,
	companyName,
	directors,
	commissioners,
	shareholders,
	peers,
}: {
	kode: string;
	companyName: string;
	directors: IdxDirector[];
	commissioners: IdxCommissioner[];
	shareholders: IdxShareholder[];
	peers: IdxPeer[];
}) {
	const svgRef = useRef<SVGSVGElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();
	const navigateRef = useRef(navigate);
	navigateRef.current = navigate;

	const [tooltip, setTooltip] = useState<{
		x: number;
		y: number;
		lines: string[];
		color: string;
	} | null>(null);

	const peersWithNames = useMemo(
		() => peers.filter((p) => p.names && p.names.length > 0),
		[peers],
	);

	useEffect(() => {
		const svg = svgRef.current;
		const container = containerRef.current;
		if (!svg || !container || peersWithNames.length === 0) return;

		const W = container.clientWidth || 800;
		const H = 540;

		// Role lookup sets
		const directorSet = new Set(directors.map((d) => d.insider_name));
		const commissionerSet = new Set(commissioners.map((c) => c.insider_name));
		const shareholderSet = new Set(shareholders.map((s) => s.insider_name));

		const topPeers = [...peersWithNames]
			.sort((a, b) => b.shared_insiders - a.shared_insiders)
			.slice(0, 20);

		// Count how many companies each person bridges
		const personBridgeCount: Record<string, number> = {};
		for (const peer of topPeers) {
			for (const name of peer.names) {
				personBridgeCount[name] = (personBridgeCount[name] ?? 0) + 1;
			}
		}

		const nodes: GraphNode[] = [];
		const links: GraphLink[] = [];
		const nodeMap = new Map<string, GraphNode>();
		const linkSet = new Set<string>();

		// Center company — pinned
		const center: GraphNode = {
			id: kode,
			type: "company",
			label: kode,
			fullName: companyName,
			kode,
			fx: W / 2,
			fy: H / 2,
		};
		nodes.push(center);
		nodeMap.set(kode, center);

		for (const peer of topPeers) {
			if (!nodeMap.has(peer.kode_emiten)) {
				const peerNode: GraphNode = {
					id: peer.kode_emiten,
					type: "peer",
					label: peer.kode_emiten,
					fullName: peer.company_name,
					kode: peer.kode_emiten,
				};
				nodes.push(peerNode);
				nodeMap.set(peer.kode_emiten, peerNode);
			}

			for (const name of peer.names) {
				if (!nodeMap.has(name)) {
					const role = directorSet.has(name)
						? "director"
						: commissionerSet.has(name)
							? "commissioner"
							: shareholderSet.has(name)
								? "shareholder"
								: "person";
					const personNode: GraphNode = {
						id: name,
						type: "person",
						role: role as GraphNode["role"],
						label: name.split(" ")[0] ?? name,
						fullName: name,
						sharedCount: personBridgeCount[name] ?? 1,
					};
					nodes.push(personNode);
					nodeMap.set(name, personNode);
				}

				// center → person
				const cpKey = `${kode}::${name}`;
				if (!linkSet.has(cpKey)) {
					links.push({ source: kode, target: name });
					linkSet.add(cpKey);
				}
				// person → peer
				const ppKey = `${name}::${peer.kode_emiten}`;
				if (!linkSet.has(ppKey)) {
					links.push({ source: name, target: peer.kode_emiten });
					linkSet.add(ppKey);
				}
			}
		}

		// --- D3 setup ---
		const sel = d3.select(svg);
		sel.selectAll("*").remove();
		sel.attr("viewBox", `0 0 ${W} ${H}`);

		// Glow filter
		const defs = sel.append("defs");
		const glow = defs
			.append("filter")
			.attr("id", "glow")
			.attr("x", "-50%")
			.attr("y", "-50%")
			.attr("width", "200%")
			.attr("height", "200%");
		glow
			.append("feGaussianBlur")
			.attr("stdDeviation", "4")
			.attr("result", "coloredBlur");
		const feMerge = glow.append("feMerge");
		feMerge.append("feMergeNode").attr("in", "coloredBlur");
		feMerge.append("feMergeNode").attr("in", "SourceGraphic");

		// Arrow marker
		defs
			.append("marker")
			.attr("id", "arrow")
			.attr("viewBox", "0 -4 8 8")
			.attr("refX", 18)
			.attr("refY", 0)
			.attr("markerWidth", 6)
			.attr("markerHeight", 6)
			.attr("orient", "auto")
			.append("path")
			.attr("d", "M0,-4L8,0L0,4")
			.attr("fill", "#ffffff18");

		// Root group (for zoom/pan)
		const g = sel.append("g").attr("class", "root");

		const zoom = d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.25, 4])
			.on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
				g.attr("transform", event.transform.toString());
			});
		sel.call(zoom);

		// Simulation
		const simulation = d3
			.forceSimulation<GraphNode>(nodes)
			.force(
				"link",
				d3
					.forceLink<GraphNode, GraphLink>(links)
					.id((d) => d.id)
					.distance((d) => {
						const s = d.source as GraphNode;
						const t = d.target as GraphNode;
						if (s.type === "company" || t.type === "company") return 90;
						return 70;
					})
					.strength(0.6),
			)
			.force("charge", d3.forceManyBody<GraphNode>().strength(-220))
			.force("center", d3.forceCenter(W / 2, H / 2))
			.force(
				"collide",
				d3.forceCollide<GraphNode>().radius((d) => {
					if (d.type === "company") return 32;
					if (d.type === "peer") return 24;
					return 18 + (d.sharedCount ?? 1) * 1.5;
				}),
			)
			.alpha(1)
			.alphaDecay(0.025);

		// Links
		const linkSel = g
			.append("g")
			.attr("class", "links")
			.selectAll<SVGLineElement, GraphLink>("line")
			.data(links)
			.join("line")
			.attr("stroke", "#ffffff18")
			.attr("stroke-width", 1);

		// Drag
		const drag = d3
			.drag<SVGGElement, GraphNode>()
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
				if (d.type !== "company") {
					d.fx = null;
					d.fy = null;
				}
			});

		// Node groups
		const nodeSel = g
			.append("g")
			.attr("class", "nodes")
			.selectAll<SVGGElement, GraphNode>("g")
			.data(nodes)
			.join("g")
			.attr("cursor", (d) => (d.type === "peer" ? "pointer" : "default"))
			.on("click", (_event, d) => {
				if (d.type === "peer" && d.kode) {
					navigateRef.current(`/idx/${d.kode}`);
				}
			})
			.on("mouseover", (event: MouseEvent, d) => {
				const connected = new Set<string>([d.id]);
				links.forEach((l) => {
					const s = (l.source as GraphNode).id;
					const t = (l.target as GraphNode).id;
					if (s === d.id) connected.add(t);
					if (t === d.id) connected.add(s);
				});

				nodeSel.each(function (nd) {
					d3.select(this)
						.select("circle")
						.attr("opacity", connected.has(nd.id) ? 1 : 0.12);
					d3.select(this)
						.select("text")
						.attr("opacity", connected.has(nd.id) ? 1 : 0.08);
				});

				linkSel
					.attr("stroke", (l) => {
						const s = (l.source as GraphNode).id;
						const t = (l.target as GraphNode).id;
						return s === d.id || t === d.id ? "#ffffff60" : "#ffffff08";
					})
					.attr("stroke-width", (l) => {
						const s = (l.source as GraphNode).id;
						const t = (l.target as GraphNode).id;
						return s === d.id || t === d.id ? 1.5 : 0.5;
					});

				// Tooltip
				const rect = container.getBoundingClientRect();
				const mx = event.clientX - rect.left;
				const my = event.clientY - rect.top;

				const lines: string[] = [d.fullName];
				if (d.type === "peer") {
					lines.push(`${(topPeers.find((p) => p.kode_emiten === d.id)?.shared_insiders ?? 0)} shared insiders`);
					lines.push("Click to open profile");
				} else if (d.type === "person" && d.role) {
					lines.push(d.role.charAt(0).toUpperCase() + d.role.slice(1));
					if ((d.sharedCount ?? 0) > 1) {
						lines.push(`Bridges ${d.sharedCount} companies`);
					}
				}

				const color =
					d.type === "company"
						? "#f59e0b"
						: d.type === "peer"
							? "#60a5fa"
							: ROLE_COLORS[d.role ?? "person"] ?? "#a78bfa";

				setTooltip({ x: mx, y: my, lines, color });
			})
			.on("mouseout", () => {
				nodeSel.each(function () {
					d3.select(this).select("circle").attr("opacity", 1);
					d3.select(this).select("text").attr("opacity", 1);
				});
				linkSel.attr("stroke", "#ffffff18").attr("stroke-width", 1);
				setTooltip(null);
			})
			.call(drag);

		// Circle — company
		nodeSel
			.filter((d) => d.type === "company")
			.append("circle")
			.attr("r", 22)
			.attr("fill", "#f59e0b")
			.attr("filter", "url(#glow)")
			.attr("stroke", "#fbbf24")
			.attr("stroke-width", 2);

		// Circle — peer
		nodeSel
			.filter((d) => d.type === "peer")
			.append("circle")
			.attr("r", 14)
			.attr("fill", "#1d4ed8")
			.attr("fill-opacity", 0.9)
			.attr("stroke", "#3b82f6")
			.attr("stroke-width", 1.5);

		// Circle — person
		nodeSel
			.filter((d) => d.type === "person")
			.append("circle")
			.attr("r", (d) => Math.min(10, 5 + (d.sharedCount ?? 1) * 1.5))
			.attr("fill", (d) => ROLE_COLORS[d.role ?? "person"])
			.attr("fill-opacity", 0.75)
			.attr("stroke", (d) => ROLE_COLORS[d.role ?? "person"])
			.attr("stroke-width", 0.5)
			.attr("stroke-opacity", 0.6);

		// Labels — company
		nodeSel
			.filter((d) => d.type === "company")
			.append("text")
			.text((d) => d.label)
			.attr("text-anchor", "middle")
			.attr("dy", "0.35em")
			.attr("font-family", "ui-monospace, monospace")
			.attr("font-size", "11px")
			.attr("font-weight", "700")
			.attr("fill", "#1a1100")
			.attr("pointer-events", "none");

		// Labels — peer (below circle)
		nodeSel
			.filter((d) => d.type === "peer")
			.append("text")
			.text((d) => d.label)
			.attr("text-anchor", "middle")
			.attr("dy", "0.35em")
			.attr("font-family", "ui-monospace, monospace")
			.attr("font-size", "9px")
			.attr("font-weight", "600")
			.attr("fill", "#bfdbfe")
			.attr("pointer-events", "none");

		// Labels — person (name above circle)
		nodeSel
			.filter((d) => d.type === "person")
			.append("text")
			.text((d) => d.label)
			.attr("text-anchor", "middle")
			.attr("dy", (d) => -(Math.min(10, 5 + (d.sharedCount ?? 1) * 1.5) + 4))
			.attr("font-family", "ui-monospace, monospace")
			.attr("font-size", "8px")
			.attr("fill", (d) => ROLE_COLORS[d.role ?? "person"])
			.attr("fill-opacity", 0.7)
			.attr("pointer-events", "none");

		// Tick
		simulation.on("tick", () => {
			linkSel
				.attr("x1", (d) => (d.source as GraphNode).x ?? 0)
				.attr("y1", (d) => (d.source as GraphNode).y ?? 0)
				.attr("x2", (d) => (d.target as GraphNode).x ?? 0)
				.attr("y2", (d) => (d.target as GraphNode).y ?? 0);

			nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
		});

		return () => {
			simulation.stop();
		};
	}, [kode, companyName, directors, commissioners, shareholders, peersWithNames]);

	if (peersWithNames.length === 0) return null;

	const totalNodes =
		peersWithNames.slice(0, 20).reduce((acc, p) => acc + p.names.length, 0) +
		peersWithNames.slice(0, 20).length +
		1;

	return (
		<div className="rounded border border-t-border bg-t-surface">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-t-border px-3 py-2">
				<div>
					<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
						Insider Network
					</h3>
					<p className="mt-0.5 font-mono text-[10px] text-t-text-muted">
						{peersWithNames.slice(0, 20).length} peer companies · ~{totalNodes} nodes · scroll
						to zoom, drag to pan
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-t-text-muted">
					<span className="flex items-center gap-1.5">
						<span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
						<span>Current / Commissioner</span>
					</span>
					<span className="flex items-center gap-1.5">
						<span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
						<span>Peer / Director</span>
					</span>
					<span className="flex items-center gap-1.5">
						<span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
						<span>Shareholder</span>
					</span>
				</div>
			</div>

			<div ref={containerRef} className="relative h-[540px] w-full overflow-hidden">
				<svg
					ref={svgRef}
					className="h-full w-full"
					style={{ background: "transparent" }}
				/>
				{tooltip && (
					<div
						className="pointer-events-none absolute z-10 max-w-[200px] rounded border border-white/10 bg-[#0d0d0d]/95 px-2.5 py-1.5 shadow-xl backdrop-blur-sm"
						style={{
							left: Math.min(tooltip.x + 14, containerRef.current ? containerRef.current.clientWidth - 210 : tooltip.x + 14),
							top: Math.max(tooltip.y - 10, 4),
						}}
					>
						{tooltip.lines.map((line, i) => (
							<p
								key={i}
								className="font-mono leading-snug"
								style={{
									fontSize: i === 0 ? "11px" : "10px",
									color: i === 0 ? tooltip.color : "#6b7280",
									fontWeight: i === 0 ? 600 : 400,
								}}
							>
								{line}
							</p>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
