import { clsx } from "clsx";
import { useIdxBrokerSummary } from "../../hooks/use-idx-company";
import { analyzeConcentration, type ConcentrationKind } from "../../lib/bandarmology";

interface ConcentrationBadgeProps {
	symbol: string;
}

const KIND_STYLES: Record<
	ConcentrationKind,
	{ label: string; badge: string; accent: string; dot: string }
> = {
	concentrated: {
		label: "Concentrated",
		badge: "bg-ember-50 text-ember-700 border-ember-500/30",
		accent: "bg-ember-500",
		dot: "◼",
	},
	moderate: {
		label: "Moderate",
		badge: "bg-paper-2 text-ink-2 border-rule",
		accent: "bg-ink-3",
		dot: "◆",
	},
	diffuse: {
		label: "Diffuse",
		badge: "bg-emerald-50 text-emerald-700 border-emerald-500/30",
		accent: "bg-emerald-500",
		dot: "◯",
	},
};

/**
 * Broker concentration badge for the stock page.
 * IDX-only. Reads the most recent broker_summary snapshot and flags
 * whether today's tape is controlled by a handful of houses vs spread.
 * Data-gap note: true accumulation/distribution (buy/sell split) needs
 * the GetStockSummary scraper migration — see v2_05 audit doc.
 */
export function ConcentrationBadge({ symbol }: ConcentrationBadgeProps) {
	const isJK = symbol.endsWith(".JK");
	const kode = isJK ? symbol.replace(".JK", "") : "";
	const q = useIdxBrokerSummary(kode);

	if (!isJK || q.isLoading || q.error || !q.data) return null;
	const signal = analyzeConcentration(q.data.brokers);
	if (!signal) return null;

	const style = KIND_STYLES[signal.kind];
	const topPct = (signal.topBroker.pct * 100).toFixed(0);
	const top3Pct = (signal.top3Pct * 100).toFixed(0);
	const barPct = Math.min(signal.topBroker.pct * 100, 100);

	return (
		<div className="mx-4 mt-3 flex items-stretch gap-3 rounded-[14px] border border-rule bg-card px-3 py-2.5">
			<div className="flex flex-col justify-center">
				<span className="font-mono text-[10px] text-ink-4 tracking-[0.14em] uppercase">
					Tape Concentration · {q.data.date}
				</span>
				<div
					className={clsx(
						"mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] font-bold",
						style.badge,
					)}
				>
					<span>{style.dot}</span>
					<span className="uppercase tracking-wider">{style.label}</span>
				</div>
			</div>
			<div className="flex-1 border-l border-rule pl-3">
				<div className="grid grid-cols-3 gap-3">
					<Stat label="Top Broker" value={`${signal.topBroker.code} ${topPct}%`} />
					<Stat label="Top 3" value={`${top3Pct}%`} />
					<Stat label="Brokers" value={signal.brokerCount.toLocaleString("en-US")} />
				</div>
				<div className="mt-2 flex items-center gap-2">
					<div className="h-1 flex-1 overflow-hidden rounded-full bg-paper-2">
						<div
							className={clsx("h-full rounded-full", style.accent)}
							style={{ width: `${barPct}%` }}
						/>
					</div>
					<span className="truncate font-mono text-[10px] text-ink-4" title={signal.note}>
						{signal.note}
					</span>
				</div>
			</div>
		</div>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div className="font-mono text-[9px] text-ink-4 tracking-[0.12em] uppercase">{label}</div>
			<div className="mt-0.5 truncate font-mono text-xs font-semibold text-ink tabular-nums">
				{value}
			</div>
		</div>
	);
}
