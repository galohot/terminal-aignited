import { Activity, BarChart3, CircleAlert, RefreshCw } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useHistory } from "../../hooks/use-history";
import { useQuote } from "../../hooks/use-quote";
import { useRealtimeSubscription } from "../../hooks/use-realtime";
import { DEFAULT_PERIOD_INDEX, PERIOD_OPTIONS } from "../../lib/constants";
import { formatPercent, formatPrice, formatVolume } from "../../lib/format";
import { useRealtimeStore } from "../../stores/realtime-store";
import { Skeleton } from "../ui/loading";
import { ChartToolbar } from "./chart-toolbar";
import { PriceChart } from "./price-chart";
import { SymbolPicker } from "./symbol-picker";

interface ChartSlotProps {
	symbol: string;
	onSymbolChange: (symbol: string) => void;
	compact?: boolean;
}

export function ChartSlot({ symbol, onSymbolChange, compact = false }: ChartSlotProps) {
	const [periodIndex, setPeriodIndex] = useState(DEFAULT_PERIOD_INDEX);
	const selected = PERIOD_OPTIONS[periodIndex];
	const quote = useQuote(symbol);
	const history = useHistory(symbol, selected.period, selected.interval);
	const symbolList = useMemo(() => (symbol ? [symbol] : []), [symbol]);
	useRealtimeSubscription(symbolList);
	const realtimePrice = useRealtimeStore((state) => (symbol ? state.prices[symbol] : undefined));

	if (!symbol) {
		return (
			<div className="flex h-full min-h-[280px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-4">
				<SymbolPicker onSelect={onSymbolChange} />
			</div>
		);
	}

	const q = quote.data;
	const livePrice = realtimePrice?.price ?? q?.price ?? null;
	const liveChange = realtimePrice?.changePercent ?? q?.change_percent ?? 0;
	const isPositive = liveChange >= 0;
	const changeColor = isPositive ? "text-t-green" : "text-t-red";

	if (quote.isError || history.isError) {
		return (
			<div className="flex h-full min-h-[280px] flex-col justify-between rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,21,22,0.98),rgba(10,12,13,0.98))] p-4">
				<div>
					<div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-t-amber">
						<CircleAlert className="h-3.5 w-3.5" />
						Chart unavailable
					</div>
					<div className="text-lg font-semibold text-white">{symbol}</div>
					<p className="mt-2 text-sm leading-6 text-t-text-secondary">
						The quote or historical series could not be loaded for this slot. Replace the symbol or retry
						later.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => onSymbolChange("")}
						className="rounded-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-t-text-secondary transition-colors hover:bg-white/10 hover:text-white"
					>
						Replace Symbol
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,21,22,0.98),rgba(10,12,13,0.98))]">
			<div className="border-b border-white/8 px-4 py-3">
				<div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<button
								type="button"
								onClick={() => onSymbolChange("")}
								className="font-mono text-sm font-semibold tracking-[0.18em] text-t-green transition-colors hover:text-white"
							>
								{symbol}
							</button>
							{realtimePrice && (
								<span className="rounded-full border border-t-green/30 bg-t-green/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-t-green">
									Live
								</span>
							)}
							<span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-t-text-muted">
								{selected.label}
							</span>
						</div>
						<div className="mt-2 break-words text-sm text-t-text-secondary">{q?.name ?? "Loading instrument..."}</div>
					</div>

					<div className="grid max-w-full gap-1 text-left font-mono xl:text-right">
						<div className="break-words text-lg font-semibold text-white">
							{livePrice != null ? formatPrice(livePrice, q?.currency) : "—"}
						</div>
						<div className={`break-words text-sm ${changeColor}`}>{formatPercent(liveChange)}</div>
					</div>
				</div>

				{!compact && (
					<div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
						<MiniMetric
							icon={<Activity className="h-3.5 w-3.5" />}
							label="Open"
							value={q ? formatPrice(q.open, q.currency) : "—"}
						/>
						<MiniMetric
							icon={<BarChart3 className="h-3.5 w-3.5" />}
							label="Day Range"
							value={q ? `${formatPrice(q.low, q.currency)} - ${formatPrice(q.high, q.currency)}` : "—"}
						/>
						<MiniMetric
							icon={<RefreshCw className="h-3.5 w-3.5" />}
							label="Volume"
							value={q ? formatVolume(q.volume) : "—"}
						/>
						<MiniMetric
							icon={<Activity className="h-3.5 w-3.5" />}
							label="Realtime"
							value={realtimePrice ? "Connected" : "Polling"}
						/>
					</div>
				)}
			</div>

			{!compact && <ChartToolbar selectedIndex={periodIndex} onSelect={setPeriodIndex} />}

			<div className="flex-1">
				{history.isLoading ? (
					<Skeleton className="h-full w-full" />
				) : history.data?.data?.length ? (
					<PriceChart
						data={history.data.data}
						height={compact ? 260 : undefined}
						realtimePrice={realtimePrice}
					/>
				) : (
					<div className="flex h-full items-center justify-center p-6">
						<div className="max-w-sm text-center">
							<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-t-amber">
								No historical data
							</div>
							<p className="mt-3 text-sm leading-6 text-t-text-secondary">
								There is no chart series available for the selected period. Try a different symbol or
								time range.
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function MiniMetric({
	icon,
	label,
	value,
}: {
	icon: ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="min-w-0 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2">
			<div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-t-text-muted">
				<span className="text-t-amber">{icon}</span>
				{label}
			</div>
			<div className="mt-1 break-words text-sm font-medium text-white">{value}</div>
		</div>
	);
}
