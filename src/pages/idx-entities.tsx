import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ConnectorsBar } from "../components/idx/connectors-bar";
import { HoldingsLollipop } from "../components/idx/holdings-lollipop";
import { IdxNav } from "../components/idx/idx-nav";
import { BubblePack } from "../components/ownership/bubble-pack";
import { ChartContainer } from "../components/ownership/chart-container";
import { SankeyDiagram } from "../components/ownership/sankey-diagram";
import { Skeleton } from "../components/ui/loading";
import {
	useIdxEntityGroupHoldings,
	useIdxEntityGroups,
	useIdxTopConnectors,
} from "../hooks/use-idx-entities";
import { useKseiClusters, useKseiSankey } from "../hooks/use-ksei";
import { usePageTitle } from "../hooks/use-page-title";

type Tab = "groups" | "connectors" | "flow" | "clusters";
type ConnectorType = "" | "director" | "commissioner" | "shareholder";

const GROUP_LABELS: Record<string, string> = {
	DANANTARA: "Danantara",
	STATE_FUND: "State Fund",
	PERTAMINA: "Pertamina",
	TELKOM: "Telkom",
	PLN: "PLN",
	BUMN: "BUMN",
};

function formatGroupName(raw: string): string {
	return GROUP_LABELS[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function IdxEntitiesPage() {
	usePageTitle("IDX Power Map");
	const [tab, setTab] = useState<Tab>("groups");

	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<IdxNav />
			<div className="mb-4">
				<h1 className="font-mono text-lg font-semibold tracking-wide text-white">IDX Power Map</h1>
				<p className="mt-1 text-sm text-t-text-secondary">
					State ownership groups and most connected insiders across IDX.
				</p>
			</div>

			<div className="mb-4 flex flex-wrap gap-2">
				<TabButton active={tab === "groups"} onClick={() => setTab("groups")}>
					Entity Groups
				</TabButton>
				<TabButton active={tab === "connectors"} onClick={() => setTab("connectors")}>
					Connectors
				</TabButton>
				<TabButton active={tab === "flow"} onClick={() => setTab("flow")}>
					Ownership Flow
				</TabButton>
				<TabButton active={tab === "clusters"} onClick={() => setTab("clusters")}>
					Clusters
				</TabButton>
			</div>

			{tab === "groups" && <EntityGroupsTab />}
			{tab === "connectors" && <ConnectorsTab />}
			{tab === "flow" && <OwnershipFlowTab />}
			{tab === "clusters" && <OwnershipClustersTab />}
		</div>
	);
}

function EntityGroupsTab() {
	const [selectedGroup, setSelectedGroup] = useState("");
	const groups = useIdxEntityGroups();
	const holdings = useIdxEntityGroupHoldings(selectedGroup);

	// Auto-select first group when data loads
	useEffect(() => {
		if (groups.data?.entity_groups.length && !selectedGroup) {
			setSelectedGroup(groups.data.entity_groups[0].entity_group);
		}
	}, [groups.data, selectedGroup]);

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
			{/* Group list sidebar */}
			<div className="rounded-lg border border-t-border bg-t-surface">
				<div className="border-b border-t-border px-3 py-2">
					<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
						Entity Groups
					</h3>
				</div>
				{groups.isLoading ? (
					<div className="p-3">
						<Skeleton className="h-[200px] w-full" />
					</div>
				) : groups.error ? (
					<div className="p-4 text-center text-xs text-t-text-muted">Failed to load groups.</div>
				) : (
					<div className="divide-y divide-white/5">
						{groups.data?.entity_groups.map((g) => (
							<button
								key={g.entity_group}
								type="button"
								onClick={() => setSelectedGroup(g.entity_group)}
								className={clsx(
									"flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors",
									selectedGroup === g.entity_group
										? "bg-white/[0.08] text-white"
										: "text-t-text-secondary hover:bg-white/[0.04] hover:text-white",
								)}
							>
								<span className="font-mono text-xs font-medium">
									{formatGroupName(g.entity_group)}
								</span>
								<span className="font-mono text-[11px] text-t-text-muted">{g.count} cos</span>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Holdings chart */}
			<div className="rounded-lg border border-t-border bg-t-surface">
				{!selectedGroup ? (
					<div className="p-8 text-center text-sm text-t-text-muted">
						Select a group to view holdings.
					</div>
				) : holdings.isLoading ? (
					<div className="p-3">
						<Skeleton className="h-[300px] w-full" />
					</div>
				) : holdings.error ? (
					<div className="p-8 text-center text-sm text-t-text-muted">Failed to load holdings.</div>
				) : (
					<>
						<div className="flex items-center justify-between border-b border-t-border px-3 py-2">
							<h3 className="text-xs font-medium text-t-text-secondary">
								<span className="uppercase tracking-wider">{formatGroupName(selectedGroup)}</span>
								<span className="ml-2 font-mono text-[11px] text-t-text-muted">
									{holdings.data?.total_companies} companies
								</span>
							</h3>
							{holdings.data?.holdings.length ? (
								<Link
									to={`/idx/screener?codes=${holdings.data.holdings.map((h) => h.kode_emiten).join(",")}&group=${encodeURIComponent(formatGroupName(selectedGroup))}&sort=roe&order=desc`}
									className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-t-text-secondary transition-colors hover:bg-white/10 hover:text-white"
								>
									Screen
								</Link>
							) : null}
						</div>
						<HoldingsLollipop holdings={holdings.data?.holdings ?? []} />
					</>
				)}
			</div>
		</div>
	);
}

function ConnectorsTab() {
	const [typeFilter, setTypeFilter] = useState<ConnectorType>("");
	const connectors = useIdxTopConnectors({
		limit: 50,
		type: typeFilter || undefined,
	});

	return (
		<div>
			<div className="mb-4">
				<label className="block">
					<span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
						Filter by role
					</span>
					<select
						value={typeFilter}
						onChange={(e) => setTypeFilter(e.target.value as ConnectorType)}
						className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-t-text-secondary outline-none transition-colors focus:border-t-amber/50"
					>
						<option value="">All roles</option>
						<option value="director">Directors</option>
						<option value="commissioner">Commissioners</option>
						<option value="shareholder">Shareholders</option>
					</select>
				</label>
			</div>

			{connectors.isLoading ? (
				<Skeleton className="h-[400px] w-full rounded-xl" />
			) : connectors.error ? (
				<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
					Failed to load connectors.
				</div>
			) : !connectors.data?.connectors.length ? (
				<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
					No connectors found.
				</div>
			) : (
				<ConnectorsBar connectors={connectors.data.connectors} />
			)}
		</div>
	);
}

function OwnershipFlowTab() {
	const sankey = useKseiSankey();
	return (
		<div>
			{sankey.isLoading ? (
				<Skeleton className="h-[400px] w-full rounded-xl" />
			) : sankey.error ? (
				<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
					Failed to load ownership flow.
				</div>
			) : sankey.data ? (
				<ChartContainer
					title="Ownership Flow"
					subtitle="How investor types flow into ownership concentration levels"
				>
					<SankeyDiagram data={sankey.data} />
				</ChartContainer>
			) : null}
		</div>
	);
}

function OwnershipClustersTab() {
	const clusters = useKseiClusters();
	return (
		<div>
			{clusters.isLoading ? (
				<Skeleton className="h-[400px] w-full rounded-xl" />
			) : clusters.error ? (
				<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
					Failed to load clusters.
				</div>
			) : clusters.data ? (
				<ChartContainer
					title="Company Clusters"
					subtitle="Grouped by shared institutional investors (3+ shared)"
				>
					<BubblePack data={clusters.data} />
				</ChartContainer>
			) : null}
		</div>
	);
}

function TabButton({
	active,
	children,
	onClick,
}: {
	active: boolean;
	children: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={clsx(
				"rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
				active
					? "border-white/20 bg-white text-black"
					: "border-white/10 bg-white/[0.04] text-t-text-secondary hover:bg-white/10 hover:text-white",
			)}
		>
			{children}
		</button>
	);
}
