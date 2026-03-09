import { clsx } from "clsx";

const STATEMENT_TYPES = [
	{ key: "income", label: "Income Statement" },
	{ key: "balance", label: "Balance Sheet" },
	{ key: "cashflow", label: "Cash Flow" },
] as const;

const PERIODS = [
	{ key: "annual", label: "Annual" },
	{ key: "quarterly", label: "Quarterly" },
] as const;

export type StatementType = (typeof STATEMENT_TYPES)[number]["key"];
export type PeriodType = (typeof PERIODS)[number]["key"];

interface StatementTabsProps {
	type: StatementType;
	period: PeriodType;
	onTypeChange: (type: StatementType) => void;
	onPeriodChange: (period: PeriodType) => void;
}

export function StatementTabs({ type, period, onTypeChange, onPeriodChange }: StatementTabsProps) {
	return (
		<div className="flex flex-wrap items-center gap-4 border-b border-t-border px-4 py-2">
			<div className="flex gap-1">
				{STATEMENT_TYPES.map((st) => (
					<button
						key={st.key}
						type="button"
						onClick={() => onTypeChange(st.key)}
						className={clsx(
							"rounded px-2.5 py-1 font-mono text-xs transition-colors",
							type === st.key
								? "bg-t-border-active text-t-text"
								: "text-t-text-muted hover:bg-t-hover hover:text-t-text-secondary",
						)}
					>
						{st.label}
					</button>
				))}
			</div>
			<div className="flex gap-1">
				{PERIODS.map((p) => (
					<button
						key={p.key}
						type="button"
						onClick={() => onPeriodChange(p.key)}
						className={clsx(
							"rounded px-2 py-1 font-mono text-xs transition-colors",
							period === p.key
								? "bg-t-border-active text-t-text"
								: "text-t-text-muted hover:bg-t-hover hover:text-t-text-secondary",
						)}
					>
						{p.label}
					</button>
				))}
			</div>
		</div>
	);
}
