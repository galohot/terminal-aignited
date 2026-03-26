import { useState } from "react";
import { SignalCards } from "../components/signals/signal-cards";
import { SignalTable } from "../components/signals/signal-table";
import { TickerDetail } from "../components/signals/ticker-detail";
import { useConsensusSummary, useConsensusTop } from "../hooks/use-consensus";

export function SignalsPage() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const summary = useConsensusSummary();
  const topBuy = useConsensusTop("buy", 20);
  const topSell = useConsensusTop("sell", 20);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-semibold tracking-wider text-white">
            🎯 SIGNAL RADAR
          </h1>
          <p className="font-mono text-xs text-t-text-muted">
            15 strategies · {summary.data?.total || "..."} tickers · Updated{" "}
            {summary.data?.date || "..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="font-mono text-xs text-green-400">LIVE</span>
        </div>
      </div>

      {/* Summary Cards */}
      <SignalCards summary={summary.data} isLoading={summary.isLoading} />

      {/* Two columns: Buy + Sell */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SignalTable
          title="🟢 Strongest Buy Signals"
          data={topBuy.data?.data || []}
          isLoading={topBuy.isLoading}
          colorClass="text-green-400"
          barColor="#22c55e"
          onSelect={setSelectedTicker}
        />
        <SignalTable
          title="🔴 Strongest Sell Signals"
          data={topSell.data?.data || []}
          isLoading={topSell.isLoading}
          colorClass="text-red-400"
          barColor="#ef4444"
          onSelect={setSelectedTicker}
        />
      </div>

      {/* Ticker Detail */}
      {selectedTicker && (
        <TickerDetail
          ticker={selectedTicker}
          onClose={() => setSelectedTicker(null)}
        />
      )}

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 font-mono text-[10px] text-amber-400/80">
        ⚠️ DISCLAIMER: Informasi ini bukan rekomendasi investasi. Analisis
        menggunakan model kuantitatif yang memiliki keterbatasan. Selalu
        lakukan riset sendiri (DYOR) sebelum mengambil keputusan investasi.
      </div>
    </div>
  );
}
