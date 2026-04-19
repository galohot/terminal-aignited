import { Link } from "react-router";
import type { IdxInsiderSearchResult } from "../../types/market";

function roleTone(type: IdxInsiderSearchResult["insider_type"]) {
	if (type === "director") return "border-cyan-400/30 bg-cyan-50 text-cyan-700";
	if (type === "commissioner") return "border-ember-400/30 bg-ember-50 text-ember-700";
	return "border-pos/30 bg-pos/10 text-pos";
}

export function InsiderResults({ results }: { results: IdxInsiderSearchResult[] }) {
	if (results.length === 0) {
		return (
			<div className="rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-8 text-center text-sm text-ink-4">
				No positions found. Try a different name.
			</div>
		);
	}

	return (
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
						<th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
							Role
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 sm:table-cell">
							Position
						</th>
						<th className="hidden px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 md:table-cell">
							Shares
						</th>
						<th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
							Ownership
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-rule">
					{results.map((r) => (
						<tr
							key={`${r.kode_emiten}-${r.insider_type}-${r.position}`}
							className="transition-colors hover:bg-paper-2/60"
						>
							<td className="px-3 py-2">
								<Link
									to={`/idx/${r.kode_emiten}`}
									className="font-mono text-sm font-semibold text-ember-600 hover:underline"
								>
									{r.kode_emiten}
								</Link>
							</td>
							<td className="max-w-[240px] truncate px-3 py-2 text-ink">{r.company_name}</td>
							<td className="px-3 py-2">
								<span
									className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${roleTone(r.insider_type)}`}
								>
									{r.insider_type}
								</span>
							</td>
							<td className="hidden px-3 py-2 text-ink-2 sm:table-cell">
								{r.position ?? "—"}
							</td>
							<td className="hidden px-3 py-2 text-right font-mono text-xs text-ink-4 md:table-cell">
								{r.shares_owned != null ? r.shares_owned.toLocaleString("en-US") : "—"}
							</td>
							<td className="px-3 py-2 text-right font-mono text-xs font-medium text-ember-700">
								{r.percentage != null ? `${r.percentage.toFixed(2)}%` : "—"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
