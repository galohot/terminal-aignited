import { formatMarketCap, formatPercent, formatPrice, formatVolume } from "../../lib/format";
import type { Fundamentals, Quote } from "../../types/market";

interface KeyStatsProps {
	quote: Quote;
	fundamentals?: Fundamentals;
}

export function KeyStats({ quote, fundamentals }: KeyStatsProps) {
	const fin = fundamentals?.financials;

	const stats: [string, string][] = [
		["P/E", quote.pe_ratio != null ? quote.pe_ratio.toFixed(2) : "—"],
		["Fwd P/E", fin?.forward_pe != null ? fin.forward_pe.toFixed(2) : "—"],
		["EPS", fin?.eps != null ? formatPrice(fin.eps) : "—"],
		["Mkt Cap", formatMarketCap(quote.market_cap)],
		["Div Yield", quote.dividend_yield != null ? formatPercent(quote.dividend_yield * 100) : "—"],
		["52W H", formatPrice(quote.fifty_two_week_high, quote.currency)],
		["52W L", formatPrice(quote.fifty_two_week_low, quote.currency)],
		["Volume", formatVolume(quote.volume)],
		["P/B", fin?.price_to_book != null ? fin.price_to_book.toFixed(2) : "—"],
		["D/E", fin?.debt_to_equity != null ? fin.debt_to_equity.toFixed(2) : "—"],
		["ROE", fin?.roe != null ? formatPercent(fin.roe * 100) : "—"],
		["ROA", fin?.roa != null ? formatPercent(fin.roa * 100) : "—"],
	];

	return (
		<div className="rounded border border-t-border bg-t-surface">
			<div className="border-b border-t-border px-3 py-2">
				<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
					Key Stats
				</h3>
			</div>
			<div className="divide-y divide-t-border">
				{stats.map(([label, value]) => (
					<div key={label} className="flex items-center justify-between px-3 py-1.5">
						<span className="text-xs text-t-text-muted">{label}</span>
						<span className="font-mono text-xs text-t-text">{value}</span>
					</div>
				))}
			</div>
			{fundamentals?.earnings && (
				<>
					<div className="border-t border-t-border px-3 py-2">
						<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
							Earnings
						</h3>
					</div>
					<div className="divide-y divide-t-border">
						<div className="flex items-center justify-between px-3 py-1.5">
							<span className="text-xs text-t-text-muted">Next</span>
							<span className="font-mono text-xs text-t-text">
								{fundamentals.earnings.next_date}
							</span>
						</div>
						<div className="flex items-center justify-between px-3 py-1.5">
							<span className="text-xs text-t-text-muted">EPS Est</span>
							<span className="font-mono text-xs text-t-text">
								{formatPrice(fundamentals.earnings.eps_estimate)}
							</span>
						</div>
						<div className="flex items-center justify-between px-3 py-1.5">
							<span className="text-xs text-t-text-muted">Rev Est</span>
							<span className="font-mono text-xs text-t-text">
								{formatMarketCap(fundamentals.earnings.revenue_estimate)}
							</span>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
