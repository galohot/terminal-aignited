import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { IdxNav } from "../components/idx/idx-nav";
import { OwnershipNav } from "../components/ownership/ownership-nav";
import { Skeleton } from "../components/ui/loading";
import { useKeyboardShortcut } from "../hooks/use-keyboard";
import { useKseiCompanies } from "../hooks/use-ksei";
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
			<div className="mb-5">
				<h1
					className="text-[clamp(2rem,4vw,2.5rem)] leading-[1.05] text-ink"
					style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
				>
					Companies <em className="text-ember-600">by Ownership</em>
				</h1>
				<p className="mt-2 max-w-2xl text-sm text-ink-3">
					{data?.total ?? "—"} IDX companies ranked by KSEI insider ownership concentration.
				</p>
			</div>

			<div className="relative mb-4 max-w-lg">
				<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
				<input
					ref={searchRef}
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search company or ticker... ( / )"
					className="w-full rounded-lg border border-rule bg-card py-2 pl-9 pr-3 font-mono text-sm text-ink placeholder-ink-4 outline-none transition-colors focus:border-ember-500 focus:ring-2 focus:ring-ember-500/15"
				/>
			</div>

			{isLoading ? (
				<Skeleton className="h-[500px] w-full rounded-xl" />
			) : data ? (
				<>
					<div className="overflow-x-auto rounded-[18px] border border-rule bg-card">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-rule bg-paper-2">
									<th
										className="cursor-pointer px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 hover:text-ink-2"
										onClick={() => toggleSort("kode_emiten")}
									>
										Code{sortIcon("kode_emiten")}
									</th>
									<th
										className="cursor-pointer px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 hover:text-ink-2"
										onClick={() => toggleSort("issuer_name")}
									>
										Company{sortIcon("issuer_name")}
									</th>
									<th
										className="cursor-pointer px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 hover:text-ink-2"
										onClick={() => toggleSort("investor_count")}
									>
										Investors{sortIcon("investor_count")}
									</th>
									<th
										className="cursor-pointer px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 hover:text-ink-2"
										onClick={() => toggleSort("total_insider_pct")}
									>
										Insider %{sortIcon("total_insider_pct")}
									</th>
									<th className="px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
										Bar
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-rule">
								{data.companies.map((c) => (
									<tr key={c.kode_emiten} className="transition-colors hover:bg-paper-2/60">
										<td className="px-3 py-2">
											<Link
												to={`/idx/${c.kode_emiten}`}
												className="font-mono text-sm font-semibold text-ember-600 hover:underline"
											>
												{c.kode_emiten}
											</Link>
										</td>
										<td className="max-w-[300px] truncate px-3 py-2 text-ink">
											{c.issuer_name}
										</td>
										<td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-ink-2">
											{c.investor_count}
										</td>
										<td className="px-3 py-2 text-right font-mono text-xs font-medium tabular-nums text-ember-700">
											{c.total_insider_pct.toFixed(1)}%
										</td>
										<td className="w-[120px] px-3 py-2">
											<div className="h-2 w-full rounded-full bg-paper-2">
												<div
													className="h-2 rounded-full bg-ember-500/60"
													style={{ width: `${Math.min(c.total_insider_pct, 100)}%` }}
												/>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className="mt-4 flex items-center justify-between">
							<span className="font-mono text-[11px] text-ink-4">
								Page {page} of {totalPages} ({data.total} companies)
							</span>
							<div className="flex gap-2">
								<button
									type="button"
									disabled={page <= 1}
									onClick={() => setPage((p) => p - 1)}
									className="rounded border border-rule bg-card px-3 py-1 font-mono text-[11px] text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink disabled:opacity-30"
								>
									Prev
								</button>
								<button
									type="button"
									disabled={page >= totalPages}
									onClick={() => setPage((p) => p + 1)}
									className="rounded border border-rule bg-card px-3 py-1 font-mono text-[11px] text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink disabled:opacity-30"
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
