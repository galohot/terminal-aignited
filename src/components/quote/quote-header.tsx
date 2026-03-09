import { formatPercent, formatPrice } from "../../lib/format";
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

	return (
		<div className="border-b border-t-border bg-t-surface px-4 py-3">
			<div className="flex flex-wrap items-baseline gap-3">
				<span className="font-mono text-lg font-medium text-t-green">{quote.symbol}</span>
				<span className="text-sm text-t-text-secondary">{quote.name}</span>
				<span className="font-mono text-2xl font-medium text-t-text">
					{formatPrice(quote.price, quote.currency)}
				</span>
				<span className={`font-mono text-sm ${changeColor}`}>
					{arrow} {formatPrice(Math.abs(quote.change), quote.currency)} (
					{formatPercent(quote.change_percent)})
				</span>
				<span className="font-mono text-xs text-t-text-muted">
					{quote.exchange} | {quote.currency}
				</span>
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
