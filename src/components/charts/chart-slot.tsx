import { useState } from "react";
import { useHistory } from "../../hooks/use-history";
import { useQuote } from "../../hooks/use-quote";
import { DEFAULT_PERIOD_INDEX, PERIOD_OPTIONS } from "../../lib/constants";
import { formatPercent, formatPrice } from "../../lib/format";
import { Skeleton } from "../ui/loading";
import { ChartToolbar } from "./chart-toolbar";
import { PriceChart } from "./price-chart";
import { SymbolPicker } from "./symbol-picker";

interface ChartSlotProps {
	symbol: string;
	onSymbolChange: (symbol: string) => void;
	compact?: boolean;
}

export function ChartSlot({ symbol, onSymbolChange, compact = false }: ChartSlotProps) {
	const [periodIndex, setPeriodIndex] = useState(DEFAULT_PERIOD_INDEX);
	const selected = PERIOD_OPTIONS[periodIndex];
	const quote = useQuote(symbol);
	const history = useHistory(symbol, selected.period, selected.interval);

	if (!symbol) {
		return (
			<div className="flex h-full items-center justify-center border border-t-border bg-t-bg">
				<SymbolPicker onSelect={onSymbolChange} />
			</div>
		);
	}

	const q = quote.data;
	const changeColor = q && q.change >= 0 ? "text-t-green" : "text-t-red";

	return (
		<div className="flex h-full flex-col border border-t-border bg-t-bg">
			<div className="flex items-center justify-between border-b border-t-border px-3 py-1.5">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => onSymbolChange("")}
						className="font-mono text-xs font-medium text-t-green hover:underline"
					>
						{symbol}
					</button>
					{q && (
						<>
							<span className="font-mono text-xs text-t-text">
								{formatPrice(q.price, q.currency)}
							</span>
							<span className={`font-mono text-xs ${changeColor}`}>
								{formatPercent(q.change_percent)}
							</span>
						</>
					)}
				</div>
			</div>
			{!compact && <ChartToolbar selectedIndex={periodIndex} onSelect={setPeriodIndex} />}
			<div className="flex-1">
				{history.isLoading ? (
					<Skeleton className="h-full w-full" />
				) : history.data ? (
					<PriceChart data={history.data.data} height={compact ? 200 : undefined} />
				) : null}
			</div>
		</div>
	);
}
