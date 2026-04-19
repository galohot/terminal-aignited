import { clsx } from "clsx";
import type { StockRegime } from "../../types/flow";

const CAP_COLORS: Record<string, string> = {
	large: "border-pos/30 bg-pos/10 text-pos",
	mid: "border-ember-500/35 bg-ember-500/12 text-ember-700",
	small: "border-ember-400/30 bg-ember-400/10 text-ember-600",
	micro: "border-neg/30 bg-neg/10 text-neg",
};

const LIQ_COLORS: Record<string, string> = {
	high: "border-pos/30 bg-pos/10 text-pos",
	medium: "border-ember-500/35 bg-ember-500/12 text-ember-700",
	low: "border-ember-400/30 bg-ember-400/10 text-ember-600",
	very_low: "border-neg/30 bg-neg/10 text-neg",
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
