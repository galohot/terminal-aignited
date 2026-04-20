import { useIdxDisclosures } from "../../hooks/use-idx-company";
import { safeUrl } from "../../lib/safe-url";
import { Skeleton } from "../ui/loading";

export function DisclosuresFeed({ kode, limit = 15 }: { kode?: string; limit?: number }) {
	const { data, isLoading, error } = useIdxDisclosures(kode, limit);

	if (isLoading) return <Skeleton className="h-[200px] w-full rounded-xl" />;

	if (error || !data?.disclosures?.length) {
		return (
			<div className="rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-6 text-center text-sm text-ink-4">
				No disclosures available.
			</div>
		);
	}

	return (
		<div>
			<div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
				Disclosures
			</div>
			<div className="space-y-1.5 rounded-[18px] border border-rule bg-card p-3">
				{data.disclosures.map((d) => (
					<div
						key={`${d.submitted_date}-${d.kode}-${d.headline.slice(0, 30)}`}
						className="group flex gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-paper-2/60"
					>
						<div className="shrink-0 pt-0.5 font-mono text-[10px] text-ink-4">
							{d.submitted_date.slice(0, 10)}
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								{d.kode && (
									<span className="shrink-0 font-mono text-[10px] font-semibold text-ember-600">
										{d.kode}
									</span>
								)}
								{d.attachment_url ? (
									<a
										href={safeUrl(d.attachment_url)}
										target="_blank"
										rel="noopener noreferrer"
										className="truncate text-xs text-ink transition-colors group-hover:text-ember-600"
									>
										{d.headline}
									</a>
								) : (
									<span className="truncate text-xs text-ink">{d.headline}</span>
								)}
							</div>
							{d.source && (
								<div className="mt-0.5 font-mono text-[9px] text-ink-4">{d.source}</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
