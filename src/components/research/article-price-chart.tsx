import { Link } from "react-router";
import { useHistory } from "../../hooks/use-history";
import { PriceChart } from "../charts/price-chart";
import { Skeleton } from "../ui/loading";

interface ArticlePriceChartProps {
	ticker: string;
}

export function ArticlePriceChart({ ticker }: ArticlePriceChartProps) {
	const symbol = ticker.endsWith(".JK") ? ticker : `${ticker}.JK`;
	const history = useHistory(symbol, "6mo", "1d");

	if (history.isLoading) {
		return <Skeleton className="my-6 h-[260px] w-full rounded-lg" />;
	}
	const bars = history.data?.data ?? [];
	if (bars.length < 20) return null;

	const displayTicker = ticker.replace(/\.JK$/i, "");

	return (
		<div className="my-6 rounded-lg border border-rule bg-paper-2 p-3">
			<div className="mb-2 flex items-center justify-between">
				<div className="font-mono text-[11px] text-ink-3 tracking-[0.18em] uppercase">
					{displayTicker} · 6-month price
				</div>
				<Link
					to={`/stock/${symbol}`}
					className="font-mono text-[10px] text-ember-600 tracking-[0.14em] uppercase hover:text-ember-700"
				>
					View full chart →
				</Link>
			</div>
			<PriceChart data={bars} height={220} />
		</div>
	);
}
