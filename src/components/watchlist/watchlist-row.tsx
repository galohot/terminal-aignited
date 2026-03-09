import { X } from "lucide-react";
import { useNavigate } from "react-router";
import { formatPercent, formatPrice } from "../../lib/format";
import type { Quote } from "../../types/market";

interface WatchlistRowProps {
	quote: Quote;
	onRemove: (symbol: string) => void;
}

export function WatchlistRow({ quote, onRemove }: WatchlistRowProps) {
	const navigate = useNavigate();
	const isPositive = quote.change >= 0;
	const changeColor = isPositive ? "text-t-green" : "text-t-red";

	return (
		<tr
			className="cursor-pointer border-b border-t-border transition-colors hover:bg-t-hover"
			onClick={() => navigate(`/stock/${quote.symbol}`)}
		>
			<td className="px-3 py-2 font-mono text-xs font-medium text-t-green">{quote.symbol}</td>
			<td className="max-w-[200px] truncate px-3 py-2 text-xs text-t-text-secondary">
				{quote.name}
			</td>
			<td className="px-3 py-2 text-right font-mono text-xs text-t-text">
				{formatPrice(quote.price, quote.currency)}
			</td>
			<td className={`px-3 py-2 text-right font-mono text-xs ${changeColor}`}>
				{formatPercent(quote.change_percent)}
			</td>
			<td className="px-3 py-2 text-right">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove(quote.symbol);
					}}
					className="rounded p-0.5 text-t-text-muted transition-colors hover:bg-t-border hover:text-t-red"
				>
					<X className="h-3 w-3" />
				</button>
			</td>
		</tr>
	);
}
