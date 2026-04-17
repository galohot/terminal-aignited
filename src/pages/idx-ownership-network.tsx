import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { INVESTOR_TYPE_COLORS, INVESTOR_TYPE_LABELS } from "../components/ownership/constants";
import { NetworkGraph } from "../components/ownership/ownership-network-graph";
import type { GraphNode, InvestorType } from "../components/ownership/types";
import { IdxNav } from "../components/idx/idx-nav";
import { OwnershipNav } from "../components/ownership/ownership-nav";
import { Skeleton } from "../components/ui/loading";
import { useKseiGraph } from "../hooks/use-ksei";
import { usePageTitle } from "../hooks/use-page-title";

export function IdxOwnershipNetworkPage() {
	usePageTitle("Ownership Network");
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();

	const initialMin = Number.parseInt(searchParams.get("min") ?? "20", 10);
	const initialTypes = searchParams.get("types") ?? "";
	const initialLf = searchParams.get("lf") ?? "";

	const [minConnections, setMinConnections] = useState(initialMin);
	const [selectedTypes, setSelectedTypes] = useState<string[]>(
		initialTypes ? initialTypes.split(",") : [],
	);
	const [selectedLf, setSelectedLf] = useState<string[]>(
		initialLf ? initialLf.split(",") : [],
	);

	const graphParams = useMemo(
		() => ({
			min: minConnections,
			types: selectedTypes.length > 0 ? selectedTypes.join(",") : undefined,
			lf: selectedLf.length > 0 ? selectedLf.join(",") : undefined,
		}),
		[minConnections, selectedTypes, selectedLf],
	);

	const graph = useKseiGraph(graphParams);

	const handleMinChange = useCallback(
		(val: number) => {
			setMinConnections(val);
			const params: Record<string, string> = { min: String(val) };
			if (selectedTypes.length) params.types = selectedTypes.join(",");
			if (selectedLf.length) params.lf = selectedLf.join(",");
			setSearchParams(params, { replace: true });
		},
		[selectedTypes, selectedLf, setSearchParams],
	);

	const handleTypeToggle = useCallback(
		(type: string) => {
			setSelectedTypes((prev) => {
				const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
				const params: Record<string, string> = { min: String(minConnections) };
				if (next.length) params.types = next.join(",");
				if (selectedLf.length) params.lf = selectedLf.join(",");
				setSearchParams(params, { replace: true });
				return next;
			});
		},
		[minConnections, selectedLf, setSearchParams],
	);

	const handleLfToggle = useCallback(
		(lf: string) => {
			setSelectedLf((prev) => {
				const next = prev.includes(lf) ? prev.filter((l) => l !== lf) : [...prev, lf];
				const params: Record<string, string> = { min: String(minConnections) };
				if (selectedTypes.length) params.types = selectedTypes.join(",");
				if (next.length) params.lf = next.join(",");
				setSearchParams(params, { replace: true });
				return next;
			});
		},
		[minConnections, selectedTypes, setSearchParams],
	);

	const handleNodeClick = useCallback(
		(node: GraphNode) => {
			if (node.type === "company") {
				const code = node.id.replace("co:", "");
				navigate(`/idx/${code}`);
			} else if (node.type === "investor") {
				const name = node.id.replace("inv:", "");
				navigate(`/idx/ownership/investor/${encodeURIComponent(name)}`);
			}
		},
		[navigate],
	);

	const nodeCount = graph.data?.nodes.length ?? 0;
	const linkCount = graph.data?.links.length ?? 0;

	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<IdxNav />
			<OwnershipNav />

			<div className="mb-4">
				<h1 className="font-mono text-lg font-semibold tracking-wide text-white">
					Ownership Network
				</h1>
				<p className="mt-1 text-sm text-t-text-secondary">
					Force-directed graph of multi-company shareholders across the entire IDX.
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
				{/* Controls */}
				<div className="space-y-4">
					{/* Min connections slider */}
					<div className="rounded-lg border border-t-border bg-t-surface p-3">
						<label className="block">
							<span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
								Min connections: {minConnections}
							</span>
							<input
								type="range"
								min={2}
								max={20}
								value={minConnections}
								onChange={(e) => handleMinChange(Number(e.target.value))}
								className="w-full accent-t-amber"
							/>
							<div className="flex justify-between font-mono text-[9px] text-t-text-muted mt-1">
								<span>2</span>
								<span>20</span>
							</div>
						</label>
					</div>

					{/* Type filters */}
					<div className="rounded-lg border border-t-border bg-t-surface p-3">
						<span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
							Investor Type
						</span>
						<div className="space-y-1">
							{graph.data?.availableTypeCounts &&
								Object.entries(graph.data.availableTypeCounts)
									.sort(([, a], [, b]) => (b as number) - (a as number))
									.map(([type, count]) => (
										<label key={type} className="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												checked={selectedTypes.length === 0 || selectedTypes.includes(type)}
												onChange={() => handleTypeToggle(type)}
												className="accent-t-amber"
											/>
											<span
												className="h-2 w-2 rounded-full"
												style={{ backgroundColor: INVESTOR_TYPE_COLORS[type as InvestorType] }}
											/>
											<span className="font-mono text-[11px] text-t-text-secondary flex-1">
												{INVESTOR_TYPE_LABELS[type as InvestorType] || type}
											</span>
											<span className="font-mono text-[10px] text-t-text-muted">{count as number}</span>
										</label>
									))}
						</div>
					</div>

					{/* L/F filter */}
					<div className="rounded-lg border border-t-border bg-t-surface p-3">
						<span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
							Origin
						</span>
						<div className="space-y-1">
							{graph.data?.availableLFCounts &&
								Object.entries(graph.data.availableLFCounts)
									.filter(([k]) => k === "L" || k === "A")
									.map(([lf, count]) => (
										<label key={lf} className="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												checked={selectedLf.length === 0 || selectedLf.includes(lf)}
												onChange={() => handleLfToggle(lf)}
												className="accent-t-amber"
											/>
											<span className="font-mono text-[11px] text-t-text-secondary flex-1">
												{lf === "L" ? "Local" : "Foreign"}
											</span>
											<span className="font-mono text-[10px] text-t-text-muted">{count as number}</span>
										</label>
									))}
						</div>
					</div>

					{/* Stats */}
					<div className="rounded-lg border border-t-border bg-t-surface p-3">
						<span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
							Graph Stats
						</span>
						<div className="space-y-1 font-mono text-xs text-t-text-secondary">
							<div className="flex justify-between">
								<span>Nodes</span>
								<span className="text-t-text tabular-nums">{nodeCount}</span>
							</div>
							<div className="flex justify-between">
								<span>Links</span>
								<span className="text-t-text tabular-nums">{linkCount}</span>
							</div>
						</div>
					</div>
				</div>

				{/* Graph */}
				<div className="rounded-lg border border-t-border bg-t-surface min-h-[500px]">
					{graph.isLoading ? (
						<Skeleton className="h-[500px] w-full" />
					) : graph.error ? (
						<div className="flex h-[500px] items-center justify-center text-sm text-t-text-muted">
							Failed to load network graph.
						</div>
					) : graph.data ? (
						<NetworkGraph data={graph.data} onNodeClick={handleNodeClick} />
					) : null}
				</div>
			</div>
		</div>
	);
}
