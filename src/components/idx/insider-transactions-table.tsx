import { useIdxInsiderTransactions } from "../../hooks/use-idx-company";
import { Skeleton } from "../ui/loading";

const TYPE_COLORS: Record<string, string> = {
	director: "border-cyan-400/30 bg-cyan-50 text-cyan-700",
	commissioner: "border-ember-400/30 bg-ember-50 text-ember-700",
	shareholder: "border-pos/30 bg-pos/10 text-pos",
};

export function InsiderTransactionsTable({ kode }: { kode: string }) {
	const { data, isLoading, error } = useIdxInsiderTransactions(kode);

	if (isLoading) return <Skeleton className="h-[300px] w-full rounded-xl" />;

	if (error || !data?.insiders?.length) {
		return (
			<div className="rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-8 text-center text-sm text-ink-4">
				Insider data unavailable.
			</div>
		);
	}

	const seen = new Set<string>();
	const unique = data.insiders.filter((ins) => {
		const key = `${ins.insider_name}|${ins.insider_type}|${ins.position ?? ""}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	return (
		<div>
			<div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
				Insider Positions ({unique.length})
			</div>
			<div className="overflow-x-auto rounded-[18px] border border-rule bg-card">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-rule bg-paper-2">
							<th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
								Name
							</th>
							<th className="px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
								Type
							</th>
							<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 sm:table-cell">
								Position
							</th>
							<th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
								%
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-rule">
						{unique.map((ins) => (
							<tr
								key={`${ins.insider_name}-${ins.insider_type}`}
								className="transition-colors hover:bg-paper-2/60"
							>
								<td className="max-w-[220px] truncate px-3 py-2 text-ink">{ins.insider_name}</td>
								<td className="px-3 py-2 text-center">
									<span
										className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TYPE_COLORS[ins.insider_type] ?? "border-rule bg-paper-2 text-ink-4"}`}
									>
										{ins.insider_type}
									</span>
								</td>
								<td className="hidden max-w-[160px] truncate px-3 py-2 text-xs text-ink-2 sm:table-cell">
									{ins.position ?? "—"}
								</td>
								<td className="px-3 py-2 text-right font-mono text-xs text-ink-2">
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
