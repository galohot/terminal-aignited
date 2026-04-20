import { clsx } from "clsx";
import type { IdxPattern, IdxPatternDirection } from "../../types/market";

interface PatternCardProps {
	ticker: string;
	pattern: IdxPattern;
}

const directionStyles: Record<
	IdxPatternDirection,
	{ badge: string; accent: string; label: string }
> = {
	Bullish: { badge: "bg-pos/15 text-pos", accent: "bg-pos", label: "Bullish" },
	Bearish: { badge: "bg-neg/15 text-neg", accent: "bg-neg", label: "Bearish" },
	Neutral: { badge: "bg-paper-2 text-ink-3", accent: "bg-ink-4/40", label: "Neutral" },
};

export function PatternCard({ ticker, pattern }: PatternCardProps) {
	const style = directionStyles[pattern.direction];
	const confidencePct = Math.round(pattern.confidence * 100);

	return (
		<article className="relative overflow-hidden rounded-[14px] border border-rule bg-card p-3">
			<span className={clsx("absolute inset-y-0 left-0 w-[3px]", style.accent)} />
			<div className="flex items-start justify-between gap-2 pl-2">
				<div>
					<div className="font-mono text-[10px] text-ink-4 tracking-[0.14em] uppercase">
						{ticker}
					</div>
					<h4 className="mt-0.5 font-mono text-sm font-bold text-ink">{pattern.name}</h4>
				</div>
				<span
					className={clsx(
						"shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase",
						style.badge,
					)}
				>
					{style.label}
				</span>
			</div>
			<p className="mt-2 pl-2 font-mono text-[11px] leading-[1.45] text-ink-3">
				{pattern.description}
			</p>
			<div className="mt-2.5 flex items-center gap-2 pl-2">
				<div className="h-1 w-24 overflow-hidden rounded-full bg-paper-2">
					<div
						className={clsx("h-full rounded-full", style.accent)}
						style={{ width: `${confidencePct}%` }}
					/>
				</div>
				<span className="font-mono text-[10px] text-ink-4">{confidencePct}% confidence</span>
			</div>
		</article>
	);
}
