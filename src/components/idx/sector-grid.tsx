import { Link } from "react-router";
import type { IdxSector } from "../../types/market";

export function SectorGrid({
	sectors,
	totalCompanies,
}: {
	sectors: IdxSector[];
	totalCompanies: number;
}) {
	const maxCount = Math.max(...sectors.map((s) => s.company_count));

	return (
		<div>
			<p className="mb-4 font-mono text-xs text-ink-4">
				Market Composition — {totalCompanies} companies across {sectors.length} sectors
			</p>
			<div className="overflow-x-auto rounded-[18px] border border-rule bg-card">
				<table className="w-full text-xs">
					<thead>
						<tr className="border-b border-rule bg-paper-2">
							<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-ink-4">
								Sector
							</th>
							<th className="w-[100px] px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-ink-4">
								Companies
							</th>
							<th className="hidden px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-ink-4 sm:table-cell">
								Distribution
							</th>
							<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-ink-4">
								Sub-sectors
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-rule">
						{sectors.map((s) => (
							<tr key={s.sector} className="transition-colors hover:bg-paper-2/60">
								<td className="whitespace-nowrap px-3 py-2.5">
									<Link
										to={`/idx/screener?sector=${encodeURIComponent(s.sector)}`}
										className="font-mono text-xs font-medium text-ink transition-colors hover:text-ember-600 hover:underline"
									>
										{s.sector}
									</Link>
								</td>
								<td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-medium text-pos">
									{s.company_count}
								</td>
								<td className="hidden px-3 py-2.5 sm:table-cell">
									<div className="h-2 w-full max-w-[200px] rounded-full bg-paper-2">
										<div
											className="h-full rounded-full bg-pos/60"
											style={{
												width: `${(s.company_count / maxCount) * 100}%`,
											}}
										/>
									</div>
								</td>
								<td className="px-3 py-2.5">
									<div className="flex flex-wrap gap-1">
										{s.sub_sectors.slice(0, 4).map((sub) => (
											<span
												key={sub}
												className="rounded-full border border-rule bg-paper-2 px-2 py-0.5 font-mono text-[10px] text-ink-4"
											>
												{sub}
											</span>
										))}
										{s.sub_sectors.length > 4 && (
											<span className="px-1 font-mono text-[10px] text-ink-4">
												+{s.sub_sectors.length - 4}
											</span>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
