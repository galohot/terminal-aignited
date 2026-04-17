import { clsx } from "clsx";
import { Link, useParams } from "react-router";
import { ChartContainer } from "../components/ownership/chart-container";
import { Badge } from "../components/ownership/ownership-badge";
import { Treemap } from "../components/ownership/treemap";
import type { InvestorType } from "../components/ownership/types";
import { BoardList } from "../components/idx/board-list";
import { BrokerSummaryTable } from "../components/idx/broker-summary-table";
import { CompanyHeader } from "../components/idx/company-header";
import { DisclosuresFeed } from "../components/idx/disclosures-feed";
import { ForeignFlowChart } from "../components/idx/foreign-flow-chart";
import { InsiderNetworkGraph } from "../components/idx/insider-network-graph";
import { InsiderTransactionsTable } from "../components/idx/insider-transactions-table";
import { PeerCompanies } from "../components/idx/peer-companies";
import { PeerRadarChart } from "../components/idx/peer-radar-chart";
import { RatioCard } from "../components/idx/ratio-card";
import { ShareholderTable } from "../components/idx/shareholder-table";
import { Skeleton } from "../components/ui/loading";
import { useIdxCompanyFull, useIdxFinancialSummary } from "../hooks/use-idx-company";
import { useKseiCompany, useKseiTreemap } from "../hooks/use-ksei";
import { usePageTitle } from "../hooks/use-page-title";

export function IdxCompanyPage() {
	const { kode = "" } = useParams<{ kode: string }>();
	const upperKode = kode.toUpperCase();
	usePageTitle(upperKode ? `${upperKode} — IDX Company` : "IDX Company");

	const full = useIdxCompanyFull(upperKode);
	const summary = useIdxFinancialSummary(upperKode);
	const treemap = useKseiTreemap(upperKode);
	const ksei = useKseiCompany(upperKode);

	if (full.isLoading) {
		return (
			<div className="p-4">
				<Skeleton className="mb-4 h-20 w-full" />
				<div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
					<Skeleton className="h-[400px] w-full" />
					<Skeleton className="h-[300px] w-full" />
				</div>
			</div>
		);
	}

	if (full.error || !full.data) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
				<p className="font-mono text-sm text-t-text-secondary">
					{full.error?.message.includes("404")
						? `Emiten "${upperKode}" not found`
						: "Failed to load company data"}
				</p>
				<Link
					to="/"
					className="rounded border border-t-border bg-t-surface px-3 py-1 font-mono text-xs text-t-text-secondary transition-colors hover:bg-t-hover"
				>
					Back to Dashboard
				</Link>
			</div>
		);
	}

	const { company, financials, directors, commissioners, shareholders, peer_companies } = full.data;

	return (
		<div>
			<div className="flex items-center gap-3 border-b border-t-border bg-t-surface px-4 py-2">
				<Link
					to={`/stock/${upperKode}.JK`}
					className="font-mono text-sm text-t-text-muted transition-colors hover:text-t-text-secondary"
				>
					←
				</Link>
				<span className="font-mono text-xs text-t-text-muted">IDX Company Profile</span>
			</div>

			<CompanyHeader company={company} />

			<div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[1fr_320px]">
				<div className="space-y-4">
					{summary.isLoading ? (
						<Skeleton className="h-[300px] w-full" />
					) : (
						<RatioCard
							latest={summary.data?.latest ?? financials}
							history={summary.data?.history}
						/>
					)}
					<BrokerSummaryTable kode={upperKode} />
					<ForeignFlowChart kode={upperKode} />
					<InsiderNetworkGraph
						kode={upperKode}
						companyName={company.name}
						directors={directors}
						commissioners={commissioners}
						shareholders={shareholders}
						peers={peer_companies}
					/>
					<InsiderTransactionsTable kode={upperKode} />
					{treemap.isLoading ? (
						<Skeleton className="h-[250px] w-full rounded-lg" />
					) : treemap.data ? (
						<ChartContainer
							title="Ownership Breakdown"
							subtitle="KSEI shareholder registry — proportional holdings"
						>
							<Treemap data={treemap.data} />
						</ChartContainer>
					) : null}
					{ksei.isLoading ? (
						<Skeleton className="h-[200px] w-full rounded-lg" />
					) : ksei.data && ksei.data.shareholders.length > 0 ? (
						<div className="rounded-lg border border-t-border bg-t-surface">
							<div className="flex items-center justify-between border-b border-t-border px-4 py-2.5">
								<div>
									<h3 className="font-mono text-[13px] font-semibold tracking-tight text-t-text">
										KSEI Shareholders
									</h3>
									<p className="text-[11px] text-t-text-muted">
										{ksei.data.shareholders.length} holders &middot; {ksei.data.total_insider_pct.toFixed(1)}% total insider
									</p>
								</div>
								<Link
									to={`/idx/ownership/companies`}
									className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-t-text-secondary transition-colors hover:bg-white/10 hover:text-white"
								>
									All Companies
								</Link>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b border-white/8 bg-white/[0.03]">
											<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">Name</th>
											<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">Type</th>
											<th className="px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">L/F</th>
											<th className="hidden px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted sm:table-cell">Domicile</th>
											<th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">%</th>
											<th className="px-3 py-2 w-[100px]" />
										</tr>
									</thead>
									<tbody className="divide-y divide-white/5">
										{ksei.data.shareholders.map((s) => (
											<tr key={`${s.investor_name}-${s.investor_type}`} className="transition-colors hover:bg-white/[0.04]">
												<td className="max-w-[240px] truncate px-3 py-1.5">
													<Link
														to={`/idx/ownership/investor/${encodeURIComponent(s.investor_name)}`}
														className="font-mono text-xs text-t-text hover:text-t-amber hover:underline"
													>
														{s.investor_name}
													</Link>
												</td>
												<td className="px-3 py-1.5">
													<Badge type={s.investor_type as InvestorType} />
												</td>
												<td className="px-3 py-1.5 text-center">
													<span className={clsx(
														"font-mono text-[10px]",
														s.local_foreign === "L" ? "text-t-green" : s.local_foreign === "A" ? "text-t-blue" : "text-t-text-muted",
													)}>
														{s.local_foreign === "L" ? "L" : s.local_foreign === "A" ? "F" : "—"}
													</span>
												</td>
												<td className="hidden px-3 py-1.5 text-xs text-t-text-muted sm:table-cell">
													{s.domicile || "—"}
												</td>
												<td className="px-3 py-1.5 text-right font-mono text-xs font-medium tabular-nums text-t-amber">
													{s.percentage.toFixed(2)}%
												</td>
												<td className="px-3 py-1.5 w-[100px]">
													<div className="h-1.5 w-full rounded-full bg-white/[0.06]">
														<div className="h-1.5 rounded-full bg-t-amber/50" style={{ width: `${Math.min(s.percentage, 100)}%` }} />
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					) : null}
					<PeerCompanies peers={peer_companies} />
				</div>
				<div className="space-y-4">
					<PeerRadarChart kode={upperKode} financials={financials} peers={peer_companies} />
					<DisclosuresFeed kode={upperKode} />
					<ShareholderTable shareholders={shareholders} />
					<BoardList directors={directors} commissioners={commissioners} />
				</div>
			</div>
		</div>
	);
}
