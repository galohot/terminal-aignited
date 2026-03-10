import { clsx } from "clsx";
import { useState } from "react";
import { Link } from "react-router";
import { Skeleton } from "../components/ui/loading";
import {
	useIdxEntityGroupHoldings,
	useIdxEntityGroups,
	useIdxTopConnectors,
} from "../hooks/use-idx-entities";

type Tab = "groups" | "connectors";
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
	const [tab, setTab] = useState<Tab>("groups");

	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<div className="mb-4">
				<h1 className="font-mono text-lg font-semibold tracking-wide text-white">IDX Power Map</h1>
				<p className="mt-1 text-sm text-t-text-secondary">
					State ownership groups and most connected insiders across IDX.
				</p>
			</div>

			<div className="mb-4 flex gap-2">
				<TabButton active={tab === "groups"} onClick={() => setTab("groups")}>
					Entity Groups
				</TabButton>
				<TabButton active={tab === "connectors"} onClick={() => setTab("connectors")}>
					Connectors
				</TabButton>
			</div>

			{tab === "groups" ? <EntityGroupsTab /> : <ConnectorsTab />}
		</div>
	);
}

function EntityGroupsTab() {
	const [selectedGroup, setSelectedGroup] = useState("");
	const groups = useIdxEntityGroups();
	const holdings = useIdxEntityGroupHoldings(selectedGroup);

	// Auto-select first group when data loads
	if (groups.data?.entity_groups.length && !selectedGroup) {
		setSelectedGroup(groups.data.entity_groups[0].entity_group);
	}

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

			{/* Holdings table */}
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
						<div className="border-b border-t-border px-3 py-2">
							<h3 className="text-xs font-medium text-t-text-secondary">
								<span className="uppercase tracking-wider">{formatGroupName(selectedGroup)}</span>
								<span className="ml-2 font-mono text-[11px] text-t-text-muted">
									{holdings.data?.total_companies} companies
								</span>
							</h3>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-xs">
								<thead>
									<tr className="border-b border-white/10 bg-white/[0.02]">
										<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
											Code
										</th>
										<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
											Company
										</th>
										<th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
											Stake %
										</th>
										<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
											Via
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/5">
									{holdings.data?.holdings.map((h) => (
										<tr key={h.kode_emiten} className="transition-colors hover:bg-white/[0.04]">
											<td className="whitespace-nowrap px-3 py-2">
												<Link
													to={`/idx/${h.kode_emiten}`}
													className="font-mono text-xs font-medium text-t-green transition-colors hover:text-t-amber hover:underline"
												>
													{h.kode_emiten}
												</Link>
											</td>
											<td className="max-w-[250px] truncate px-3 py-2 text-t-text-secondary">
												{h.company_name}
											</td>
											<td className="whitespace-nowrap px-3 py-2 text-right font-mono font-medium text-t-amber">
												{h.total_percentage != null ? `${h.total_percentage.toFixed(2)}%` : "—"}
											</td>
											<td className="px-3 py-2 text-t-text-muted">
												{h.via_entities.join(", ") || "—"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
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
				<div className="overflow-x-auto rounded-lg border border-t-border">
					<table className="w-full text-xs">
						<thead>
							<tr className="border-b border-white/10 bg-white/[0.02]">
								<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
									Name
								</th>
								<th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
									Companies
								</th>
								<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
									Roles
								</th>
								<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
									Group
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
							{connectors.data.connectors.map((c) => (
								<tr key={c.name} className="transition-colors hover:bg-white/[0.04]">
									<td className="whitespace-nowrap px-3 py-2">
										<Link
											to={`/idx/insiders?name=${encodeURIComponent(c.name)}`}
											className="text-xs text-t-text transition-colors hover:text-t-amber hover:underline"
										>
											{c.name}
										</Link>
									</td>
									<td className="whitespace-nowrap px-3 py-2 text-right font-mono font-medium text-t-green">
										{c.companies}
									</td>
									<td className="px-3 py-2">
										<div className="flex flex-wrap gap-1">
											{c.types.map((t) => (
												<span
													key={t}
													className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-t-text-muted"
												>
													{t}
												</span>
											))}
										</div>
									</td>
									<td className="whitespace-nowrap px-3 py-2">
										{c.entity_group ? (
											<span className="rounded-full border border-t-amber/30 bg-t-amber/10 px-2 py-0.5 font-mono text-[10px] text-t-amber">
												{formatGroupName(c.entity_group)}
											</span>
										) : (
											<span className="text-t-text-muted">—</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
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
