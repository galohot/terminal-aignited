import { clsx } from "clsx";
import type { StockRegime } from "../../types/flow";

const CAP_COLORS: Record<string, string> = {
	large: "border-t-green/30 bg-t-green/10 text-t-green",
	mid: "border-t-amber/30 bg-t-amber/10 text-t-amber",
	small: "border-orange-400/30 bg-orange-400/10 text-orange-400",
	micro: "border-t-red/30 bg-t-red/10 text-t-red",
};

const LIQ_COLORS: Record<string, string> = {
	high: "border-t-green/30 bg-t-green/10 text-t-green",
	medium: "border-t-amber/30 bg-t-amber/10 text-t-amber",
	low: "border-orange-400/30 bg-orange-400/10 text-orange-400",
	very_low: "border-t-red/30 bg-t-red/10 text-t-red",
};

export function FlowRegimeBadge({ regime }: { regime: StockRegime }) {
	return (
		<div className="flex items-center gap-2">
			<span
				className={clsx(
					"rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
					CAP_COLORS[regime.capSize],
				)}
			>
				{regime.capLabel}
			</span>
			<span
				className={clsx(
					"rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
					LIQ_COLORS[regime.liquidityTier],
				)}
			>
				{regime.liquidityLabel}
			</span>
		</div>
	);
}
