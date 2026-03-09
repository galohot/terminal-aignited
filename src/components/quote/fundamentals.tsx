import type { Fundamentals as FundamentalsType } from "../../types/market";

export function FundamentalsPanel({ data }: { data: FundamentalsType }) {
	return (
		<div className="rounded border border-t-border bg-t-surface">
			<div className="border-b border-t-border px-3 py-2">
				<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
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
						<span className="text-t-text-muted">Website</span>
						<a
							href={data.website}
							target="_blank"
							rel="noopener noreferrer"
							className="font-mono text-t-blue hover:underline"
						>
							{data.website.replace(/^https?:\/\/(www\.)?/, "")}
						</a>
					</div>
				)}
			</div>
			{data.description && (
				<div className="border-t border-t-border px-3 py-2">
					<p className="line-clamp-4 text-xs leading-relaxed text-t-text-secondary">
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
			<span className="text-t-text-muted">{label}</span>
			<span className="text-t-text">{value}</span>
		</div>
	);
}
