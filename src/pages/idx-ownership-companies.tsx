import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { IdxNav } from "../components/idx/idx-nav";
import { OwnershipNav } from "../components/ownership/ownership-nav";
import { Skeleton } from "../components/ui/loading";
import { useKseiCompanies } from "../hooks/use-ksei";
import { useKeyboardShortcut } from "../hooks/use-keyboard";
import { usePageTitle } from "../hooks/use-page-title";

type SortCol = "total_insider_pct" | "investor_count" | "kode_emiten" | "issuer_name";

export function IdxOwnershipCompaniesPage() {
	usePageTitle("Ownership — Companies");

	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [page, setPage] = useState(1);
	const [sort, setSort] = useState<SortCol>("total_insider_pct");
	const [order, setOrder] = useState<"asc" | "desc">("desc");
	const searchRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const id = setTimeout(() => {
			setDebouncedSearch(search);
			setPage(1);
		}, 300);
		return () => clearTimeout(id);
	}, [search]);

	const { data, isLoading } = useKseiCompanies({
		page,
		per_page: 50,
		sort,
		order,
		search: debouncedSearch || undefined,
	});

	useKeyboardShortcut("/", () => searchRef.current?.focus(), []);

	function toggleSort(col: SortCol) {
		if (sort === col) {
			setOrder((o) => (o === "desc" ? "asc" : "desc"));
		} else {
			setSort(col);
			setOrder("desc");
		}
		setPage(1);
	}

	function sortIcon(col: SortCol) {
		if (sort !== col) return "";
		return order === "desc" ? " ↓" : " ↑";
	}

	const totalPages = data ? Math.ceil(data.total / data.per_page) : 0;

	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<IdxNav />
			<OwnershipNav />
			<div className="mb-4">
				<h1 className="font-mono text-lg font-semibold tracking-wide text-white">
					Companies by Ownership
				</h1>
				<p className="mt-1 text-sm text-t-text-secondary">
					{data?.total ?? "—"} IDX companies ranked by KSEI insider ownership concentration.
				</p>
			</div>

			<div className="relative mb-4 max-w-lg">
				<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-t-text-muted" />
				<input
					ref={searchRef}
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search company or ticker... ( / )"
					className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 font-mono text-sm text-white placeholder-t-text-muted outline-none transition-colors focus:border-t-amber/50 focus:bg-white/[0.06]"
				/>
			</div>

			{isLoading ? (
				<Skeleton className="h-[500px] w-full rounded-xl" />
			) : data ? (
				<>
					<div className="overflow-x-auto rounded-xl border border-white/8">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-white/8 bg-white/[0.03]">
									<th
										className="cursor-pointer px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted hover:text-t-text-secondary"
										onClick={() => toggleSort("kode_emiten")}
									>
										Code{sortIcon("kode_emiten")}
									</th>
									<th
										className="cursor-pointer px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted hover:text-t-text-secondary"
										onClick={() => toggleSort("issuer_name")}
									>
										Company{sortIcon("issuer_name")}
									</th>
									<th
										className="cursor-pointer px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted hover:text-t-text-secondary"
										onClick={() => toggleSort("investor_count")}
									>
										Investors{sortIcon("investor_count")}
									</th>
									<th
										className="cursor-pointer px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted hover:text-t-text-secondary"
										onClick={() => toggleSort("total_insider_pct")}
									>
										Insider %{sortIcon("total_insider_pct")}
									</th>
									<th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
										Bar
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{data.companies.map((c) => (
									<tr
										key={c.kode_emiten}
										className="transition-colors hover:bg-white/[0.04]"
									>
										<td className="px-3 py-2">
											<Link
												to={`/idx/${c.kode_emiten}`}
												className="font-mono text-sm font-semibold text-t-green hover:underline"
											>
												{c.kode_emiten}
											</Link>
										</td>
										<td className="max-w-[300px] truncate px-3 py-2 text-t-text">
											{c.issuer_name}
										</td>
										<td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-t-text-secondary">
											{c.investor_count}
										</td>
										<td className="px-3 py-2 text-right font-mono text-xs font-medium tabular-nums text-t-amber">
											{c.total_insider_pct.toFixed(1)}%
										</td>
										<td className="px-3 py-2 w-[120px]">
											<div className="h-2 w-full rounded-full bg-white/[0.06]">
												<div
													className="h-2 rounded-full bg-t-amber/60"
													style={{ width: `${Math.min(c.total_insider_pct, 100)}%` }}
												/>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="mt-4 flex items-center justify-between">
							<span className="font-mono text-[11px] text-t-text-muted">
								Page {page} of {totalPages} ({data.total} companies)
							</span>
							<div className="flex gap-2">
								<button
									type="button"
									disabled={page <= 1}
									onClick={() => setPage((p) => p - 1)}
									className="rounded border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-t-text-secondary transition-colors hover:bg-white/10 disabled:opacity-30"
								>
									Prev
								</button>
								<button
									type="button"
									disabled={page >= totalPages}
									onClick={() => setPage((p) => p + 1)}
									className="rounded border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-t-text-secondary transition-colors hover:bg-white/10 disabled:opacity-30"
								>
									Next
								</button>
							</div>
						</div>
					)}
				</>
			) : null}
		</div>
	);
}
