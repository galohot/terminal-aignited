import { useIdxDisclosures } from "../../hooks/use-idx-company";
import { Skeleton } from "../ui/loading";

export function DisclosuresFeed({ kode, limit = 15 }: { kode?: string; limit?: number }) {
	const { data, isLoading, error } = useIdxDisclosures(kode, limit);

	if (isLoading) return <Skeleton className="h-[200px] w-full rounded-xl" />;

	if (error || !data?.disclosures?.length) {
		return (
			<div className="rounded-2xl border border-dashed border-t-border p-6 text-center text-sm text-t-text-muted">
				No disclosures available.
			</div>
		);
	}

	return (
		<div>
			<div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
				Disclosures
			</div>
			<div className="space-y-1.5 rounded-xl border border-white/8 p-3">
				{data.disclosures.map((d) => (
					<div
						key={`${d.submitted_date}-${d.kode}-${d.headline.slice(0, 30)}`}
						className="group flex gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
					>
						<div className="shrink-0 pt-0.5 font-mono text-[10px] text-t-text-muted">
							{d.submitted_date.slice(0, 10)}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								{d.kode && (
									<span className="shrink-0 font-mono text-[10px] font-semibold text-t-green">
										{d.kode}
									</span>
								)}
								{d.attachment_url ? (
									<a
										href={d.attachment_url}
										target="_blank"
										rel="noreferrer"
										className="truncate text-xs text-t-text transition-colors group-hover:text-t-blue"
									>
										{d.headline}
									</a>
								) : (
									<span className="truncate text-xs text-t-text">{d.headline}</span>
								)}
							</div>
							{d.source && (
								<div className="mt-0.5 font-mono text-[9px] text-t-text-muted">{d.source}</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
