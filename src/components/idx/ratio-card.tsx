import { useMemo } from "react";
import type { IdxFinancialSummaryHistory, IdxFinancialSummaryLatest } from "../../types/market";

const LATEST_RATIOS: { key: keyof IdxFinancialSummaryLatest; label: string; suffix: string }[] = [
	{ key: "roe", label: "Return on Equity", suffix: "%" },
	{ key: "roa", label: "Return on Assets", suffix: "%" },
	{ key: "npm", label: "Net Profit Margin", suffix: "%" },
	{ key: "der", label: "Debt to Equity", suffix: "x" },
	{ key: "per", label: "Price to Earnings", suffix: "x" },
	{ key: "pbv", label: "Price to Book", suffix: "x" },
];

const HISTORY_RATIOS: { key: keyof IdxFinancialSummaryHistory; label: string }[] = [
	{ key: "roe", label: "ROE" },
	{ key: "roa", label: "ROA" },
	{ key: "eps", label: "EPS" },
];

export function RatioCard({
	latest,
	history,
}: {
	latest: IdxFinancialSummaryLatest | null;
	history?: IdxFinancialSummaryHistory[];
}) {
	const sortedHistory = useMemo(() => {
		if (!history?.length) return [];
		return history.slice().reverse();
	}, [history]);

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
					{LATEST_RATIOS.map(({ key, label, suffix }) => {
						const value = latest[key] as number | null;
						return (
							<div key={key} className="bg-t-surface px-3 py-3">
								<div className="font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
									{key.toUpperCase()}
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

			{sortedHistory.length > 1 && (
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
									{HISTORY_RATIOS.map(({ key, label }) => (
										<th
											key={key}
											className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-t-text-muted"
										>
											{label}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{sortedHistory.map((row) => (
									<tr key={`${row.period_year}-${row.period_quarter}`}>
										<td className="whitespace-nowrap px-3 py-2 font-mono text-t-text-secondary">
											Q{row.period_quarter} {row.period_year}
										</td>
										{HISTORY_RATIOS.map(({ key }) => {
											const v = row[key] as number | null;
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
