import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChartContainer } from "../components/ownership/chart-container";
import { ChordDiagram } from "../components/ownership/chord-diagram";
import { ConcentrationBars } from "../components/ownership/concentration-bars";
import { INVESTOR_TYPE_COLORS, INVESTOR_TYPE_LABELS } from "../components/ownership/constants";
import { Heatmap } from "../components/ownership/heatmap";
import { LocalForeignDonut } from "../components/ownership/local-foreign-donut";
import { Badge } from "../components/ownership/ownership-badge";
import { RecordsTable, type ShareholderRecord } from "../components/ownership/ownership-records-table";
import { StatCard } from "../components/ownership/ownership-stat-card";
import { TypeDistributionBar } from "../components/ownership/type-distribution-bar";
import type { InvestorType, TypeDistributionItem, LocalForeignSplit } from "../components/ownership/types";
import { IdxNav } from "../components/idx/idx-nav";
import { OwnershipNav } from "../components/ownership/ownership-nav";
import { Skeleton } from "../components/ui/loading";
import {
	useKseiChord,
	useKseiConcentration,
	useKseiHeatmap,
	useKseiLocalForeign,
	useKseiRecords,
	useKseiStats,
	useKseiTypeDistribution,
} from "../hooks/use-ksei";
import { usePageTitle } from "../hooks/use-page-title";
import type { KseiTypeDistItem, KseiLfSplit, KseiShareholderRecord } from "../types/market";

