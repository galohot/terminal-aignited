import { safeUrl } from "../../lib/safe-url";
import type { Fundamentals as FundamentalsType } from "../../types/market";

export function FundamentalsPanel({ data }: { data: FundamentalsType }) {
	return (
		<div className="rounded-[18px] border border-rule bg-card">
			<div className="border-b border-rule px-3 py-2">
				<h3 className="text-xs font-medium uppercase tracking-wider text-ink-3">
					Company Info
				</h3>
			</div>
			<div className="space-y-2 px-3 py-2 text-xs">
				{data.sector && <InfoRow label="Sector" value={data.sector} />}
				{data.industry && <InfoRow label="Industry" value={data.industry} />}
				{data.country && <InfoRow label="Country" value={data.country} />}
				{data.employees != null && (
					<InfoRow label="Employees" value={data.employees.toLocaleString("en-US")} />
				)}
				{data.website && (
					<div className="flex justify-between">
						<span className="text-ink-4">Website</span>
						<a
							href={safeUrl(data.website)}
							target="_blank"
							rel="noopener noreferrer"
							className="font-mono text-ember-600 hover:text-ember-700 hover:underline"
						>
							{data.website.replace(/^https?:\/\/(www\.)?/, "")}
						</a>
					</div>
				)}
			</div>
			{data.description && (
				<div className="border-t border-rule px-3 py-2">
					<p className="line-clamp-4 text-xs leading-relaxed text-ink-3">
						{data.description}
					</p>
				</div>
			)}
		</div>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between">
			<span className="text-ink-4">{label}</span>
			<span className="text-ink">{value}</span>
		</div>
	);
}
