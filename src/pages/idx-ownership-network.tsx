import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { IdxNav } from "../components/idx/idx-nav";
import { INVESTOR_TYPE_COLORS, INVESTOR_TYPE_LABELS } from "../components/ownership/constants";
import { OwnershipNav } from "../components/ownership/ownership-nav";
import { NetworkGraph } from "../components/ownership/ownership-network-graph";
import type { GraphNode, InvestorType } from "../components/ownership/types";
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
	const [selectedLf, setSelectedLf] = useState<string[]>(initialLf ? initialLf.split(",") : []);

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

			<div className="mb-5">
				<h1
					className="text-[clamp(2rem,4vw,2.5rem)] leading-[1.05] text-ink"
					style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
				>
					Ownership <em className="text-ember-600">Network</em>
				</h1>
				<p className="mt-2 max-w-2xl text-sm text-ink-3">
					Force-directed graph of multi-company shareholders across the entire IDX.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
				<div className="space-y-4">
					<div className="rounded-[18px] border border-rule bg-card p-3">
						<label className="block">
							<span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-4">
								Min connections: {minConnections}
							</span>
							<input
								type="range"
								min={2}
								max={20}
								value={minConnections}
								onChange={(e) => handleMinChange(Number(e.target.value))}
								className="w-full accent-ember-500"
							/>
							<div className="mt-1 flex justify-between font-mono text-[9px] text-ink-4">
								<span>2</span>
								<span>20</span>
							</div>
						</label>
					</div>

					<div className="rounded-[18px] border border-rule bg-card p-3">
						<span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-4">
							Investor Type
						</span>
						<div className="space-y-1">
							{graph.data?.availableTypeCounts &&
								Object.entries(graph.data.availableTypeCounts)
									.sort(([, a], [, b]) => (b as number) - (a as number))
									.map(([type, count]) => (
										<label key={type} className="flex cursor-pointer items-center gap-2">
											<input
												type="checkbox"
												checked={selectedTypes.length === 0 || selectedTypes.includes(type)}
												onChange={() => handleTypeToggle(type)}
												className="accent-ember-500"
											/>
											<span
												className="h-2 w-2 rounded-full"
												style={{ backgroundColor: INVESTOR_TYPE_COLORS[type as InvestorType] }}
											/>
											<span className="flex-1 font-mono text-[11px] text-ink-2">
												{INVESTOR_TYPE_LABELS[type as InvestorType] || type}
											</span>
											<span className="font-mono text-[10px] text-ink-4">
												{count as number}
											</span>
										</label>
									))}
						</div>
					</div>

					<div className="rounded-[18px] border border-rule bg-card p-3">
						<span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-4">
							Origin
						</span>
						<div className="space-y-1">
							{graph.data?.availableLFCounts &&
								Object.entries(graph.data.availableLFCounts)
									.filter(([k]) => k === "L" || k === "A")
									.map(([lf, count]) => (
										<label key={lf} className="flex cursor-pointer items-center gap-2">
											<input
												type="checkbox"
												checked={selectedLf.length === 0 || selectedLf.includes(lf)}
												onChange={() => handleLfToggle(lf)}
												className="accent-ember-500"
											/>
											<span className="flex-1 font-mono text-[11px] text-ink-2">
												{lf === "L" ? "Local" : "Foreign"}
											</span>
											<span className="font-mono text-[10px] text-ink-4">
												{count as number}
											</span>
										</label>
									))}
						</div>
					</div>

					<div className="rounded-[18px] border border-rule bg-card p-3">
						<span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-4">
							Graph Stats
						</span>
						<div className="space-y-1 font-mono text-xs text-ink-2">
							<div className="flex justify-between">
								<span>Nodes</span>
								<span className="tabular-nums text-ink">{nodeCount}</span>
							</div>
							<div className="flex justify-between">
								<span>Links</span>
								<span className="tabular-nums text-ink">{linkCount}</span>
							</div>
						</div>
					</div>
				</div>

				<div className="min-h-[500px] rounded-[18px] border border-rule bg-card">
					{graph.isLoading ? (
						<Skeleton className="h-[500px] w-full" />
					) : graph.error ? (
						<div className="flex h-[500px] items-center justify-center text-sm text-ink-4">
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
