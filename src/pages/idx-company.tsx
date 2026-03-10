import { Link, useParams } from "react-router";
import { BoardList } from "../components/idx/board-list";
import { CompanyHeader } from "../components/idx/company-header";
import { RatioCard } from "../components/idx/ratio-card";
import { ShareholderTable } from "../components/idx/shareholder-table";
import { Skeleton } from "../components/ui/loading";
import { useIdxCompany, useIdxFinancials } from "../hooks/use-idx-company";

export function IdxCompanyPage() {
	const { kode = "" } = useParams<{ kode: string }>();
	const upperKode = kode.toUpperCase();

	const company = useIdxCompany(upperKode);
	const financials = useIdxFinancials(upperKode);

	if (company.isLoading) {
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

	if (company.error || !company.data) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
				<p className="font-mono text-sm text-t-text-secondary">
					{company.error?.message.includes("404")
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

	const data = company.data;

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

			<CompanyHeader company={data} />

			<div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[1fr_320px]">
				<div className="space-y-4">
					{financials.isLoading ? (
						<Skeleton className="h-[300px] w-full" />
					) : financials.data?.financials.length ? (
						<RatioCard financials={financials.data.financials} />
					) : null}
				</div>
				<div className="space-y-4">
					<ShareholderTable shareholders={data.shareholders} />
					<BoardList directors={data.directors} commissioners={data.commissioners} />
				</div>
			</div>
		</div>
	);
}
