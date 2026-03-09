import { useNavigate } from "react-router";
import { formatPercent, formatPrice } from "../../lib/format";
import type { Quote } from "../../types/market";

export function TickerCard({ quote }: { quote: Quote }) {
	const navigate = useNavigate();
	const isPositive = quote.change >= 0;
	const changeColor = isPositive ? "text-t-green" : "text-t-red";

	return (
		<button
			type="button"
			onClick={() => navigate(`/stock/${quote.symbol}`)}
			className="flex w-full items-center justify-between border-b border-t-border px-3 py-1.5 text-left transition-colors hover:bg-t-hover"
		>
			<div className="min-w-0 flex-1">
				<span className="font-mono text-xs font-medium text-t-green">{quote.symbol}</span>
				<span className="ml-2 truncate text-xs text-t-text-secondary">{quote.name}</span>
			</div>
			<div className="flex shrink-0 items-center gap-3 font-mono text-xs">
				<span className="text-t-text">{formatPrice(quote.price, quote.currency)}</span>
				<span className={`w-16 text-right ${changeColor}`}>
					{formatPercent(quote.change_percent)}
				</span>
			</div>
		</button>
	);
}
