import { clsx } from "clsx";
import { Link, useParams } from "react-router";
import { IdxNav } from "../components/idx/idx-nav";
import { Badge } from "../components/ownership/ownership-badge";
import { OwnershipNav } from "../components/ownership/ownership-nav";
import type { InvestorType } from "../components/ownership/types";
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
					<p className="font-mono text-sm text-ink-3">
						No KSEI data found for &ldquo;{decodedName}&rdquo;
					</p>
					<Link
						to="/idx/ownership/investors"
						className="rounded border border-rule bg-card px-3 py-1 font-mono text-xs text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
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

	const major = data.companies.filter((c) => c.percentage > 10);
	const significant = data.companies.filter((c) => c.percentage > 5 && c.percentage <= 10);
	const minor = data.companies.filter((c) => c.percentage >= 1 && c.percentage <= 5);

	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<IdxNav />
			<OwnershipNav />

			<div className="mb-6 rounded-[18px] border border-rule bg-card p-5">
				<div className="flex flex-wrap items-start gap-4">
					<div className="min-w-0 flex-1">
						<h1
							className="break-words text-[clamp(1.5rem,3vw,2rem)] leading-[1.1] text-ink"
							style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
						>
							{data.investor_name}
						</h1>
						<div className="mt-2 flex flex-wrap items-center gap-2">
							<Badge type={invType} />
							<span
								className={clsx(
									"rounded-full border px-2 py-0.5 font-mono text-[10px]",
									data.local_foreign === "L"
										? "border-pos/30 bg-pos/10 text-pos"
										: data.local_foreign === "A"
											? "border-cyan-400/30 bg-cyan-50 text-cyan-700"
											: "border-rule bg-paper-2 text-ink-4",
								)}
							>
								{data.local_foreign === "L"
									? "Local"
									: data.local_foreign === "A"
										? "Foreign"
										: "Unknown"}
							</span>
							{data.domicile && (
								<span className="font-mono text-[11px] text-ink-4">{data.domicile}</span>
							)}
						</div>
					</div>

					<div className="flex gap-6">
						<div className="text-center">
							<div className="font-mono text-2xl font-bold tabular-nums text-ember-600">
								{companyCount}
							</div>
							<div className="font-mono text-[10px] uppercase tracking-wider text-ink-4">
								Companies
							</div>
						</div>
						<div className="text-center">
							<div className="font-mono text-2xl font-bold tabular-nums text-ink">
								{totalPct.toFixed(1)}%
							</div>
							<div className="font-mono text-[10px] uppercase tracking-wider text-ink-4">
								Total Holdings
							</div>
						</div>
					</div>
				</div>

				{(major.length > 0 || significant.length > 0) && (
					<div className="mt-4 flex flex-wrap gap-3">
						{major.length > 0 && (
							<span className="rounded-full border border-ember-400/30 bg-ember-50 px-2.5 py-0.5 font-mono text-[10px] text-ember-700">
								{major.length} major (&gt;10%)
							</span>
						)}
						{significant.length > 0 && (
							<span className="rounded-full border border-cyan-400/30 bg-cyan-50 px-2.5 py-0.5 font-mono text-[10px] text-cyan-700">
								{significant.length} significant (5-10%)
							</span>
						)}
						{minor.length > 0 && (
							<span className="rounded-full border border-rule bg-paper-2 px-2.5 py-0.5 font-mono text-[10px] text-ink-4">
								{minor.length} minor (1-5%)
							</span>
						)}
					</div>
				)}
			</div>

			<div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ink-4">
				Holdings ({companyCount} companies)
			</div>
			<div className="overflow-x-auto rounded-[18px] border border-rule bg-card">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-rule bg-paper-2">
							<th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
								Code
							</th>
							<th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
								Company
							</th>
							<th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
								Ownership
							</th>
							<th className="w-[140px] px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
								Bar
							</th>
							<th className="hidden px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 md:table-cell">
								Shares
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-rule">
						{data.companies.map((c) => {
							const barColor =
								c.percentage > 10
									? "bg-ember-500/60"
									: c.percentage > 5
										? "bg-cyan-400/60"
										: "bg-ink/20";
							return (
								<tr key={c.kode_emiten} className="transition-colors hover:bg-paper-2/60">
									<td className="px-3 py-2">
										<Link
											to={`/idx/${c.kode_emiten}`}
											className="font-mono text-sm font-semibold text-ember-600 hover:underline"
										>
											{c.kode_emiten}
										</Link>
									</td>
									<td className="max-w-[300px] truncate px-3 py-2 text-ink">{c.issuer_name}</td>
									<td className="px-3 py-2 text-right font-mono text-xs font-medium tabular-nums text-ember-700">
										{c.percentage.toFixed(2)}%
									</td>
									<td className="w-[140px] px-3 py-2">
										<div className="h-2 w-full rounded-full bg-paper-2">
											<div
												className={clsx("h-2 rounded-full", barColor)}
												style={{ width: `${Math.min(c.percentage, 100)}%` }}
											/>
										</div>
									</td>
									<td className="hidden px-3 py-2 text-right font-mono text-xs tabular-nums text-ink-4 md:table-cell">
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
