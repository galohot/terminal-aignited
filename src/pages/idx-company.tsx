import { Link, useParams } from "react-router";
import { BoardList } from "../components/idx/board-list";
import { CompanyHeader } from "../components/idx/company-header";
import { InsiderNetworkGraph } from "../components/idx/insider-network-graph";
import { PeerCompanies } from "../components/idx/peer-companies";
import { RatioCard } from "../components/idx/ratio-card";
import { ShareholderTable } from "../components/idx/shareholder-table";
import { Skeleton } from "../components/ui/loading";
import { useIdxCompanyFull, useIdxFinancialSummary } from "../hooks/use-idx-company";
import { usePageTitle } from "../hooks/use-page-title";

export function IdxCompanyPage() {
	const { kode = "" } = useParams<{ kode: string }>();
	const upperKode = kode.toUpperCase();
	usePageTitle(upperKode ? `${upperKode} — IDX Company` : "IDX Company");

	const full = useIdxCompanyFull(upperKode);
	const summary = useIdxFinancialSummary(upperKode);

	if (full.isLoading) {
		return (
			<div className="p-4">
				<Skeleton className="mb-4 h-20 w-full" />
				<div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
					<Skeleton className="h-[400px] w-full" />
					<Skeleton className="h-[300px] w-full" />
				</div>
			</div>
		);
	}

	if (full.error || !full.data) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
				<p className="font-mono text-sm text-t-text-secondary">
					{full.error?.message.includes("404")
						? `Emiten "${upperKode}" not found`
						: "Failed to load company data"}
				</p>
				<Link
					to="/"
					className="rounded border border-t-border bg-t-surface px-3 py-1 font-mono text-xs text-t-text-secondary transition-colors hover:bg-t-hover"
				>
					Back to Dashboard
				</Link>
			</div>
		);
	}

	const { company, financials, directors, commissioners, shareholders, peer_companies } = full.data;

	return (
		<div>
			<div className="flex items-center gap-3 border-b border-t-border bg-t-surface px-4 py-2">
				<Link
					to={`/stock/${upperKode}.JK`}
					className="font-mono text-sm text-t-text-muted transition-colors hover:text-t-text-secondary"
				>
					←
				</Link>
				<span className="font-mono text-xs text-t-text-muted">IDX Company Profile</span>
			</div>

			<CompanyHeader company={company} />

			<div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[1fr_320px]">
				<div className="space-y-4">
					{summary.isLoading ? (
						<Skeleton className="h-[300px] w-full" />
					) : (
						<RatioCard
							latest={summary.data?.latest ?? financials}
							history={summary.data?.history}
						/>
					)}
					<InsiderNetworkGraph
						kode={upperKode}
						companyName={company.name}
						directors={directors}
						commissioners={commissioners}
						shareholders={shareholders}
						peers={peer_companies}
					/>
					<PeerCompanies peers={peer_companies} />
				</div>
				<div className="space-y-4">
					<ShareholderTable shareholders={shareholders} />
					<BoardList directors={directors} commissioners={commissioners} />
				</div>
			</div>
		</div>
	);
}
