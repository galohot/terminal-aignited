import { clsx } from "clsx";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrokerTable } from "../components/idx/broker-table";
import { CompanyTable } from "../components/idx/company-table";
import { IdxNav } from "../components/idx/idx-nav";
import { SectorTreemap } from "../components/idx/sector-treemap";
import { Skeleton } from "../components/ui/loading";
import { useIdxCompanies } from "../hooks/use-idx-companies";
import { useIdxSectors } from "../hooks/use-idx-screener";
import { useKeyboardShortcut } from "../hooks/use-keyboard";
import { usePageTitle } from "../hooks/use-page-title";

type Tab = "companies" | "brokers" | "sectors";
const PAGE_SIZE = 50;

export function IdxExplorerPage() {
	usePageTitle("IDX Explorer");
	const [tab, setTab] = useState<Tab>("companies");
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [sector, setSector] = useState("");
	const [board, setBoard] = useState("");
	const [offset, setOffset] = useState(0);
	const searchRef = useRef<HTMLInputElement>(null);

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

	const filtered = useMemo(() => {
		if (!data?.companies) return [];
		if (!board) return data.companies;
		return data.companies.filter((c) => c.papan_pencatatan === board);
	}, [data, board]);

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

	useKeyboardShortcut("/", () => {
		searchRef.current?.focus();
	}, []);

	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<IdxNav />
			<div className="mb-4">
				<h1
					className="break-words text-3xl font-semibold tracking-tight text-ink sm:text-[2.25rem]"
					style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
				>
					IDX Explorer
				</h1>
				<p className="mt-2 text-sm leading-6 text-ink-3">
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
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
							<input
								ref={searchRef}
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search by name or code... ( / )"
								className="w-full rounded-[12px] border border-rule bg-paper-2 py-2 pl-9 pr-3 font-mono text-sm text-ink placeholder:text-ink-4 outline-none transition-colors focus:border-ember-500 focus:bg-card focus:ring-2 focus:ring-ember-500/15"
							/>
						</div>
						<select
							value={sector}
							onChange={(e) => handleSectorChange(e.target.value)}
							className="rounded-[12px] border border-rule bg-paper-2 px-3 py-2 font-mono text-sm text-ink-2 outline-none transition-colors focus:border-ember-500 focus:ring-2 focus:ring-ember-500/15"
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
							className="rounded-[12px] border border-rule bg-paper-2 px-3 py-2 font-mono text-sm text-ink-2 outline-none transition-colors focus:border-ember-500 focus:ring-2 focus:ring-ember-500/15"
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
						<Skeleton className="h-[400px] w-full rounded-[18px]" />
					) : error ? (
						<div className="rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-8 text-center text-sm text-ink-4">
							Failed to load company data.
						</div>
					) : (
						<>
							<CompanyTable companies={filtered} />
							{totalPages > 1 && (
								<div className="mt-4 flex items-center justify-between">
									<span className="font-mono text-xs text-ink-4">
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
													className="px-2 font-mono text-xs text-ink-4"
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

	if (isLoading) return <Skeleton className="h-[400px] w-full rounded-[18px]" />;
	if (error || !data) {
		return (
			<div className="rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-8 text-center text-sm text-ink-4">
				Failed to load sector data.
			</div>
		);
	}

	return (
		<SectorTreemap
			sectors={data.sectors}
			onSectorClick={(sector) => {
				window.location.href = `/idx/screener?sector=${encodeURIComponent(sector)}&sort=roe&order=desc`;
			}}
		/>
	);
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
					? "border-ink bg-ink text-paper"
					: "border-rule bg-card text-ink-3 hover:bg-paper-2 hover:text-ink",
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
				"min-w-[32px] rounded-[10px] border px-2 py-1 font-mono text-xs transition-colors",
				disabled && "cursor-not-allowed opacity-40",
				active
					? "border-ink bg-ink text-paper"
					: "border-rule bg-card text-ink-3 hover:bg-paper-2 hover:text-ink",
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
