import { useIdxBrokers } from "../../hooks/use-idx-brokers";
import { Skeleton } from "../ui/loading";

export function BrokerTable() {
	const { data, isLoading, error } = useIdxBrokers();

	if (isLoading) {
		return <Skeleton className="h-[400px] w-full rounded-[18px]" />;
	}

	if (error || !data?.brokers.length) {
		return (
			<div className="rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-8 text-center text-sm text-ink-4">
				Broker data unavailable.
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-[18px] border border-rule bg-card">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-rule bg-paper-2">
						<th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
							Code
						</th>
						<th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
							Name
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 md:table-cell">
							License
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 sm:table-cell">
							Status
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 lg:table-cell">
							Website
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-rule">
					{data.brokers.map((b) => (
						<tr key={b.code} className="transition-colors hover:bg-paper-2/60">
							<td className="px-3 py-2 font-mono text-sm font-semibold text-ember-600">{b.code}</td>
							<td className="max-w-[280px] truncate px-3 py-2 text-ink">{b.name}</td>
							<td className="hidden px-3 py-2 text-ink-2 md:table-cell">{b.license}</td>
							<td className="hidden px-3 py-2 sm:table-cell">
								<span className="rounded-full border border-rule bg-paper-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-4">
									{b.status}
								</span>
							</td>
							<td className="hidden px-3 py-2 lg:table-cell">
								{b.website ? (
									<a
										href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
										target="_blank"
										rel="noopener noreferrer"
										className="font-mono text-xs text-cyan-700 hover:underline"
									>
										{b.website.replace(/^https?:\/\/(www\.)?/, "")}
									</a>
								) : (
									<span className="text-ink-4">—</span>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
