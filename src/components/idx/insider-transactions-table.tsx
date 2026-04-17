import { useIdxInsiderTransactions } from "../../hooks/use-idx-company";
import { Skeleton } from "../ui/loading";

const TYPE_COLORS: Record<string, string> = {
	director: "border-t-blue/20 bg-t-blue/10 text-t-blue",
	commissioner: "border-amber-500/20 bg-amber-500/10 text-amber-400",
	shareholder: "border-t-green/20 bg-t-green/10 text-t-green",
};

export function InsiderTransactionsTable({ kode }: { kode: string }) {
	const { data, isLoading, error } = useIdxInsiderTransactions(kode);

	if (isLoading) return <Skeleton className="h-[300px] w-full rounded-xl" />;

	if (error || !data?.insiders?.length) {
		return (
			<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
				Insider data unavailable.
			</div>
		);
	}

	// Deduplicate — API returns repeated entries per period
	const seen = new Set<string>();
	const unique = data.insiders.filter((ins) => {
		const key = `${ins.insider_name}|${ins.insider_type}|${ins.position ?? ""}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	return (
		<div>
			<div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
				Insider Positions ({unique.length})
			</div>
			<div className="overflow-x-auto rounded-xl border border-white/8">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-white/8 bg-white/[0.03]">
							<th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
								Name
							</th>
							<th className="px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
								Type
							</th>
							<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted sm:table-cell">
								Position
							</th>
							<th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
								%
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5">
						{unique.map((ins) => (
							<tr
								key={`${ins.insider_name}-${ins.insider_type}`}
								className="transition-colors hover:bg-white/[0.04]"
							>
								<td className="max-w-[220px] truncate px-3 py-2 text-t-text">{ins.insider_name}</td>
								<td className="px-3 py-2 text-center">
									<span
										className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TYPE_COLORS[ins.insider_type] ?? "border-white/10 bg-white/[0.04] text-t-text-muted"}`}
									>
										{ins.insider_type}
									</span>
								</td>
								<td className="hidden max-w-[160px] truncate px-3 py-2 text-xs text-t-text-secondary sm:table-cell">
									{ins.position ?? "—"}
								</td>
								<td className="px-3 py-2 text-right font-mono text-xs text-t-text-secondary">
									{ins.percentage != null ? `${ins.percentage.toFixed(3)}%` : "—"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
