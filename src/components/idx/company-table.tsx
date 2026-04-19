import { Link } from "react-router";
import type { IdxCompany } from "../../types/market";

export function CompanyTable({ companies }: { companies: IdxCompany[] }) {
	if (companies.length === 0) {
		return (
			<div className="rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-8 text-center text-sm text-ink-4">
				No companies match your filters.
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
							Name
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 md:table-cell">
							Sector
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 lg:table-cell">
							Sub Sector
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 sm:table-cell">
							Board
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 sm:table-cell">
							Listed
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-rule">
					{companies.map((c) => (
						<tr key={c.kode_emiten} className="transition-colors hover:bg-paper-2/60">
							<td className="px-3 py-2">
								<Link
									to={`/idx/${c.kode_emiten}`}
									className="font-mono text-sm font-semibold text-ember-600 hover:underline"
								>
									{c.kode_emiten}
								</Link>
							</td>
							<td className="max-w-[240px] truncate px-3 py-2 text-ink">{c.name}</td>
							<td className="hidden px-3 py-2 text-ink-2 md:table-cell">{c.sector}</td>
							<td className="hidden px-3 py-2 text-ink-2 lg:table-cell">
								{c.sub_sector}
							</td>
							<td className="hidden px-3 py-2 sm:table-cell">
								<span className="rounded-full border border-rule bg-paper-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-4">
									{c.papan_pencatatan}
								</span>
							</td>
							<td className="hidden whitespace-nowrap px-3 py-2 font-mono text-xs text-ink-4 sm:table-cell">
								{c.listing_date}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
