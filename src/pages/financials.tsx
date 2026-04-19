import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { StatementTable } from "../components/financials/statement-table";
import {
	type PeriodType,
	StatementTabs,
	type StatementType,
} from "../components/financials/statement-tabs";
import { Skeleton } from "../components/ui/loading";
import { useFinancials } from "../hooks/use-financials";
import { useKeyboardShortcut } from "../hooks/use-keyboard";
import { usePageTitle } from "../hooks/use-page-title";
import { useQuote } from "../hooks/use-quote";
import { useRealtimeSubscription } from "../hooks/use-realtime";
import { formatPercent, formatPrice } from "../lib/format";
import { useRealtimeStore } from "../stores/realtime-store";

export function FinancialsPage() {
	const { symbol = "" } = useParams<{ symbol: string }>();
	usePageTitle(symbol ? `${symbol} Financials` : "Financials");
	const [searchParams, setSearchParams] = useSearchParams();

	const [type, setType] = useState<StatementType>(
		(searchParams.get("type") as StatementType) || "income",
	);
	const [period, setPeriod] = useState<PeriodType>(
		(searchParams.get("period") as PeriodType) || "annual",
	);

	const quote = useQuote(symbol);
	const financials = useFinancials(symbol, type, period);

	// Subscribe to realtime updates
	const symbolList = useMemo(() => [symbol], [symbol]);
	useRealtimeSubscription(symbolList);
	const realtimePrice = useRealtimeStore((s) => s.prices[symbol]);

	const handleTypeChange = (t: StatementType) => {
		setType(t);
		setSearchParams({ type: t, period });
	};

	const handlePeriodChange = (p: PeriodType) => {
		setPeriod(p);
		setSearchParams({ type, period: p });
	};

	// Keyboard shortcuts
	useKeyboardShortcut("i", () => handleTypeChange("income"), [period]);
	useKeyboardShortcut("b", () => handleTypeChange("balance"), [period]);
	useKeyboardShortcut("c", () => handleTypeChange("cashflow"), [period]);
	useKeyboardShortcut("a", () => handlePeriodChange("annual"), [type]);
	useKeyboardShortcut("q", () => handlePeriodChange("quarterly"), [type]);

	const livePrice = realtimePrice?.price ?? quote.data?.price;
	const liveChange = realtimePrice?.changePercent ?? quote.data?.change_percent;

	return (
		<div>
			<div className="flex items-center gap-3 border-b border-rule bg-card px-4 py-3">
				<Link
					to={`/stock/${symbol}`}
					className="font-mono text-sm text-ink-4 transition-colors hover:text-ember-700"
				>
					←
				</Link>
				<span className="font-mono text-lg font-semibold text-ember-600">{symbol}</span>
				<span className="text-sm text-ink-3">{quote.data?.name ?? ""} — Financials</span>
				{livePrice != null && (
					<span className="ml-auto font-mono text-sm text-ink">
						{formatPrice(livePrice, quote.data?.currency)}
					</span>
				)}
				{liveChange != null && (
					<span className={`font-mono text-sm ${liveChange >= 0 ? "text-pos" : "text-neg"}`}>
						{formatPercent(liveChange)}
					</span>
				)}
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
				<p className="p-8 text-center font-mono text-sm text-ink-4">
					Failed to load financial data
				</p>
			) : financials.data ? (
				<StatementTable type={type} data={financials.data.data} />
			) : null}
		</div>
	);
}
