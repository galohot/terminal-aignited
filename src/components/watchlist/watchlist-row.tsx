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
	const changeColor = isPositive ? "text-pos" : "text-neg";
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

	const rowFlash = flash === "up" ? "bg-pos/10" : flash === "down" ? "bg-neg/10" : "";

	return (
		<tr
			role="link"
			tabIndex={0}
			aria-label={`Open ${quote.symbol} ${quote.name}`}
			className={clsx(
				"cursor-pointer border-b border-rule transition-colors hover:bg-paper-2/60 focus:bg-paper-2 focus:outline-none focus:ring-1 focus:ring-ember-400",
				selected && "bg-paper-2",
				rowFlash,
			)}
			onClick={() => navigate(`/stock/${quote.symbol}`)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					navigate(`/stock/${quote.symbol}`);
				}
			}}
		>
			<td className="px-4 py-3 align-top">
				<div className="font-mono text-xs font-semibold text-ember-600">{quote.symbol}</div>
				<div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4">
					{quote.exchange || quote.currency || "Market"}
				</div>
			</td>
			<td className="max-w-[260px] px-4 py-3 align-top text-sm text-ink-3">
				<div className="truncate">{quote.name}</div>
			</td>
			<td className="px-4 py-3 text-right align-top font-mono text-sm text-ink">
				{formatPrice(quote.price, quote.currency)}
			</td>
			<td className={`px-4 py-3 text-right align-top font-mono text-sm ${changeColor}`}>
				{formatPercent(quote.change_percent)}
			</td>
			<td className="px-4 py-3 text-right align-top font-mono text-xs text-ink-3">
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
					className="rounded-full p-1 text-ink-4 transition-colors hover:bg-neg/10 hover:text-neg"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			</td>
		</tr>
	);
}
