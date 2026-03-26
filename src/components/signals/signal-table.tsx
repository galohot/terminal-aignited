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

export function SignalTable({ title, data, isLoading, colorClass, barColor, onSelect }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className={clsx("font-mono text-sm font-semibold", colorClass)}>{title}</h2>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-white/5" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-t-text-muted">No signals</div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.map((item) => {
              const total = (item.bullish || 0) + (item.bearish || 0) + (item.neutral || 0);
              const bullPct = total > 0 ? ((item.bullish || 0) / total) * 100 : 0;
              const bearPct = total > 0 ? ((item.bearish || 0) / total) * 100 : 0;

              return (
                <button
                  type="button"
                  key={item.ticker}
                  onClick={() => onSelect(item.ticker)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <span className="w-16 font-mono text-sm font-bold text-white">
                    {item.ticker}
                  </span>
                  <span className={clsx(
                    "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase",
                    item.consensus === "strong_buy" && "bg-green-500/20 text-green-400",
                    item.consensus === "buy" && "bg-green-500/10 text-green-300",
                    item.consensus === "sell" && "bg-red-500/10 text-red-300",
                    item.consensus === "strong_sell" && "bg-red-500/20 text-red-400",
                    item.consensus === "neutral" && "bg-white/10 text-gray-400",
                  )}>
                    {item.consensus.replace("_", " ")}
                  </span>
                  <span className={clsx("font-mono text-xs", colorClass)}>
                    {item.score > 0 ? "+" : ""}{item.score.toFixed(3)}
                  </span>
                  <div className="ml-auto flex h-2 w-24 overflow-hidden rounded-full bg-white/10">
                    <div style={{ width: `${bullPct}%` }} className="bg-green-500" />
                    <div style={{ width: `${bearPct}%` }} className="bg-red-500" />
                  </div>
                  <span className="font-mono text-[10px] text-t-text-muted">
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
