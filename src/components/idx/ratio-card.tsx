import { useMemo } from "react";
import type { IdxFinancial } from "../../types/market";

const RATIO_LABELS: Record<string, string> = {
	ROE: "Return on Equity",
	ROA: "Return on Assets",
	NPM: "Net Profit Margin",
	DER: "Debt to Equity",
	PER: "Price to Earnings",
	PBV: "Price to Book",
};

const RATIO_SUFFIX: Record<string, string> = {
	ROE: "%",
	ROA: "%",
	NPM: "%",
	DER: "x",
	PER: "x",
	PBV: "x",
};

export function RatioCard({ financials }: { financials: IdxFinancial[] }) {
	const latest = financials[0];

	const history = useMemo(() => {
		return financials
			.slice()
			.reverse()
			.map((f) => ({
				label: `Q${f.period_quarter} ${f.period_year}`,
				...f.data,
			}));
	}, [financials]);

	if (!latest) return null;

	const ratioKeys = Object.keys(RATIO_LABELS) as Array<keyof typeof RATIO_LABELS>;

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
					{ratioKeys.map((key) => {
						const value = latest.data[key as keyof typeof latest.data];
						return (
							<div key={key} className="bg-t-surface px-3 py-3">
								<div className="font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
									{key}
								</div>
								<div className="mt-1 font-mono text-sm font-medium text-t-text">
									{value != null ? `${value.toFixed(2)}${RATIO_SUFFIX[key]}` : "—"}
								</div>
								<div className="mt-0.5 text-[10px] text-t-text-muted">{RATIO_LABELS[key]}</div>
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
									{ratioKeys.map((key) => (
										<th
											key={key}
											className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-t-text-muted"
										>
											{key}
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
										{ratioKeys.map((key) => {
											const v = row[key as keyof typeof row];
											return (
												<td
													key={key}
													className="whitespace-nowrap px-3 py-2 text-right font-mono text-t-text"
												>
													{v != null ? `${(v as number).toFixed(2)}` : "—"}
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
