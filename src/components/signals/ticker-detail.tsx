import { clsx } from "clsx";
import { X } from "lucide-react";
import { useConsensusDetail } from "../../hooks/use-consensus";

interface Props {
  ticker: string;
  onClose: () => void;
}

const SIGNAL_ICONS: Record<string, string> = {
  bullish: "🟢",
  bearish: "🔴",
  neutral: "⚪",
};

export function TickerDetail({ ticker, onClose }: Props) {
  const { data, isLoading } = useConsensusDetail(ticker);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-mono text-lg font-bold text-white">
            {data?.ticker?.replace(".JK", "") || ticker}
          </h3>
          <div className="flex items-center gap-2">
            <span className={clsx(
              "rounded-full px-2 py-0.5 font-mono text-xs uppercase",
              data?.consensus === "strong_buy" && "bg-green-500/20 text-green-400",
              data?.consensus === "buy" && "bg-green-500/10 text-green-300",
              data?.consensus === "sell" && "bg-red-500/10 text-red-300",
              data?.consensus === "neutral" && "bg-white/10 text-gray-400",
            )}>
              {data?.consensus?.replace("_", " ") || "loading..."}
            </span>
            <span className="font-mono text-sm text-t-text-muted">
              Score: {data?.score !== undefined ? (data.score > 0 ? "+" : "") + data.score.toFixed(3) : "..."}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-t-text-muted hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {data?.strategies?.map((s) => (
            <div key={s.strategy} className="flex items-center gap-3 py-2">
              <span className="text-base">{SIGNAL_ICONS[s.signal] || "⚪"}</span>
              <span className="w-44 font-mono text-xs text-t-text-muted">
                {s.strategy.replace(/_/g, " ")}
              </span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                <div
                  style={{ width: `${(s.strength || 0) * 100}%` }}
                  className={clsx(
                    "h-full rounded-full",
                    s.signal === "bullish" && "bg-green-500",
                    s.signal === "bearish" && "bg-red-500",
                    s.signal === "neutral" && "bg-gray-500",
                  )}
                />
              </div>
              <span className="flex-1 font-mono text-xs text-t-text-muted">
                {s.reason}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
