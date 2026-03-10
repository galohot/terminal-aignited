import { useEffect, useRef, useState } from "react";
import { formatPercent, formatPrice } from "../../lib/format";
import { useRealtimeStore } from "../../stores/realtime-store";
import type { Quote } from "../../types/market";

const marketStateBadge: Record<string, { label: string; color: string }> = {
	REGULAR: { label: "Open", color: "text-t-green" },
	CLOSED: { label: "Closed", color: "text-t-text-muted" },
	PRE: { label: "Pre-Market", color: "text-t-amber" },
	PREPRE: { label: "Pre-Market", color: "text-t-amber" },
	POST: { label: "Post-Market", color: "text-t-amber" },
	POSTPOST: { label: "Post-Market", color: "text-t-amber" },
};

export function QuoteHeader({ quote }: { quote: Quote }) {
	const isPositive = quote.change >= 0;
	const changeColor = isPositive ? "text-t-green" : "text-t-red";
	const arrow = isPositive ? "▲" : "▼";
	const badge = marketStateBadge[quote.market_state ?? ""] ?? {
		label: quote.market_state ?? "",
		color: "text-t-text-muted",
	};
	const wsStatus = useRealtimeStore((s) => s.status);
	const isLive = wsStatus === "connected";

	// Flash effect on price change
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

	const flashClass =
		flash === "up"
			? "animate-pulse text-t-green"
			: flash === "down"
				? "animate-pulse text-t-red"
				: "text-t-text";

	return (
		<div className="border-b border-t-border bg-t-surface px-4 py-3">
			<div className="flex flex-wrap items-baseline gap-3">
				<span className="font-mono text-lg font-medium text-t-green">{quote.symbol}</span>
				<span className="text-sm text-t-text-secondary">{quote.name}</span>
				<span
					className={`font-mono text-2xl font-medium transition-colors duration-300 ${flashClass}`}
				>
					{formatPrice(quote.price, quote.currency)}
				</span>
				<span className={`font-mono text-sm ${changeColor}`}>
					{arrow} {formatPrice(Math.abs(quote.change), quote.currency)} (
					{formatPercent(quote.change_percent)})
				</span>
				<span className="font-mono text-xs text-t-text-muted">
					{quote.exchange} | {quote.currency}
				</span>
				{isLive && (
					<span className="inline-flex items-center gap-1 rounded-full border border-t-green/30 bg-t-green/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-t-green">
						<span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-t-green" />
						Live
					</span>
				)}
			</div>
			<div className="mt-1 flex flex-wrap items-center gap-4 font-mono text-xs text-t-text-muted">
				{badge.label && <span className={badge.color}>Market: {badge.label}</span>}
				<span>Open: {formatPrice(quote.open, quote.currency)}</span>
				<span>High: {formatPrice(quote.high, quote.currency)}</span>
				<span>Low: {formatPrice(quote.low, quote.currency)}</span>
			</div>
		</div>
	);
}
