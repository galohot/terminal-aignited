import { formatMarketCap } from "../../lib/format";
import type { StatementType } from "./statement-tabs";

interface YahooField {
	raw?: number;
	fmt?: string | null;
}

type StatementEntry = Record<string, YahooField | { fmt?: string }>;

interface StatementTableProps {
	type: StatementType;
	data: Record<string, unknown>;
}

const LINE_ITEMS: Record<StatementType, { section: string; items: [string, string][] }[]> = {
	income: [
		{
			section: "Revenue",
			items: [
				["totalRevenue", "Total Revenue"],
				["costOfRevenue", "Cost of Revenue"],
				["grossProfit", "Gross Profit"],
			],
		},
		{
			section: "Expenses",
			items: [
				["totalOperatingExpenses", "Operating Expenses"],
				["operatingIncome", "Operating Income"],
				["interestExpense", "Interest Expense"],
				["otherIncomeExpenseNet", "Other Income"],
			],
		},
		{
			section: "Profitability",
			items: [
				["incomeBeforeTax", "Income Before Tax"],
				["incomeTaxExpense", "Income Tax"],
				["netIncome", "Net Income"],
			],
		},
	],
	balance: [
		{
			section: "Assets",
			items: [
				["totalAssets", "Total Assets"],
				["totalCurrentAssets", "Total Current Assets"],
				["cash", "Cash & Equivalents"],
				["shortTermInvestments", "Short-term Investments"],
			],
		},
		{
			section: "Liabilities",
			items: [
				["totalLiab", "Total Liabilities"],
				["totalCurrentLiabilities", "Total Current Liabilities"],
				["longTermDebt", "Long-term Debt"],
			],
		},
		{
			section: "Equity",
			items: [["totalStockholderEquity", "Stockholders' Equity"]],
		},
	],
	cashflow: [
		{
			section: "Operating",
			items: [
				["totalCashFromOperatingActivities", "Operating Cash Flow"],
				["capitalExpenditures", "Capital Expenditures"],
			],
		},
		{
			section: "Financing",
			items: [
				["dividendsPaid", "Dividends Paid"],
				["repurchaseOfStock", "Stock Buyback"],
			],
		},
		{
			section: "Summary",
			items: [["changeInCash", "Net Change in Cash"]],
		},
	],
};

const DATA_KEYS: Record<StatementType, string> = {
	income: "incomeStatementHistory",
	balance: "balanceSheetHistory",
	cashflow: "cashflowStatementHistory",
};

function getFieldValue(entry: StatementEntry, field: string): string {
	const val = entry[field] as YahooField | undefined;
	if (!val) return "—";
	if (val.fmt) return val.fmt;
	if (val.raw != null) return formatMarketCap(val.raw);
	return "—";
}

function isNegative(entry: StatementEntry, field: string): boolean {
	const val = entry[field] as YahooField | undefined;
	return val?.raw != null && val.raw < 0;
}

export function StatementTable({ type, data }: StatementTableProps) {
	const dataKey = DATA_KEYS[type];
	const entries = (data[dataKey] ?? data[`${dataKey}Quarterly`] ?? []) as StatementEntry[];

	if (!entries.length) {
		return <p className="p-8 text-center font-mono text-sm text-ink-4">No data available</p>;
	}

	const periods = entries.map((e) => (e.endDate as { fmt?: string })?.fmt ?? "—");
	const sections = LINE_ITEMS[type];

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-xs">
				<thead>
					<tr className="border-b border-rule bg-paper-2">
						<th className="px-3 py-2 text-left font-medium text-ink-3" />
						{periods.map((p) => (
							<th
								key={p}
								className="min-w-[110px] px-3 py-2 text-right font-mono font-medium text-ink-3"
							>
								{p}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{sections.map((section) => (
						<>
							<tr key={`section-${section.section}`}>
								<td
									colSpan={periods.length + 1}
									className="border-b border-rule bg-paper-2/60 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ember-700"
								>
									{section.section}
								</td>
							</tr>
							{section.items.map(([field, label]) => (
								<tr
									key={field}
									className="border-b border-rule transition-colors hover:bg-paper-2/60"
								>
									<td className="px-3 py-1.5 text-ink-3">{label}</td>
									{entries.map((entry, i) => (
										<td
											key={periods[i]}
											className={`px-3 py-1.5 text-right font-mono ${
												isNegative(entry, field) ? "text-neg" : "text-ink"
											}`}
										>
											{getFieldValue(entry, field)}
										</td>
									))}
								</tr>
							))}
						</>
					))}
				</tbody>
			</table>
		</div>
	);
}
