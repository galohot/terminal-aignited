import { clsx } from "clsx";
import type { ConsensusSummary } from "../../hooks/use-consensus";

interface Props {
  summary: ConsensusSummary | undefined;
  isLoading: boolean;
}

const CARDS = [
  { key: "strong_buy", label: "Strong Buy", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  { key: "buy", label: "Buy", color: "text-green-300", bg: "bg-green-500/5", border: "border-green-500/10" },
  { key: "neutral", label: "Neutral", color: "text-gray-400", bg: "bg-white/5", border: "border-white/10" },
  { key: "sell", label: "Sell", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
] as const;

export function SignalCards({ summary, isLoading }: Props) {
  const total = summary?.total || 1;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CARDS.map((card) => {
        const value = summary?.[card.key as keyof ConsensusSummary] as number ?? 0;
        const pct = ((value / total) * 100).toFixed(1);

        return (
          <div
            key={card.key}
            className={clsx(
              "rounded-xl border p-4 transition-all",
              card.bg, card.border,
              isLoading && "animate-pulse"
            )}
          >
            <div className="font-mono text-[10px] uppercase tracking-widest text-t-text-muted">
              {card.label}
            </div>
            <div className={clsx("mt-1 font-mono text-3xl font-bold", card.color)}>
              {isLoading ? "—" : value}
            </div>
            <div className="mt-1 font-mono text-xs text-t-text-muted">
              {isLoading ? "..." : `${pct}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
