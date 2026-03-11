import { clsx } from "clsx";
import { useState } from "react";
import { useIdxBrokerFlowHistory } from "../../hooks/use-broker-flow";
import type { BrokerFlowEntry, IdxBrokerFlowResponse } from "../../types/flow";
import { Skeleton } from "../ui/loading";

function formatValue(value: number): string {
	const abs = Math.abs(value);
	if (abs >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
	if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
	if (abs >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
	return value.toLocaleString();
}

function formatVolume(value: number): string {
	if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
	if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
	if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
	return value.toLocaleString();
}

export function BrokerFlowDashboard({ data }: { data: IdxBrokerFlowResponse }) {
	const [selectedBroker, setSelectedBroker] = useState<string>("");
	const [sortBy, setSortBy] = useState<"value" | "volume" | "frequency">("value");

	const sorted = [...data.brokers].sort((a, b) => b[sortBy] - a[sortBy]);
	const top = sorted.slice(0, 20);

	return (
		<div className="rounded-lg border border-t-border bg-white/[0.02]">
			<div className="border-b border-t-border px-4 py-3">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="font-mono text-sm font-semibold text-white">Broker Flow</h3>
						<p className="mt-0.5 font-mono text-[10px] text-t-text-muted">
							{data.date} · {data.totals.broker_count} brokers
						</p>
					</div>
					<div className="flex items-center gap-1">
						{(["value", "volume", "frequency"] as const).map((s) => (
							<button
								key={s}
								type="button"
								onClick={() => setSortBy(s)}
								className={clsx(
									"rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
									sortBy === s
										? "bg-white/10 text-white"
										: "text-t-text-muted hover:text-t-text-secondary",
								)}
							>
								{s}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Summary stats */}
			<div className="grid grid-cols-3 gap-px border-b border-t-border bg-white/5">
				<StatCard label="Total Value" value={formatValue(data.totals.total_value)} />
				<StatCard label="Total Volume" value={formatVolume(data.totals.total_volume)} />
				<StatCard label="Frequency" value={data.totals.total_frequency.toLocaleString()} />
			</div>

			{/* Table */}
			<div className="max-h-[400px] overflow-y-auto">
				<table className="w-full text-xs">
					<thead className="sticky top-0 bg-[#0a0a0a]">
						<tr className="border-b border-white/10">
							<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
								#
							</th>
							<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
								Broker
							</th>
							<th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
								Value
							</th>
							<th className="hidden px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-t-text-muted sm:table-cell">
								Volume
							</th>
							<th className="hidden px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-t-text-muted sm:table-cell">
								Freq
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5">
						{top.map((broker, idx) => (
							<BrokerRow
								key={broker.broker_code}
								broker={broker}
								rank={idx + 1}
								sortBy={sortBy}
								maxValue={top[0]?.[sortBy] ?? 1}
								isSelected={selectedBroker === broker.broker_code}
								onSelect={() =>
									setSelectedBroker(
										selectedBroker === broker.broker_code ? "" : broker.broker_code,
									)
								}
							/>
						))}
					</tbody>
				</table>
			</div>

			{/* Broker history panel */}
			{selectedBroker && (
				<div className="border-t border-t-border p-4">
					<BrokerHistoryPanel code={selectedBroker} />
				</div>
			)}
		</div>
	);
}

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="bg-[#0a0a0a] px-4 py-3">
			<div className="font-mono text-[10px] uppercase tracking-wider text-t-text-muted">{label}</div>
			<div className="mt-1 font-mono text-sm font-medium text-white">{value}</div>
		</div>
	);
}

function BrokerRow({
	broker,
	rank,
	sortBy,
	maxValue,
	isSelected,
	onSelect,
}: {
	broker: BrokerFlowEntry;
	rank: number;
	sortBy: "value" | "volume" | "frequency";
	maxValue: number;
	isSelected: boolean;
	onSelect: () => void;
}) {
	const pct = maxValue > 0 ? (broker[sortBy] / maxValue) * 100 : 0;

	return (
		<tr
			className={clsx(
				"cursor-pointer transition-colors",
				isSelected ? "bg-white/[0.06]" : "hover:bg-white/[0.03]",
			)}
			onClick={onSelect}
		>
			<td className="px-3 py-2 font-mono text-t-text-muted">{rank}</td>
			<td className="px-3 py-2">
				<div className="relative">
					<div
						className="absolute inset-y-0 left-0 rounded-sm bg-t-amber/10"
						style={{ width: `${pct}%` }}
					/>
					<div className="relative">
						<span className="font-mono text-xs font-medium text-white">{broker.broker_code}</span>
						<span className="ml-2 font-mono text-[10px] text-t-text-muted">
							{broker.broker_name?.slice(0, 20)}
						</span>
					</div>
				</div>
			</td>
			<td className="px-3 py-2 text-right font-mono text-t-text-secondary">
				{formatValue(broker.value)}
			</td>
			<td className="hidden px-3 py-2 text-right font-mono text-t-text-muted sm:table-cell">
				{formatVolume(broker.volume)}
			</td>
			<td className="hidden px-3 py-2 text-right font-mono text-t-text-muted sm:table-cell">
				{broker.frequency.toLocaleString()}
			</td>
		</tr>
	);
}

function BrokerHistoryPanel({ code }: { code: string }) {
	const { data, isLoading, error } = useIdxBrokerFlowHistory(code, 30);

	if (isLoading) return <Skeleton className="h-32 w-full rounded-lg" />;
	if (error || !data) {
		return (
			<div className="py-4 text-center font-mono text-xs text-t-text-muted">
				Failed to load history for {code}
			</div>
		);
	}

	const history = data.history;
	if (history.length === 0) {
		return (
			<div className="py-4 text-center font-mono text-xs text-t-text-muted">
				No history data available
			</div>
		);
	}

	const maxVal = Math.max(...history.map((h) => h.value));

	return (
		<div>
			<div className="mb-2 flex items-center justify-between">
				<span className="font-mono text-xs font-medium text-white">
					{code} — {data.broker_name}
				</span>
				<span className="font-mono text-[10px] text-t-text-muted">
					{data.total_days} days
				</span>
			</div>
			{/* Simple bar chart for value over time */}
			<div className="flex items-end gap-px" style={{ height: 80 }}>
				{history.map((h) => {
					const barH = maxVal > 0 ? (h.value / maxVal) * 100 : 0;
					const hasDelta = h.value_delta != null;
					const isUp = hasDelta && (h.value_delta ?? 0) > 0;
					return (
						<div
							key={h.date}
							className="group relative flex-1"
							style={{ height: "100%" }}
						>
							<div
								className={clsx(
									"absolute bottom-0 left-0 right-0 rounded-t-sm transition-colors",
									isUp ? "bg-t-green/40" : "bg-t-red/30",
								)}
								style={{ height: `${barH}%` }}
								title={`${h.date}: ${formatValue(h.value)}${hasDelta ? ` (${isUp ? "+" : ""}${formatValue(h.value_delta ?? 0)})` : ""}`}
							/>
						</div>
					);
				})}
			</div>
			<div className="mt-1 flex justify-between font-mono text-[9px] text-t-text-muted">
				<span>{history[0]?.date}</span>
				<span>{history[history.length - 1]?.date}</span>
			</div>
		</div>
	);
}
