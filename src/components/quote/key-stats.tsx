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
		["ROE", fin?.return_on_equity != null ? formatPercent(fin.return_on_equity * 100) : "—"],
		["Margin", fin?.profit_margin != null ? formatPercent(fin.profit_margin * 100) : "—"],
	];

	return (
		<div className="rounded-[18px] border border-rule bg-card">
			<div className="border-b border-rule px-3 py-2">
				<h3 className="text-xs font-medium uppercase tracking-wider text-ink-3">
					Key Stats
				</h3>
			</div>
			<div className="divide-y divide-rule">
				{stats.map(([label, value]) => (
					<div key={label} className="flex items-center justify-between px-3 py-1.5">
						<span className="text-xs text-ink-4">{label}</span>
						<span className="font-mono text-xs text-ink">{value}</span>
					</div>
				))}
			</div>
			{fundamentals?.earnings && (
				<>
					<div className="border-t border-rule px-3 py-2">
						<h3 className="text-xs font-medium uppercase tracking-wider text-ink-3">
							Earnings
						</h3>
					</div>
					<div className="divide-y divide-rule">
						<div className="flex items-center justify-between px-3 py-1.5">
							<span className="text-xs text-ink-4">Next</span>
							<span className="font-mono text-xs text-ink">
								{fundamentals.earnings.next_date}
							</span>
						</div>
						<div className="flex items-center justify-between px-3 py-1.5">
							<span className="text-xs text-ink-4">EPS Est</span>
							<span className="font-mono text-xs text-ink">
								{formatPrice(fundamentals.earnings.eps_estimate)}
							</span>
						</div>
						<div className="flex items-center justify-between px-3 py-1.5">
							<span className="text-xs text-ink-4">Rev Est</span>
							<span className="font-mono text-xs text-ink">
								{formatMarketCap(fundamentals.earnings.revenue_estimate)}
							</span>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
