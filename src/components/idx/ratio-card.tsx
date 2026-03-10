import { useMemo } from "react";
import type { IdxFinancial, IdxFinancialData } from "../../types/market";

const RATIOS: { key: keyof IdxFinancialData; label: string; suffix: string }[] = [
	{ key: "roe", label: "Return on Equity", suffix: "%" },
	{ key: "roa", label: "Return on Assets", suffix: "%" },
	{ key: "npm", label: "Net Profit Margin", suffix: "%" },
	{ key: "deRatio", label: "Debt to Equity", suffix: "x" },
	{ key: "per", label: "Price to Earnings", suffix: "x" },
	{ key: "priceBV", label: "Price to Book", suffix: "x" },
];

export function RatioCard({ financials }: { financials: IdxFinancial[] }) {
	const latest = financials[0];

	const history = useMemo(() => {
		return financials
			.slice()
			.reverse()
			.map((f) => ({
				label: `Q${f.period_quarter} ${f.period_year}`,
				data: f.data,
			}));
	}, [financials]);

	if (!latest) return null;

	return (
		<div className="space-y-4">
			<div className="rounded border border-t-border bg-t-surface">
				<div className="border-b border-t-border px-3 py-2">
					<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
						Financial Ratios
					</h3>
					<span className="font-mono text-[11px] text-t-text-muted">
						Q{latest.period_quarter} {latest.period_year}
					</span>
				</div>
				<div className="grid grid-cols-2 gap-px bg-white/5 sm:grid-cols-3">
					{RATIOS.map(({ key, label, suffix }) => {
						const value = latest.data[key] as number | null;
						return (
							<div key={key} className="bg-t-surface px-3 py-3">
								<div className="font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
									{key === "deRatio" ? "DER" : key === "priceBV" ? "PBV" : key.toUpperCase()}
								</div>
								<div className="mt-1 font-mono text-sm font-medium text-t-text">
									{value != null ? `${value.toFixed(2)}${suffix}` : "—"}
								</div>
								<div className="mt-0.5 text-[10px] text-t-text-muted">{label}</div>
							</div>
						);
					})}
				</div>
			</div>

			{history.length > 1 && (
				<div className="rounded border border-t-border bg-t-surface">
					<div className="border-b border-t-border px-3 py-2">
						<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
							Ratio History
						</h3>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-xs">
							<thead>
								<tr className="border-b border-white/5">
									<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
										Period
									</th>
									{RATIOS.map(({ key }) => (
										<th
											key={key}
											className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-t-text-muted"
										>
											{key === "deRatio" ? "DER" : key === "priceBV" ? "PBV" : key.toUpperCase()}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{history.map((row) => (
									<tr key={row.label}>
										<td className="whitespace-nowrap px-3 py-2 font-mono text-t-text-secondary">
											{row.label}
										</td>
										{RATIOS.map(({ key }) => {
											const v = row.data[key] as number | null;
											return (
												<td
													key={key}
													className="whitespace-nowrap px-3 py-2 text-right font-mono text-t-text"
												>
													{v != null ? v.toFixed(2) : "—"}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
