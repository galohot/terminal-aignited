import { clsx } from "clsx";
import { Link, useParams } from "react-router";
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
import { ChartContainer } from "../components/ownership/chart-container";
import { Badge } from "../components/ownership/ownership-badge";
import { Treemap } from "../components/ownership/treemap";
import type { InvestorType } from "../components/ownership/types";
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
				<p className="font-mono text-sm text-ink-3">
					{full.error?.message.includes("404")
						? `Emiten "${upperKode}" not found`
						: "Failed to load company data"}
				</p>
				<Link
					to="/"
					className="rounded border border-rule bg-card px-3 py-1 font-mono text-xs text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
				>
					Back to Dashboard
				</Link>
			</div>
		);
	}

	const { company, financials, directors, commissioners, shareholders, peer_companies } = full.data;

	return (
		<div>
			<div className="flex items-center gap-3 border-b border-rule bg-card px-4 py-2">
				<Link
					to={`/stock/${upperKode}.JK`}
					className="font-mono text-sm text-ink-4 transition-colors hover:text-ink-2"
				>
					←
				</Link>
				<span className="font-mono text-xs text-ink-4">IDX Company Profile</span>
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
						<div className="rounded-[18px] border border-rule bg-card">
							<div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
								<div>
									<h3 className="font-mono text-[13px] font-semibold tracking-tight text-ink">
										KSEI Shareholders
									</h3>
									<p className="text-[11px] text-ink-4">
										{ksei.data.shareholders.length} holders &middot;{" "}
										{ksei.data.total_insider_pct.toFixed(1)}% total insider
									</p>
								</div>
								<Link
									to={`/idx/ownership/companies`}
									className="rounded-full border border-rule bg-paper-2 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-3 transition-colors hover:bg-ink hover:text-paper"
								>
									All Companies
								</Link>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b border-rule bg-paper-2">
											<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
												Name
											</th>
											<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
												Type
											</th>
											<th className="px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
												L/F
											</th>
											<th className="hidden px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 sm:table-cell">
												Domicile
											</th>
											<th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
												%
											</th>
											<th className="w-[100px] px-3 py-2" />
										</tr>
									</thead>
									<tbody className="divide-y divide-rule">
										{ksei.data.shareholders.map((s) => (
											<tr
												key={`${s.investor_name}-${s.investor_type}`}
												className="transition-colors hover:bg-paper-2/60"
											>
												<td className="max-w-[240px] truncate px-3 py-1.5">
													<Link
														to={`/idx/ownership/investor/${encodeURIComponent(s.investor_name)}`}
														className="font-mono text-xs text-ink hover:text-ember-600 hover:underline"
													>
														{s.investor_name}
													</Link>
												</td>
												<td className="px-3 py-1.5">
													<Badge type={s.investor_type as InvestorType} />
												</td>
												<td className="px-3 py-1.5 text-center">
													<span
														className={clsx(
															"font-mono text-[10px]",
															s.local_foreign === "L"
																? "text-pos"
																: s.local_foreign === "A"
																	? "text-cyan-700"
																	: "text-ink-4",
														)}
													>
														{s.local_foreign === "L" ? "L" : s.local_foreign === "A" ? "F" : "—"}
													</span>
												</td>
												<td className="hidden px-3 py-1.5 text-xs text-ink-4 sm:table-cell">
													{s.domicile || "—"}
												</td>
												<td className="px-3 py-1.5 text-right font-mono text-xs font-medium tabular-nums text-ember-700">
													{s.percentage.toFixed(2)}%
												</td>
												<td className="w-[100px] px-3 py-1.5">
													<div className="h-1.5 w-full rounded-full bg-paper-2">
														<div
															className="h-1.5 rounded-full bg-ember-500/50"
															style={{ width: `${Math.min(s.percentage, 100)}%` }}
														/>
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
