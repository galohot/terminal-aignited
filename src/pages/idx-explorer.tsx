import { clsx } from "clsx";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrokerTable } from "../components/idx/broker-table";
import { CompanyTable } from "../components/idx/company-table";
import { IdxNav } from "../components/idx/idx-nav";
import { SectorGrid } from "../components/idx/sector-grid";
import { Skeleton } from "../components/ui/loading";
import { useIdxCompanies } from "../hooks/use-idx-companies";
import { useIdxSectors } from "../hooks/use-idx-screener";
import { useKeyboardShortcut } from "../hooks/use-keyboard";

type Tab = "companies" | "brokers" | "sectors";
const PAGE_SIZE = 50;

export function IdxExplorerPage() {
	const [tab, setTab] = useState<Tab>("companies");
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [sector, setSector] = useState("");
	const [board, setBoard] = useState("");
	const [offset, setOffset] = useState(0);
	const searchRef = useRef<HTMLInputElement>(null);

	// Debounce search
	useEffect(() => {
		const id = setTimeout(() => {
			setDebouncedSearch(search);
			setOffset(0);
		}, 300);
		return () => clearTimeout(id);
	}, [search]);

	const handleSectorChange = (value: string) => {
		setSector(value);
		setOffset(0);
	};

	const handleBoardChange = (value: string) => {
		setBoard(value);
		setOffset(0);
	};

	const { data, isLoading, error } = useIdxCompanies({
		search: debouncedSearch || undefined,
		sector: sector || undefined,
		limit: PAGE_SIZE,
		offset,
	});

	// Client-side board filter (API may not support board param)
	const filtered = useMemo(() => {
		if (!data?.companies) return [];
		if (!board) return data.companies;
		return data.companies.filter((c) => c.papan_pencatatan === board);
	}, [data, board]);

	// Extract unique sectors for filter dropdown
	const allCompanies = useIdxCompanies({ limit: 1000 });
	const sectors = useMemo(() => {
		if (!allCompanies.data?.companies) return [];
		const unique = [...new Set(allCompanies.data.companies.map((c) => c.sector))].sort();
		return unique;
	}, [allCompanies.data]);

	const boards = useMemo(() => {
		if (!allCompanies.data?.companies) return [];
		return [...new Set(allCompanies.data.companies.map((c) => c.papan_pencatatan))].sort();
	}, [allCompanies.data]);

	const totalItems = data?.total ?? 0;
	const totalPages = Math.ceil(totalItems / PAGE_SIZE);
	const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

	const goToPage = useCallback(
		(page: number) => {
			const clamped = Math.max(1, Math.min(page, totalPages));
			setOffset((clamped - 1) * PAGE_SIZE);
		},
		[totalPages],
	);

	// Keyboard: / to focus search
	useKeyboardShortcut("/", () => {
		searchRef.current?.focus();
	}, []);

	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<IdxNav />
			<div className="mb-4">
				<h1 className="font-mono text-lg font-semibold tracking-wide text-white">IDX Explorer</h1>
				<p className="mt-1 text-sm text-t-text-secondary">
					Browse all IDX-listed companies and exchange member brokers.
				</p>
			</div>

			<div className="mb-4 flex gap-2">
				<TabButton active={tab === "companies"} onClick={() => setTab("companies")}>
					Companies
				</TabButton>
				<TabButton active={tab === "brokers"} onClick={() => setTab("brokers")}>
					Brokers
				</TabButton>
				<TabButton active={tab === "sectors"} onClick={() => setTab("sectors")}>
					Sectors
				</TabButton>
			</div>

			{tab === "companies" ? (
				<>
					<div className="mb-4 flex flex-wrap gap-3">
						<div className="relative min-w-[200px] flex-1">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-t-text-muted" />
							<input
								ref={searchRef}
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search by name or code... ( / )"
								className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 font-mono text-sm text-white placeholder-t-text-muted outline-none transition-colors focus:border-t-amber/50 focus:bg-white/[0.06]"
							/>
						</div>
						<select
							value={sector}
							onChange={(e) => handleSectorChange(e.target.value)}
							className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-t-text-secondary outline-none transition-colors focus:border-t-amber/50"
						>
							<option value="">All Sectors</option>
							{sectors.map((s) => (
								<option key={s} value={s}>
									{s}
								</option>
							))}
						</select>
						<select
							value={board}
							onChange={(e) => handleBoardChange(e.target.value)}
							className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-t-text-secondary outline-none transition-colors focus:border-t-amber/50"
						>
							<option value="">All Boards</option>
							{boards.map((b) => (
								<option key={b} value={b}>
									{b}
								</option>
							))}
						</select>
					</div>

					{isLoading ? (
						<Skeleton className="h-[400px] w-full rounded-xl" />
					) : error ? (
						<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
							Failed to load company data.
						</div>
					) : (
						<>
							<CompanyTable companies={filtered} />
							{totalPages > 1 && (
								<div className="mt-4 flex items-center justify-between">
									<span className="font-mono text-xs text-t-text-muted">
										Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, totalItems)} of {totalItems}
									</span>
									<div className="flex items-center gap-1">
										<PaginationButton
											disabled={currentPage <= 1}
											onClick={() => goToPage(currentPage - 1)}
										>
											←
										</PaginationButton>
										{paginationRange(currentPage, totalPages).map((page) =>
											page === "..." ? (
												<span
													key={`ellipsis-${page}`}
													className="px-2 font-mono text-xs text-t-text-muted"
												>
													...
												</span>
											) : (
												<PaginationButton
													key={page}
													active={page === currentPage}
													onClick={() => goToPage(page as number)}
												>
													{page}
												</PaginationButton>
											),
										)}
										<PaginationButton
											disabled={currentPage >= totalPages}
											onClick={() => goToPage(currentPage + 1)}
										>
											→
										</PaginationButton>
									</div>
								</div>
							)}
						</>
					)}
				</>
			) : tab === "brokers" ? (
				<BrokerTable />
			) : (
				<SectorsTab />
			)}
		</div>
	);
}

