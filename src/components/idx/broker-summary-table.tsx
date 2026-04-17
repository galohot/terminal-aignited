import { useIdxBrokerSummary } from "../../hooks/use-idx-company";
import { formatVolume } from "../../lib/format";
import { Skeleton } from "../ui/loading";

function formatValue(v: number): string {
	if (Math.abs(v) >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
	if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
	if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
	return v.toLocaleString("en-US");
}

export function BrokerSummaryTable({ kode }: { kode: string }) {
	const { data, isLoading, error } = useIdxBrokerSummary(kode);

	if (isLoading) return <Skeleton className="h-[300px] w-full rounded-xl" />;

	if (error || !data?.brokers?.length) {
		return (
			<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
				Broker activity data unavailable.
			</div>
		);
	}

	const maxValue = Math.max(...data.brokers.map((b) => b.value), 1);

	return (
		<div>
			<div className="mb-2 flex items-center justify-between">
				<span className="font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
					Broker Activity
				</span>
				{data.date && <span className="font-mono text-[10px] text-t-text-muted">{data.date}</span>}
			</div>
			<div className="overflow-x-auto rounded-xl border border-white/8">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-white/8 bg-white/[0.03]">
							<th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
								Broker
							</th>
							<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted sm:table-cell">
								Name
							</th>
							<th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
								Value
							</th>
							<th className="hidden px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted md:table-cell">
								Vol
							</th>
							<th className="hidden px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted md:table-cell">
								Freq
							</th>
							<th className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
								Share
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5">
						{data.brokers.map((b) => {
							const pct = (b.value / maxValue) * 100;
							return (
								<tr key={b.broker_code} className="transition-colors hover:bg-white/[0.04]">
									<td className="px-3 py-2 font-mono text-sm font-semibold text-t-green">
										{b.broker_code}
									</td>
									<td className="hidden max-w-[200px] truncate px-3 py-2 text-xs text-t-text-secondary sm:table-cell">
										{b.broker_name}
									</td>
									<td className="px-3 py-2 text-right font-mono text-xs text-t-text-secondary">
										{formatValue(b.value)}
									</td>
									<td className="hidden px-3 py-2 text-right font-mono text-xs text-t-text-muted md:table-cell">
										{formatVolume(b.volume)}
									</td>
									<td className="hidden px-3 py-2 text-right font-mono text-xs text-t-text-muted md:table-cell">
										{b.frequency.toLocaleString("en-US")}
									</td>
									<td className="px-3 py-2">
										<div className="relative h-3 w-20 overflow-hidden rounded-full bg-white/[0.04]">
											<div
												className="absolute left-0 top-0 h-full rounded-full bg-t-green/40"
												style={{ width: `${pct}%` }}
											/>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
