import { INVESTOR_TYPE_COLORS, INVESTOR_TYPE_LABELS } from "./constants";
import type { InvestorType } from "./types";

export function Badge({ type, className = "" }: { type: InvestorType; className?: string }) {
	const color = INVESTOR_TYPE_COLORS[type];
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full border border-transparent px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${className}`}
			style={{ backgroundColor: `${color}15`, color }}
		>
			<span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
			{INVESTOR_TYPE_LABELS[type]}
		</span>
	);
}
