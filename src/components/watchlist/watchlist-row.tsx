import { clsx } from "clsx";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { formatPercent, formatPrice, formatVolume } from "../../lib/format";
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
	const [flash, setFlash] = useState<"up" | "down" | null>(null);
	const prevPrice = useRef(quote.price);

	useEffect(() => {
		if (quote.price !== prevPrice.current) {
			setFlash(quote.price > prevPrice.current ? "up" : "down");
			prevPrice.current = quote.price;
			const timeout = setTimeout(() => setFlash(null), 600);
			return () => clearTimeout(timeout);
		}
	}, [quote.price]);

	const rowFlash = flash === "up" ? "bg-t-green/10" : flash === "down" ? "bg-t-red/10" : "";

	return (
		<tr
			className={clsx(
				"cursor-pointer border-b border-white/8 transition-colors hover:bg-white/[0.04]",
				selected && "bg-white/[0.05]",
				rowFlash,
			)}
			onClick={() => navigate(`/stock/${quote.symbol}`)}
		>
			<td className="px-4 py-3 align-top">
				<div className="font-mono text-xs font-semibold text-t-green">{quote.symbol}</div>
				<div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-t-text-muted">
					{quote.exchange || quote.currency || "Market"}
				</div>
			</td>
			<td className="max-w-[260px] px-4 py-3 align-top text-sm text-t-text-secondary">
				<div className="truncate">{quote.name}</div>
			</td>
			<td className="px-4 py-3 text-right align-top font-mono text-sm text-white">
				{formatPrice(quote.price, quote.currency)}
			</td>
			<td className={`px-4 py-3 text-right align-top font-mono text-sm ${changeColor}`}>
				{formatPercent(quote.change_percent)}
			</td>
			<td className="px-4 py-3 text-right align-top font-mono text-xs text-t-text-secondary">
				{quote.volume ? formatVolume(quote.volume) : "—"}
			</td>
			<td className="px-4 py-3">
				<div className="h-10 min-w-[110px]">
					<Sparkline symbol={quote.symbol} positive={isPositive} />
				</div>
			</td>
			<td className="px-4 py-3 text-right align-top">
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						onRemove(quote.symbol);
					}}
					className="rounded-full p-1 text-t-text-muted transition-colors hover:bg-white/10 hover:text-t-red"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			</td>
		</tr>
	);
}
