import { clsx } from "clsx";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { formatPercent, formatPrice } from "../../lib/format";
import type { Quote } from "../../types/market";
import { Sparkline } from "../charts/sparkline";

interface WatchlistRowProps {
	quote: Quote;
	onRemove: (symbol: string) => void;
	selected?: boolean;
}

export function WatchlistRow({ quote, onRemove, selected = false }: WatchlistRowProps) {
	const navigate = useNavigate();
	const isPositive = quote.change >= 0;
	const changeColor = isPositive ? "text-t-green" : "text-t-red";

	// Flash on price change
	const [flash, setFlash] = useState<"up" | "down" | null>(null);
	const prevPrice = useRef(quote.price);

	useEffect(() => {
		if (quote.price !== prevPrice.current) {
			setFlash(quote.price > prevPrice.current ? "up" : "down");
			prevPrice.current = quote.price;
			const t = setTimeout(() => setFlash(null), 600);
			return () => clearTimeout(t);
		}
	}, [quote.price]);

	const rowFlash = flash === "up" ? "bg-t-green/10" : flash === "down" ? "bg-t-red/10" : "";

	return (
		<tr
			className={clsx(
				"cursor-pointer border-b border-t-border transition-colors hover:bg-t-hover",
				selected && "bg-t-hover",
				rowFlash,
			)}
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
			<td className="px-3 py-2">
				<Sparkline symbol={quote.symbol} positive={isPositive} />
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
