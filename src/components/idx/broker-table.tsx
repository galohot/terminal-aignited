import { useIdxBrokers } from "../../hooks/use-idx-brokers";
import { Skeleton } from "../ui/loading";

export function BrokerTable() {
	const { data, isLoading, error } = useIdxBrokers();

	if (isLoading) {
		return <Skeleton className="h-[400px] w-full rounded-xl" />;
	}

	if (error || !data?.brokers.length) {
		return (
			<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
				Broker data unavailable.
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-xl border border-white/8">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-white/8 bg-white/[0.03]">
						<th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
							Code
						</th>
						<th className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
							Name
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted md:table-cell">
							License
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted sm:table-cell">
							Status
						</th>
						<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted lg:table-cell">
							Website
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-white/5">
					{data.brokers.map((b) => (
						<tr key={b.code} className="transition-colors hover:bg-white/[0.04]">
							<td className="px-3 py-2 font-mono text-sm font-semibold text-t-green">{b.code}</td>
							<td className="max-w-[280px] truncate px-3 py-2 text-t-text">{b.name}</td>
							<td className="hidden px-3 py-2 text-t-text-secondary md:table-cell">{b.license}</td>
							<td className="hidden px-3 py-2 sm:table-cell">
								<span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
									{b.status}
								</span>
							</td>
							<td className="hidden px-3 py-2 lg:table-cell">
								{b.website ? (
									<a
										href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
										target="_blank"
										rel="noreferrer"
										className="font-mono text-xs text-t-blue hover:underline"
									>
										{b.website.replace(/^https?:\/\/(www\.)?/, "")}
									</a>
								) : (
									<span className="text-t-text-muted">—</span>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
