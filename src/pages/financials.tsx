import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { StatementTable } from "../components/financials/statement-table";
import {
	type PeriodType,
	StatementTabs,
	type StatementType,
} from "../components/financials/statement-tabs";
import { Skeleton } from "../components/ui/loading";
import { useFinancials } from "../hooks/use-financials";
import { useQuote } from "../hooks/use-quote";

export function FinancialsPage() {
	const { symbol = "" } = useParams<{ symbol: string }>();
	const [searchParams, setSearchParams] = useSearchParams();

	const [type, setType] = useState<StatementType>(
		(searchParams.get("type") as StatementType) || "income",
	);
	const [period, setPeriod] = useState<PeriodType>(
		(searchParams.get("period") as PeriodType) || "annual",
	);

	const quote = useQuote(symbol);
	const financials = useFinancials(symbol, type, period);

	const handleTypeChange = (t: StatementType) => {
		setType(t);
		setSearchParams({ type: t, period });
	};

	const handlePeriodChange = (p: PeriodType) => {
		setPeriod(p);
		setSearchParams({ type, period: p });
	};

	return (
		<div>
			<div className="flex items-center gap-3 border-b border-t-border bg-t-surface px-4 py-3">
				<Link
					to={`/stock/${symbol}`}
					className="font-mono text-sm text-t-text-muted transition-colors hover:text-t-text-secondary"
				>
					←
				</Link>
				<span className="font-mono text-lg font-medium text-t-green">{symbol}</span>
				<span className="text-sm text-t-text-secondary">{quote.data?.name ?? ""} — Financials</span>
			</div>

			<StatementTabs
				type={type}
				period={period}
				onTypeChange={handleTypeChange}
				onPeriodChange={handlePeriodChange}
			/>

			{financials.isLoading ? (
				<div className="p-4">
					<Skeleton className="h-[400px] w-full" />
				</div>
			) : financials.error ? (
				<p className="p-8 text-center font-mono text-sm text-t-text-muted">
					Failed to load financial data
				</p>
			) : financials.data ? (
				<StatementTable type={type} data={financials.data.data} />
			) : null}
		</div>
	);
}
