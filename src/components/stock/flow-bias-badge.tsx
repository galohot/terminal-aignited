import { clsx } from "clsx";
import { useIdxForeignFlow } from "../../hooks/use-idx-company";
import { classifyForeignFlow, type FlowBias } from "../../lib/bandarmology";

interface FlowBiasBadgeProps {
	symbol: string;
}

const BIAS_STYLES: Record<
	FlowBias,
	{ label: string; badge: string; accent: string; arrow: string }
> = {
	StrongBuy: {
		label: "Strong Buy",
		badge: "bg-pos/15 text-pos border-pos/30",
		accent: "bg-pos",
		arrow: "▲▲",
	},
	Buy: {
		label: "Buy",
		badge: "bg-pos/10 text-pos border-pos/20",
		accent: "bg-pos",
		arrow: "▲",
	},
	Neutral: {
		label: "Neutral",
		badge: "bg-paper-2 text-ink-3 border-rule",
		accent: "bg-ink-4/40",
		arrow: "●",
	},
	Sell: {
		label: "Sell",
		badge: "bg-neg/10 text-neg border-neg/20",
		accent: "bg-neg",
		arrow: "▼",
	},
	StrongSell: {
		label: "Strong Sell",
		badge: "bg-neg/15 text-neg border-neg/30",
		accent: "bg-neg",
		arrow: "▼▼",
	},
};

function formatValue(v: number): string {
	const abs = Math.abs(v);
	const sign = v < 0 ? "-" : "";
	if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}T`;
	if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
	if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(0)}M`;
	return `${sign}${abs.toLocaleString()}`;
}

/**
 * Foreign-flow bias card for a stock page.
 * IDX-only — returns null for non-.JK symbols or when foreign flow data is missing.
 * Aggregates the last ~20 trading days and classifies into a 5-level bias.
 */
export function FlowBiasBadge({ symbol }: FlowBiasBadgeProps) {
	const isJK = symbol.endsWith(".JK");
	const kode = isJK ? symbol.replace(".JK", "") : "";
	const q = useIdxForeignFlow(kode, 20);

	if (!isJK || q.isLoading || q.error || !q.data) return null;
	const result = classifyForeignFlow(q.data);
	if (!result) return null;

	const style = BIAS_STYLES[result.bias];
	const ratioPct = (result.ratio * 100).toFixed(1);
	const netSign = result.netValue >= 0 ? "+" : "";

	return (
		<div className="mx-4 mt-3 flex items-stretch gap-3 rounded-[14px] border border-rule bg-card px-3 py-2.5">
			<div className="flex flex-col justify-center">
				<span className="font-mono text-[10px] text-ink-4 tracking-[0.14em] uppercase">
					Foreign Flow · {result.days}d
				</span>
				<div
					className={clsx(
						"mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] font-bold",
						style.badge,
					)}
				>
					<span>{style.arrow}</span>
					<span className="uppercase tracking-wider">{style.label}</span>
				</div>
			</div>
			<div className="flex-1 border-l border-rule pl-3">
				<div className="grid grid-cols-3 gap-3">
					<Stat
						label="Net"
						value={`${netSign}${formatValue(result.netValue)}`}
						tone={result.netValue >= 0 ? "pos" : "neg"}
					/>
					<Stat label="Buy" value={formatValue(result.buyValue)} />
					<Stat label="Sell" value={formatValue(result.sellValue)} />
				</div>
				<div className="mt-2 flex items-center gap-2">
					<div className="h-1 flex-1 overflow-hidden rounded-full bg-paper-2">
						<div
							className={clsx("h-full rounded-full", style.accent)}
							style={{ width: `${Math.min(Math.abs(result.ratio) * 100, 100)}%` }}
						/>
					</div>
					<span className="font-mono text-[10px] text-ink-4 tabular-nums">
						ratio {netSign}
						{ratioPct}%
					</span>
				</div>
			</div>
		</div>
	);
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
	return (
		<div>
			<div className="font-mono text-[9px] text-ink-4 tracking-[0.12em] uppercase">{label}</div>
			<div
				className={clsx(
					"mt-0.5 font-mono text-xs font-semibold tabular-nums",
					tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-ink",
				)}
			>
				{value}
			</div>
		</div>
	);
}
