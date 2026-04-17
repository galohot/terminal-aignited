import { clsx } from "clsx";
import { Link, useParams } from "react-router";
import { INVESTOR_TYPE_COLORS, INVESTOR_TYPE_LABELS } from "../components/ownership/constants";
import { Badge } from "../components/ownership/ownership-badge";
import type { InvestorType } from "../components/ownership/types";
import { IdxNav } from "../components/idx/idx-nav";
import { OwnershipNav } from "../components/ownership/ownership-nav";
import { Skeleton } from "../components/ui/loading";
import { useKseiInvestor } from "../hooks/use-ksei";
import { usePageTitle } from "../hooks/use-page-title";

export function IdxOwnershipInvestorPage() {
	const { name = "" } = useParams<{ name: string }>();
	const decodedName = decodeURIComponent(name);
	usePageTitle(decodedName ? `${decodedName} — Ownership` : "Investor");

	const { data, isLoading, error } = useKseiInvestor(decodedName);

	if (isLoading) {
		return (
			<div className="mx-auto max-w-[1600px] p-4">
				<IdxNav />
			<OwnershipNav />
				<Skeleton className="mb-4 h-20 w-full rounded-xl" />
				<Skeleton className="h-[400px] w-full rounded-xl" />
			</div>
		);
	}

	if (error || !data || !data.companies || data.companies.length === 0) {
		return (
			<div className="mx-auto max-w-[1600px] p-4">
				<IdxNav />
			<OwnershipNav />
				<div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
					<p className="font-mono text-sm text-t-text-secondary">
						No KSEI data found for &ldquo;{decodedName}&rdquo;
					</p>
					<Link
						to="/idx/ownership/investors"
						className="rounded border border-t-border bg-t-surface px-3 py-1 font-mono text-xs text-t-text-secondary transition-colors hover:bg-t-hover"
					>
						Browse Investors
					</Link>
				</div>
			</div>
		);
	}

	const invType = data.investor_type as InvestorType;
	const totalPct = data.companies.reduce((sum, c) => sum + c.percentage, 0);
	const companyCount = data.companies.length;

	// Group by size bucket for summary
	const major = data.companies.filter((c) => c.percentage > 10);
	const significant = data.companies.filter((c) => c.percentage > 5 && c.percentage <= 10);
	const minor = data.companies.filter((c) => c.percentage >= 1 && c.percentage <= 5);

	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<IdxNav />
			<OwnershipNav />

			{/* Header */}
			<div className="mb-6 rounded-lg border border-t-border bg-t-surface p-5">
				<div className="flex flex-wrap items-start gap-4">
					<div className="flex-1 min-w-0">
						<h1 className="font-mono text-xl font-semibold tracking-wide text-white break-words">
							{data.investor_name}
						</h1>
						<div className="mt-2 flex flex-wrap items-center gap-2">
							<Badge type={invType} />
							<span
								className={clsx(
									"rounded-full border px-2 py-0.5 font-mono text-[10px]",
									data.local_foreign === "L"
										? "border-t-green/30 bg-t-green/10 text-t-green"
										: data.local_foreign === "A"
											? "border-t-blue/30 bg-t-blue/10 text-t-blue"
											: "border-white/10 bg-white/[0.04] text-t-text-muted",
								)}
							>
								{data.local_foreign === "L" ? "Local" : data.local_foreign === "A" ? "Foreign" : "Unknown"}
							</span>
							{data.domicile && (
								<span className="font-mono text-[11px] text-t-text-muted">
									{data.domicile}
								</span>
							)}
						</div>
					</div>

					{/* Summary stats */}
					<div className="flex gap-6">
						<div className="text-center">
							<div className="font-mono text-2xl font-bold tabular-nums text-t-amber">
								{companyCount}
							</div>
							<div className="font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
								Companies
							</div>
						</div>
						<div className="text-center">
							<div className="font-mono text-2xl font-bold tabular-nums text-t-text">
								{totalPct.toFixed(1)}%
							</div>
							<div className="font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
								Total Holdings
							</div>
						</div>
					</div>
				</div>

				{/* Size breakdown */}
				{(major.length > 0 || significant.length > 0) && (
					<div className="mt-4 flex flex-wrap gap-3">
						{major.length > 0 && (
							<span className="rounded-full border border-t-amber/30 bg-t-amber/10 px-2.5 py-0.5 font-mono text-[10px] text-t-amber">
								{major.length} major (&gt;10%)
							</span>
						)}
						{significant.length > 0 && (
							<span className="rounded-full border border-t-blue/30 bg-t-blue/10 px-2.5 py-0.5 font-mono text-[10px] text-t-blue">
								{significant.length} significant (5-10%)
							</span>
						)}
						{minor.length > 0 && (
							<span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] text-t-text-muted">
								{minor.length} minor (1-5%)
							</span>
						)}
					</div>
				)}
			</div>

			{/* Holdings table */}
			<div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-t-text-muted">
				Holdings ({companyCount} companies)
			</div>
			<div className="overflow-x-auto rounded-xl border border-white/8">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-white/8 bg-white/[0.03]">
							<th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
								Code
							</th>
							<th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
								Company
							</th>
							<th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
								Ownership
							</th>
							<th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted w-[140px]">
								Bar
							</th>
							<th className="hidden px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted md:table-cell">
								Shares
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5">
						{data.companies.map((c) => {
							const barColor =
								c.percentage > 10
									? "bg-t-amber/60"
									: c.percentage > 5
										? "bg-t-blue/60"
										: "bg-white/20";
							return (
								<tr
									key={c.kode_emiten}
									className="transition-colors hover:bg-white/[0.04]"
								>
									<td className="px-3 py-2">
										<Link
											to={`/idx/${c.kode_emiten}`}
											className="font-mono text-sm font-semibold text-t-green hover:underline"
										>
											{c.kode_emiten}
										</Link>
									</td>
									<td className="max-w-[300px] truncate px-3 py-2 text-t-text">
										{c.issuer_name}
									</td>
									<td className="px-3 py-2 text-right font-mono text-xs font-medium tabular-nums text-t-amber">
										{c.percentage.toFixed(2)}%
									</td>
									<td className="px-3 py-2 w-[140px]">
										<div className="h-2 w-full rounded-full bg-white/[0.06]">
											<div
												className={clsx("h-2 rounded-full", barColor)}
												style={{ width: `${Math.min(c.percentage, 100)}%` }}
											/>
										</div>
									</td>
									<td className="hidden px-3 py-2 text-right font-mono text-xs tabular-nums text-t-text-muted md:table-cell">
										{c.total_shares > 0 ? c.total_shares.toLocaleString("en-US") : "—"}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
