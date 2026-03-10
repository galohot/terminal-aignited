import { Link } from "react-router";
import type { IdxInsiderSearchResult } from "../../types/market";

function roleTone(type: IdxInsiderSearchResult["insider_type"]) {
	if (type === "director") return "border-t-blue/30 bg-t-blue/10 text-t-blue";
	if (type === "commissioner") return "border-t-amber/30 bg-t-amber/10 text-t-amber";
	return "border-t-green/30 bg-t-green/10 text-t-green";
}

export function InsiderResults({ results }: { results: IdxInsiderSearchResult[] }) {
	if (results.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
				No positions found. Try a different name.
			</div>
		);
	}

	return (
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
						<th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
							Role
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted sm:table-cell">
							Position
						</th>
						<th className="hidden px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted md:table-cell">
							Shares
						</th>
						<th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
							Ownership
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-white/5">
					{results.map((r) => (
						<tr
							key={`${r.kode_emiten}-${r.insider_type}-${r.position}`}
							className="transition-colors hover:bg-white/[0.04]"
						>
							<td className="px-3 py-2">
								<Link
									to={`/idx/${r.kode_emiten}`}
									className="font-mono text-sm font-semibold text-t-green hover:underline"
								>
									{r.kode_emiten}
								</Link>
							</td>
							<td className="max-w-[240px] truncate px-3 py-2 text-t-text">{r.company_name}</td>
							<td className="px-3 py-2">
								<span
									className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${roleTone(r.insider_type)}`}
								>
									{r.insider_type}
								</span>
							</td>
							<td className="hidden px-3 py-2 text-t-text-secondary sm:table-cell">
								{r.position ?? "—"}
							</td>
							<td className="hidden px-3 py-2 text-right font-mono text-xs text-t-text-muted md:table-cell">
								{r.shares_owned != null ? r.shares_owned.toLocaleString("en-US") : "—"}
							</td>
							<td className="px-3 py-2 text-right font-mono text-xs font-medium text-t-amber">
								{r.percentage != null ? `${r.percentage.toFixed(2)}%` : "—"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
