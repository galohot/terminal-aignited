import { useMarkets } from "../../hooks/use-markets";
import { formatTime } from "../../lib/format";
import { MarketGridSkeleton } from "../ui/loading";
import { CategoryPanel, IndexPanel } from "./category-panel";

export function MarketGrid() {
	const { data, isLoading, error, refetch } = useMarkets();

	if (isLoading) return <MarketGridSkeleton />;

	if (error) {
		const is503 = error.message.includes("503");
		return (
			<div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
				<p className="font-mono text-sm text-t-text-secondary">
					{is503 ? "Market data loading, please wait..." : "Markets unavailable"}
				</p>
				{!is503 && (
					<button
						type="button"
						onClick={() => refetch()}
						className="rounded border border-t-border bg-t-surface px-3 py-1 font-mono text-xs text-t-text-secondary transition-colors hover:bg-t-hover"
					>
						Retry
					</button>
				)}
			</div>
		);
	}

	if (!data) return null;

	return (
		<div className="p-4">
			<div className="mb-2 flex items-center justify-between px-1">
				<h2 className="font-mono text-xs font-medium uppercase tracking-wider text-t-text-muted">
					Markets Overview
				</h2>
				<span className="font-mono text-[10px] text-t-text-muted">
					Updated {formatTime(data.updated_at)} UTC
				</span>
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				<IndexPanel indices={data.indices} />
				<div className="flex flex-col gap-4">
					<CategoryPanel title="Commodities" quotes={data.commodities} />
					<CategoryPanel title="Crypto" quotes={data.crypto} />
				</div>
				<CategoryPanel title="Forex" quotes={data.forex} />
			</div>
		</div>
	);
}
