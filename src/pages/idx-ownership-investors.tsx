import { clsx } from "clsx";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { INVESTOR_TYPE_COLORS, INVESTOR_TYPE_LABELS } from "../components/ownership/constants";
import { Badge } from "../components/ownership/ownership-badge";
import type { InvestorType } from "../components/ownership/types";
import { IdxNav } from "../components/idx/idx-nav";
import { OwnershipNav } from "../components/ownership/ownership-nav";
import { Skeleton } from "../components/ui/loading";
import { useKseiInvestors } from "../hooks/use-ksei";
import { useKeyboardShortcut } from "../hooks/use-keyboard";
import { usePageTitle } from "../hooks/use-page-title";

type SortCol = "company_count" | "investor_name" | "investor_type" | "local_foreign" | "total_pct";

const TYPE_FILTERS: InvestorType[] = ["CP", "ID", "IB", "MF", "SC", "IS", "PF", "FD", "OT"];

export function IdxOwnershipInvestorsPage() {
	usePageTitle("Ownership — Investors");

	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [page, setPage] = useState(1);
	const [sort, setSort] = useState<SortCol>("company_count");
	const [order, setOrder] = useState<"asc" | "desc">("desc");
	const [typeFilter, setTypeFilter] = useState("");
	const [lfFilter, setLfFilter] = useState("");
	const searchRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const id = setTimeout(() => {
			setDebouncedSearch(search);
			setPage(1);
		}, 300);
		return () => clearTimeout(id);
	}, [search]);

	const { data, isLoading } = useKseiInvestors({
		page,
		per_page: 50,
		sort,
		order,
		search: debouncedSearch || undefined,
		investor_type: typeFilter || undefined,
		local_foreign: lfFilter || undefined,
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
					Investors
				</h1>
				<p className="mt-1 text-sm text-t-text-secondary">
					{data?.total ?? "—"} unique investors in the KSEI 1%+ shareholder registry.
				</p>
			</div>

			{/* Filters */}
			<div className="mb-4 flex flex-wrap items-end gap-4">
				<div className="relative max-w-sm flex-1">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-t-text-muted" />
					<input
						ref={searchRef}
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search investor... ( / )"
						className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 font-mono text-sm text-white placeholder-t-text-muted outline-none transition-colors focus:border-t-amber/50 focus:bg-white/[0.06]"
					/>
				</div>

				{/* Type filter pills */}
				<div className="flex flex-wrap gap-1">
					<button
						type="button"
						onClick={() => { setTypeFilter(""); setPage(1); }}
						className={clsx(
							"rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
							!typeFilter
								? "border-white/20 bg-white text-black"
								: "border-white/10 bg-white/[0.04] text-t-text-secondary hover:bg-white/10",
						)}
					>
						All
					</button>
					{TYPE_FILTERS.map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => { setTypeFilter(typeFilter === t ? "" : t); setPage(1); }}
							className={clsx(
								"rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
								typeFilter === t
									? "border-white/20 bg-white text-black"
									: "border-white/10 bg-white/[0.04] text-t-text-secondary hover:bg-white/10",
							)}
						>
							{t}
						</button>
					))}
				</div>

				{/* L/F filter */}
				<div className="flex gap-1">
					{[
						{ val: "", label: "All" },
						{ val: "L", label: "Local" },
						{ val: "A", label: "Foreign" },
					].map((opt) => (
						<button
							key={opt.val}
							type="button"
							onClick={() => { setLfFilter(opt.val); setPage(1); }}
							className={clsx(
								"rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
								lfFilter === opt.val
									? "border-white/20 bg-white text-black"
									: "border-white/10 bg-white/[0.04] text-t-text-secondary hover:bg-white/10",
							)}
						>
							{opt.label}
						</button>
					))}
				</div>
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
										onClick={() => toggleSort("investor_name")}
									>
										Name{sortIcon("investor_name")}
									</th>
									<th
										className="cursor-pointer px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted hover:text-t-text-secondary"
										onClick={() => toggleSort("investor_type")}
									>
										Type{sortIcon("investor_type")}
									</th>
									<th
										className="cursor-pointer px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted hover:text-t-text-secondary"
										onClick={() => toggleSort("local_foreign")}
									>
										L/F{sortIcon("local_foreign")}
									</th>
									<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted sm:table-cell">
										Domicile
									</th>
									<th
										className="cursor-pointer px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted hover:text-t-text-secondary"
										onClick={() => toggleSort("company_count")}
									>
										Companies{sortIcon("company_count")}
									</th>
									<th
										className="cursor-pointer px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted hover:text-t-text-secondary"
										onClick={() => toggleSort("total_pct")}
									>
										Total %{sortIcon("total_pct")}
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{data.investors.map((inv) => (
									<tr
										key={`${inv.investor_name}-${inv.investor_type}`}
										className="transition-colors hover:bg-white/[0.04]"
									>
										<td className="max-w-[320px] truncate px-3 py-2">
											<Link
												to={`/idx/ownership/investor/${encodeURIComponent(inv.investor_name)}`}
												className="font-mono text-xs font-medium text-t-text hover:text-t-amber hover:underline"
											>
												{inv.investor_name}
											</Link>
										</td>
										<td className="px-3 py-2">
											<Badge type={inv.investor_type as InvestorType} />
										</td>
										<td className="px-3 py-2 text-center">
											<span
												className={clsx(
													"rounded-full border px-2 py-0.5 font-mono text-[10px]",
													inv.local_foreign === "L"
														? "border-t-green/30 bg-t-green/10 text-t-green"
														: inv.local_foreign === "A"
															? "border-t-blue/30 bg-t-blue/10 text-t-blue"
															: "border-white/10 bg-white/[0.04] text-t-text-muted",
												)}
											>
												{inv.local_foreign === "L" ? "Local" : inv.local_foreign === "A" ? "Foreign" : "—"}
											</span>
										</td>
										<td className="hidden px-3 py-2 text-xs text-t-text-secondary sm:table-cell">
											{inv.domicile || "—"}
										</td>
										<td className="px-3 py-2 text-right font-mono text-xs font-medium tabular-nums text-t-amber">
											{inv.company_count}
										</td>
										<td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-t-text-secondary">
											{inv.total_pct.toFixed(1)}%
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className="mt-4 flex items-center justify-between">
							<span className="font-mono text-[11px] text-t-text-muted">
								Page {page} of {totalPages} ({data.total} investors)
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
