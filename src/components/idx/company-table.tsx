import { Link } from "react-router";
import type { IdxCompany } from "../../types/market";

export function CompanyTable({ companies }: { companies: IdxCompany[] }) {
	if (companies.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
				No companies match your filters.
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
							Name
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted md:table-cell">
							Sector
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted lg:table-cell">
							Sub Sector
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted sm:table-cell">
							Board
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted sm:table-cell">
							Listed
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-white/5">
					{companies.map((c) => (
						<tr key={c.kode_emiten} className="transition-colors hover:bg-white/[0.04]">
							<td className="px-3 py-2">
								<Link
									to={`/idx/${c.kode_emiten}`}
									className="font-mono text-sm font-semibold text-t-green hover:underline"
								>
									{c.kode_emiten}
								</Link>
							</td>
							<td className="max-w-[240px] truncate px-3 py-2 text-t-text">{c.name}</td>
							<td className="hidden px-3 py-2 text-t-text-secondary md:table-cell">{c.sector}</td>
							<td className="hidden px-3 py-2 text-t-text-secondary lg:table-cell">
								{c.sub_sector}
							</td>
							<td className="hidden px-3 py-2 sm:table-cell">
								<span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
									{c.papan_pencatatan}
								</span>
							</td>
							<td className="hidden whitespace-nowrap px-3 py-2 font-mono text-xs text-t-text-muted sm:table-cell">
								{c.listing_date}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
