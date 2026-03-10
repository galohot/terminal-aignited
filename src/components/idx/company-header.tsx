import { Building2, Globe, Mail } from "lucide-react";
import type { IdxCompanyDetail } from "../../types/market";

export function CompanyHeader({ company }: { company: IdxCompanyDetail }) {
	return (
		<div className="border-b border-t-border bg-t-surface px-4 py-4">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0">
					<div className="flex items-center gap-3">
						<span className="font-mono text-xl font-bold text-t-green">{company.kode_emiten}</span>
						<span className="text-sm text-t-text-secondary">{company.name}</span>
					</div>
					<div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-t-text-muted">
						<span>{company.sector}</span>
						<span className="text-white/20">&gt;</span>
						<span>{company.sub_sector}</span>
						{company.industry && (
							<>
								<span className="text-white/20">&gt;</span>
								<span>{company.industry}</span>
							</>
						)}
						<span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">
							{company.papan_pencatatan}
						</span>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-3 text-xs text-t-text-muted">
					<span className="flex items-center gap-1">
						<Building2 className="h-3 w-3" />
						Listed {company.listing_date}
					</span>
					{company.email && (
						<a
							href={`mailto:${company.email}`}
							className="flex items-center gap-1 transition-colors hover:text-t-text-secondary"
						>
							<Mail className="h-3 w-3" />
							{company.email}
						</a>
					)}
					{company.website && (
						<a
							href={
								company.website.startsWith("http") ? company.website : `https://${company.website}`
							}
							target="_blank"
							rel="noreferrer"
							className="flex items-center gap-1 transition-colors hover:text-t-text-secondary"
						>
							<Globe className="h-3 w-3" />
							Website
						</a>
					)}
				</div>
			</div>
			{company.kegiatan_usaha && (
				<p className="mt-3 line-clamp-3 text-xs leading-relaxed text-t-text-secondary">
					{company.kegiatan_usaha}
				</p>
			)}
		</div>
	);
}
