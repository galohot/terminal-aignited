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
		<div className="flex flex-wrap items-center gap-4 border-b border-rule bg-card px-4 py-2">
			<div className="flex gap-1">
				{STATEMENT_TYPES.map((st) => (
					<button
						key={st.key}
						type="button"
						onClick={() => onTypeChange(st.key)}
						className={clsx(
							"rounded-full border px-3 py-1 font-mono text-xs transition-colors",
							type === st.key
								? "border-ink bg-ink text-paper"
								: "border-rule bg-card text-ink-3 hover:bg-paper-2 hover:text-ink",
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
							"rounded-full border px-3 py-1 font-mono text-xs transition-colors",
							period === p.key
								? "border-ember-400/40 bg-ember-50 text-ember-700"
								: "border-rule bg-card text-ink-3 hover:bg-paper-2 hover:text-ink",
						)}
					>
						{p.label}
					</button>
				))}
			</div>
		</div>
	);
}
