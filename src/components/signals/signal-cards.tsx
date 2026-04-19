import { clsx } from "clsx";
import type { ConsensusSummary } from "../../hooks/use-consensus";

interface Props {
	summary: ConsensusSummary | undefined;
	isLoading: boolean;
}

const CARDS = [
	{
		key: "strong_buy",
		label: "Strong Buy",
		color: "text-pos",
		bg: "bg-pos/10",
		border: "border-pos/25",
	},
	{
		key: "buy",
		label: "Buy",
		color: "text-pos",
		bg: "bg-pos/5",
		border: "border-pos/15",
	},
	{
		key: "neutral",
		label: "Neutral",
		color: "text-ink-3",
		bg: "bg-paper-2",
		border: "border-rule",
	},
	{
		key: "sell",
		label: "Sell",
		color: "text-neg",
		bg: "bg-neg/10",
		border: "border-neg/25",
	},
] as const;

export function SignalCards({ summary, isLoading }: Props) {
	const total = summary?.total || 1;

	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{CARDS.map((card) => {
				const value = (summary?.[card.key as keyof ConsensusSummary] as number) ?? 0;
				const pct = ((value / total) * 100).toFixed(1);

				return (
					<div
						key={card.key}
						className={clsx(
							"rounded-[18px] border p-4 transition-all",
							card.bg,
							card.border,
							isLoading && "animate-pulse",
						)}
					>
						<div className="font-mono text-[10px] uppercase tracking-widest text-ink-4">
							{card.label}
						</div>
						<div className={clsx("mt-1 font-mono text-3xl font-bold", card.color)}>
							{isLoading ? "—" : value}
						</div>
						<div className="mt-1 font-mono text-xs text-ink-4">
							{isLoading ? "..." : `${pct}%`}
						</div>
					</div>
				);
			})}
		</div>
	);
}