function SectorsTab() {
	const { data, isLoading, error } = useIdxSectors();

	if (isLoading) return <Skeleton className="h-[400px] w-full rounded-xl" />;
	if (error || !data) {
		return (
			<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
				Failed to load sector data.
			</div>
		);
	}

	const totalCompanies = data.sectors.reduce((sum, s) => sum + s.company_count, 0);

	return <SectorGrid sectors={data.sectors} totalCompanies={totalCompanies} />;
}

function TabButton({
	active,
	children,
	onClick,
}: {
	active: boolean;
	children: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={clsx(
				"rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
				active
					? "border-white/20 bg-white text-black"
					: "border-white/10 bg-white/[0.04] text-t-text-secondary hover:bg-white/10 hover:text-white",
			)}
		>
			{children}
		</button>
	);
}

function PaginationButton({
	active,
	children,
	disabled,
	onClick,
}: {
	active?: boolean;
	children: React.ReactNode;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className={clsx(
				"min-w-[32px] rounded-lg border px-2 py-1 font-mono text-xs transition-colors",
				disabled && "cursor-not-allowed opacity-30",
				active
					? "border-white/20 bg-white text-black"
					: "border-white/10 bg-white/[0.04] text-t-text-secondary hover:bg-white/10 hover:text-white",
			)}
		>
			{children}
		</button>
	);
}

function paginationRange(current: number, total: number): (number | "...")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const pages: (number | "...")[] = [1];
	if (current > 3) pages.push("...");
	const start = Math.max(2, current - 1);
	const end = Math.min(total - 1, current + 1);
	for (let i = start; i <= end; i++) pages.push(i);
	if (current < total - 2) pages.push("...");
	pages.push(total);
	return pages;
}
