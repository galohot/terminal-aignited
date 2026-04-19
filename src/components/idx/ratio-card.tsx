import { useMemo } from "react";
import type { IdxFinancialSummaryHistory, IdxFinancialSummaryLatest } from "../../types/market";
import { MetricSparkline } from "./metric-sparkline";

const LATEST_RATIOS: { key: keyof IdxFinancialSummaryLatest; label: string; suffix: string }[] = [
	{ key: "roe", label: "Return on Equity", suffix: "%" },
	{ key: "roa", label: "Return on Assets", suffix: "%" },
	{ key: "npm", label: "Net Profit Margin", suffix: "%" },
	{ key: "der", label: "Debt to Equity", suffix: "x" },
	{ key: "per", label: "Price to Earnings", suffix: "x" },
	{ key: "pbv", label: "Price to Book", suffix: "x" },
];

const SPARK_METRICS = [
	{ key: "roe" as const, label: "ROE", suffix: "%", color: "#17a568", type: "line" as const },
	{ key: "roa" as const, label: "ROA", suffix: "%", color: "#1d5fc9", type: "line" as const },
	{ key: "eps" as const, label: "EPS", suffix: "", color: "#ff8a2a", type: "bar" as const },
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
			<div className="rounded-[18px] border border-rule bg-card">
				<div className="border-b border-rule px-3 py-2">
					<h3 className="text-xs font-medium uppercase tracking-wider text-ink-2">
						Financial Ratios
					</h3>
					<span className="font-mono text-[11px] text-ink-4">
						Q{latest.period_quarter} {latest.period_year}
					</span>
				</div>
				<div className="grid grid-cols-2 gap-px bg-rule sm:grid-cols-3">
					{LATEST_RATIOS.map(({ key, label, suffix }) => {
						const value = latest[key] as number | null;
						return (
							<div key={key} className="bg-card px-3 py-3">
								<div className="font-mono text-[10px] uppercase tracking-wider text-ink-4">
									{key.toUpperCase()}
								</div>
								<div className="mt-1 font-mono text-sm font-medium text-ink">
									{value != null ? `${value.toFixed(2)}${suffix}` : "—"}
								</div>
								<div className="mt-0.5 text-[10px] text-ink-4">{label}</div>
							</div>
						);
					})}
				</div>
			</div>

			{sortedHistory.length > 1 && (
				<div className="rounded-[18px] border border-rule bg-card">
					<div className="border-b border-rule px-3 py-2">
						<h3 className="text-xs font-medium uppercase tracking-wider text-ink-2">
							Ratio History
						</h3>
						<span className="font-mono text-[11px] text-ink-4">
							{sortedHistory.length} quarters
						</span>
					</div>
					<div className="grid grid-cols-3 gap-px bg-rule">
						{SPARK_METRICS.map(({ key, label, suffix, color, type }) => {
							const vals = sortedHistory.map((h) => h[key]);
							const last = [...vals].reverse().find((v) => v != null);
							return (
								<div key={key} className="bg-card px-3 py-2.5">
									<div className="mb-1 flex items-baseline justify-between">
										<span className="font-mono text-[10px] uppercase tracking-wider text-ink-4">
											{label}
										</span>
										{last != null && (
											<span className="font-mono text-[11px] font-medium" style={{ color }}>
												{last.toFixed(1)}
												{suffix}
											</span>
										)}
									</div>
									<MetricSparkline data={vals} color={color} type={type} />
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
