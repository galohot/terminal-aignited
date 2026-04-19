import { clsx } from "clsx";
import { X } from "lucide-react";
import { useConsensusDetail } from "../../hooks/use-consensus";

interface Props {
	ticker: string;
	onClose: () => void;
}

export function TickerDetail({ ticker, onClose }: Props) {
	const { data, isLoading } = useConsensusDetail(ticker);

	return (
		<div className="rounded-[18px] border border-rule bg-card p-4">
			<div className="mb-4 flex items-center justify-between">
				<div>
					<h3 className="font-mono text-lg font-bold text-ember-600">
						{data?.ticker?.replace(".JK", "") || ticker}
					</h3>
					<div className="mt-1 flex items-center gap-2">
						<span
							className={clsx(
								"rounded-full px-2 py-0.5 font-mono text-[10px] uppercase",
								data?.consensus === "strong_buy" && "bg-pos/15 text-pos",
								data?.consensus === "buy" && "bg-pos/10 text-pos",
								data?.consensus === "sell" && "bg-neg/10 text-neg",
								data?.consensus === "strong_sell" && "bg-neg/15 text-neg",
								data?.consensus === "neutral" && "bg-paper-2 text-ink-3",
							)}
						>
							{data?.consensus?.replace("_", " ") || "loading..."}
						</span>
						<span className="font-mono text-xs text-ink-4">
							Score:{" "}
							{data?.score !== undefined
								? (data.score > 0 ? "+" : "") + data.score.toFixed(3)
								: "..."}
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="rounded-full p-1 text-ink-4 transition-colors hover:bg-paper-2 hover:text-ink"
				>
					<X className="h-5 w-5" />
				</button>
			</div>

			{isLoading ? (
				<div className="space-y-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="h-8 animate-pulse rounded bg-paper-2" />
					))}
				</div>
			) : (
				<div className="divide-y divide-rule">
					{data?.strategies?.map((s) => {
						const dotColor =
							s.signal === "bullish"
								? "bg-pos"
								: s.signal === "bearish"
									? "bg-neg"
									: "bg-ink-4/40";
						return (
							<div key={s.strategy} className="flex items-center gap-3 py-2">
								<span className={clsx("h-2 w-2 flex-none rounded-full", dotColor)} />
								<span className="w-44 font-mono text-xs text-ink-3">
									{s.strategy.replace(/_/g, " ")}
								</span>
								<div className="h-1.5 w-20 overflow-hidden rounded-full bg-paper-2">
									<div
										style={{ width: `${(s.strength || 0) * 100}%` }}
										className={clsx(
											"h-full rounded-full",
											s.signal === "bullish" && "bg-pos",
											s.signal === "bearish" && "bg-neg",
											s.signal === "neutral" && "bg-ink-4/40",
										)}
									/>
								</div>
								<span className="flex-1 font-mono text-xs text-ink-4">{s.reason}</span>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
