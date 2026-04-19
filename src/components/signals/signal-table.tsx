import { clsx } from "clsx";
import type { ConsensusSignal } from "../../hooks/use-consensus";

interface Props {
	title: string;
	data: ConsensusSignal[];
	isLoading: boolean;
	colorClass: string;
	barColor: string;
	onSelect: (ticker: string) => void;
}

export function SignalTable({ title, data, isLoading, colorClass, onSelect }: Props) {
	return (
		<div className="rounded-[18px] border border-rule bg-card">
			<div className="border-b border-rule px-4 py-3">
				<h2 className={clsx("font-mono text-sm font-semibold", colorClass)}>{title}</h2>
			</div>
			<div className="max-h-[400px] overflow-y-auto">
				{isLoading ? (
					<div className="space-y-2 p-4">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="h-10 animate-pulse rounded bg-paper-2" />
						))}
					</div>
				) : data.length === 0 ? (
					<div className="p-8 text-center font-mono text-xs text-ink-4">No signals</div>
				) : (
					<div className="divide-y divide-rule">
						{data.map((item) => {
							const total = (item.bullish || 0) + (item.bearish || 0) + (item.neutral || 0);
							const bullPct = total > 0 ? ((item.bullish || 0) / total) * 100 : 0;
							const bearPct = total > 0 ? ((item.bearish || 0) / total) * 100 : 0;

							return (
								<button
									type="button"
									key={item.ticker}
									onClick={() => onSelect(item.ticker)}
									className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-paper-2/60"
								>
									<span className="w-16 font-mono text-sm font-bold text-ember-600">
										{item.ticker}
									</span>
									<span
										className={clsx(
											"rounded-full px-2 py-0.5 font-mono text-[10px] uppercase",
											item.consensus === "strong_buy" && "bg-pos/15 text-pos",
											item.consensus === "buy" && "bg-pos/10 text-pos",
											item.consensus === "sell" && "bg-neg/10 text-neg",
											item.consensus === "strong_sell" && "bg-neg/15 text-neg",
											item.consensus === "neutral" && "bg-paper-2 text-ink-3",
										)}
									>
										{item.consensus.replace("_", " ")}
									</span>
									<span className={clsx("font-mono text-xs", colorClass)}>
										{item.score > 0 ? "+" : ""}
										{item.score.toFixed(3)}
									</span>
									<div className="ml-auto flex h-2 w-24 overflow-hidden rounded-full bg-paper-2">
										<div style={{ width: `${bullPct}%` }} className="bg-pos" />
										<div style={{ width: `${bearPct}%` }} className="bg-neg" />
									</div>
									<span className="font-mono text-[10px] text-ink-4">
										{item.bullish}/{item.bearish}/{item.neutral}
									</span>
								</button>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