function fmtNum(n: number): string {
	return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Map API snake_case to component camelCase */
function toTypeDistItems(data: KseiTypeDistItem[]): TypeDistributionItem[] {
	return data.map((d) => ({
		type: d.investor_type as InvestorType,
		label: INVESTOR_TYPE_LABELS[d.investor_type as InvestorType] || d.investor_type,
		color: INVESTOR_TYPE_COLORS[d.investor_type as InvestorType] || "#72857e",
		count: d.count,
		totalPct: d.total_pct,
		avgPct: d.avg_pct,
	}));
}

function toRecords(data: KseiShareholderRecord[]): ShareholderRecord[] {
	return data.map((r) => ({
		SHARE_CODE: r.kode_emiten,
		ISSUER_NAME: r.issuer_name,
		INVESTOR_NAME: r.investor_name,
		INVESTOR_TYPE: r.investor_type as InvestorType,
		LOCAL_FOREIGN: r.local_foreign as "L" | "A" | "",
		DOMICILE: r.domicile,
		NATIONALITY: r.nationality,
		TOTAL_HOLDING_SHARES: r.total_shares,
		PERCENTAGE: r.percentage,
	}));
}

function toLfSplit(data: KseiLfSplit): LocalForeignSplit {
	return {
		local: { count: data.local.count, totalPct: data.local.total_pct },
		foreign: { count: data.foreign.count, totalPct: data.foreign.total_pct },
	};
}

export function IdxOwnershipPage() {
	usePageTitle("Ownership Analytics");
	const navigate = useNavigate();

	const stats = useKseiStats();
	const typeDist = useKseiTypeDistribution();
	const lfSplit = useKseiLocalForeign();
	const concentration = useKseiConcentration();
	const chord = useKseiChord();
	const heatmap = useKseiHeatmap(40);

	const [recordsPage, setRecordsPage] = useState(1);
	const [recordsSort, setRecordsSort] = useState("percentage");
	const [recordsOrder, setRecordsOrder] = useState("desc");
	const records = useKseiRecords({ page: recordsPage, per_page: 50, sort: recordsSort, order: recordsOrder });

	const handleChordArcClick = useCallback(
		(index: number) => {
			if (chord.data) {
				const typeKey = chord.data.keys[index];
				if (typeKey) navigate(`/idx/ownership/network?types=${typeKey}`);
			}
		},
		[chord.data, navigate],
	);

	const handleChordRibbonClick = useCallback(
		(sourceIndex: number, targetIndex: number) => {
			if (chord.data) {
				const types = [chord.data.keys[sourceIndex], chord.data.keys[targetIndex]].filter(Boolean);
				if (types.length) navigate(`/idx/ownership/network?types=${types.join(",")}`);
			}
		},
		[chord.data, navigate],
	);

	const maxConnectorCount = stats.data?.top_connectors[0]?.companies ?? 1;

	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<IdxNav />
			<OwnershipNav />

			{/* Header */}
			<div className="mb-6">
				<div className="flex items-center gap-3 mb-2">
					<span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-t-amber">
						KSEI Registry
					</span>
					<span className="h-px flex-1 max-w-[60px] bg-t-amber/20" />
				</div>
				<h1 className="font-mono text-2xl font-semibold tracking-wide text-white">
					Ownership Analytics
				</h1>
				<p className="mt-1 text-sm text-t-text-secondary">
					Cross-ownership intelligence across{" "}
					<Link to="/idx/ownership/companies" className="font-semibold text-t-text hover:text-t-amber hover:underline">{fmtNum(stats.data?.total_companies ?? 0)}</Link>{" "}
					listed companies and{" "}
					<Link to="/idx/ownership/investors" className="font-semibold text-t-text hover:text-t-amber hover:underline">{fmtNum(stats.data?.total_investors ?? 0)}</Link>{" "}
					institutional & individual investors.
				</p>
				<div className="mt-2 flex items-center gap-4">
					<span className="inline-flex items-center gap-2 font-mono text-[11px] text-t-text-muted border border-t-border rounded-full px-3 py-1">
						<span className="relative flex h-2 w-2">
							<span className="absolute inline-flex h-full w-full rounded-full bg-t-green opacity-75 animate-ping" />
							<span className="relative inline-flex h-2 w-2 rounded-full bg-t-green" />
						</span>
						Snapshot 27 Feb 2026
					</span>
					<span className="font-mono text-[11px] text-t-text-muted">
						Source: PT Kustodian Sentral Efek Indonesia
					</span>
				</div>
			</div>

			{/* Stats */}
			{stats.isLoading ? (
				<Skeleton className="h-[100px] w-full rounded-xl" />
			) : stats.data ? (
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					<StatCard label="Companies" value={stats.data.total_companies} />
					<StatCard label="Investors" value={stats.data.total_investors} color="#3ddc91" />
					<StatCard
						label="Multi-Co. Investors"
						value={stats.data.multi_company_investors}
						color="#ffbf47"
						subtitle={`${((stats.data.multi_company_investors / stats.data.total_investors) * 100).toFixed(1)}% of all`}
					/>
					<StatCard
						label="Total Records"
						value={stats.data.total_records}
						color="#8b7bff"
						subtitle={`avg ${stats.data.avg_per_company} per company`}
					/>
				</div>
			) : null}

			{/* Market Structure */}
			<div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-t-text-muted">
				Market Structure
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
				<div className="lg:col-span-5">
					<ChartContainer title="Investor Type Distribution" subtitle="Holdings count by category">
						{typeDist.isLoading ? (
							<Skeleton className="h-[200px] w-full" />
						) : typeDist.data ? (
							<TypeDistributionBar data={toTypeDistItems(typeDist.data)} />
						) : null}
					</ChartContainer>
				</div>
				<div className="lg:col-span-3">
					<ChartContainer title="Local vs Foreign" subtitle="Ownership balance">
						{lfSplit.isLoading ? (
							<Skeleton className="h-[200px] w-full" />
						) : lfSplit.data ? (
							<LocalForeignDonut data={toLfSplit(lfSplit.data)} />
						) : null}
					</ChartContainer>
				</div>
				<div className="lg:col-span-4">
					<ChartContainer title="Ownership Concentration" subtitle="Companies by total insider %">
						{concentration.isLoading ? (
							<Skeleton className="h-[200px] w-full" />
						) : concentration.data ? (
							<ConcentrationBars data={concentration.data} />
						) : null}
					</ChartContainer>
				</div>
			</div>

			{/* Network Intelligence */}
			<div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-t-text-muted">
				Network Intelligence
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
				{/* Top Connectors */}
				<div className="lg:col-span-7">
					<div className="rounded-lg border border-t-border bg-t-surface p-4">
						<div className="flex items-start justify-between mb-3">
							<div>
								<h3 className="font-mono text-[13px] font-semibold tracking-tight text-t-text">Top Connectors</h3>
								<p className="text-[11px] text-t-text-muted mt-0.5">Investors with the most cross-company holdings</p>
							</div>
							<span className="font-mono text-[10px] text-t-text-muted">Top 10</span>
						</div>
						{stats.isLoading ? (
							<Skeleton className="h-[300px] w-full" />
						) : stats.data ? (
							<div className="space-y-0.5">
								{stats.data.top_connectors.slice(0, 10).map((c, i) => {
									const barWidth = (c.companies / maxConnectorCount) * 100;
									const color = INVESTOR_TYPE_COLORS[c.investor_type as InvestorType] || "#72857e";
									return (
										<Link
											key={c.name}
											to={`/idx/ownership/investor/${encodeURIComponent(c.name)}`}
											className="relative flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
										>
											<div
												className="absolute inset-0 rounded-md opacity-[0.06]"
												style={{ width: `${barWidth}%`, backgroundColor: color }}
											/>
											<span
												className="relative z-10 flex h-5 w-5 items-center justify-center rounded font-mono text-[10px] font-bold"
												style={{
													backgroundColor: i < 3 ? `${color}20` : "transparent",
													color: i < 3 ? color : "#72857e",
												}}
											>
												{i + 1}
											</span>
											<div className="relative z-10 min-w-0 flex-1">
												<p className="truncate font-mono text-xs font-medium text-t-text">{c.name}</p>
												<div className="flex items-center gap-2 mt-0.5">
													<Badge type={c.investor_type as InvestorType} />
													<span className="font-mono text-[10px] tabular-nums text-t-text-muted">
														{c.companies} cos
													</span>
												</div>
											</div>
										</Link>
									);
								})}
							</div>
						) : null}
					</div>
				</div>

				{/* Chord Diagram */}
				<div className="lg:col-span-5">
					<ChartContainer title="Co-Investment Network" subtitle="Click a type or ribbon to explore">
						{chord.isLoading ? (
							<Skeleton className="h-[300px] w-full" />
						) : chord.data ? (
							<ChordDiagram
								data={chord.data}
								onArcClick={handleChordArcClick}
								onRibbonClick={handleChordRibbonClick}
							/>
						) : null}
					</ChartContainer>
				</div>
			</div>

			{/* Heatmap */}
			<div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-t-text-muted">
				Deep Analysis
			</div>
			<div className="mb-8">
				<ChartContainer
					title="Ownership Heatmap"
					subtitle="Top 40 multi-company investors × top 40 companies — hover to inspect"
				>
					{heatmap.isLoading ? (
						<Skeleton className="h-[400px] w-full" />
					) : heatmap.data ? (
						<Heatmap data={heatmap.data} />
					) : null}
				</ChartContainer>
			</div>

			{/* Records Table */}
			<div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-t-text-muted">
				Holdings Data
			</div>
			{records.isLoading ? (
				<Skeleton className="h-[400px] w-full rounded-xl" />
			) : records.data ? (
				<RecordsTable records={toRecords(records.data.records)} />
			) : null}
		</div>
	);
}
