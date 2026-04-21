import { clsx } from "clsx";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { IdxNav } from "../components/idx/idx-nav";
import { Badge } from "../components/ownership/ownership-badge";
import { OwnershipNav } from "../components/ownership/ownership-nav";
import type { InvestorType } from "../components/ownership/types";
import { Skeleton } from "../components/ui/loading";
import { useKeyboardShortcut } from "../hooks/use-keyboard";
import { useKseiInvestors } from "../hooks/use-ksei";
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
			<div className="mb-5">
				<h1
					className="text-[clamp(2rem,4vw,2.5rem)] leading-[1.05] text-ink"
					style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
				>
					<em className="text-ember-600">Investors</em>
				</h1>
				<p className="mt-2 max-w-2xl text-sm text-ink-3">
					{data?.total ?? "—"} unique investors in the KSEI 1%+ shareholder registry.
				</p>
			</div>

			<div className="mb-4 flex flex-wrap items-end gap-4">
				<div className="relative max-w-sm flex-1">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
					<input
						ref={searchRef}
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search investor... ( / )"
						className="w-full rounded-lg border border-rule bg-card py-2 pl-9 pr-3 font-mono text-sm text-ink placeholder-ink-4 outline-none transition-colors focus:border-ember-500 focus:ring-2 focus:ring-ember-500/15"
					/>
				</div>

				<div className="flex flex-wrap gap-1">
					<button
						type="button"
						onClick={() => {
							setTypeFilter("");
							setPage(1);
						}}
						className={clsx(
							"rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
							!typeFilter
								? "border-ink bg-ink text-paper"
								: "border-rule bg-card text-ink-3 hover:bg-paper-2 hover:text-ink",
						)}
					>
						All
					</button>
					{TYPE_FILTERS.map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => {
								setTypeFilter(typeFilter === t ? "" : t);
								setPage(1);
							}}
							className={clsx(
								"rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
								typeFilter === t
									? "border-ink bg-ink text-paper"
									: "border-rule bg-card text-ink-3 hover:bg-paper-2 hover:text-ink",
							)}
						>
							{t}
						</button>
					))}
				</div>

				<div className="flex gap-1">
					{[
						{ val: "", label: "All" },
						{ val: "L", label: "Local" },
						{ val: "A", label: "Foreign" },
					].map((opt) => (
						<button
							key={opt.val}
							type="button"
							onClick={() => {
								setLfFilter(opt.val);
								setPage(1);
							}}
							className={clsx(
								"rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
								lfFilter === opt.val
									? "border-ink bg-ink text-paper"
									: "border-rule bg-card text-ink-3 hover:bg-paper-2 hover:text-ink",
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
					<div className="overflow-x-auto rounded-[18px] border border-rule bg-card">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-rule bg-paper-2">
									<th
										className="cursor-pointer px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 hover:text-ink-2"
										onClick={() => toggleSort("investor_name")}
									>
										Name{sortIcon("investor_name")}
									</th>
									<th
										className="cursor-pointer px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 hover:text-ink-2"
										onClick={() => toggleSort("investor_type")}
									>
										Type{sortIcon("investor_type")}
									</th>
									<th
										className="cursor-pointer px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 hover:text-ink-2"
										onClick={() => toggleSort("local_foreign")}
									>
										L/F{sortIcon("local_foreign")}
									</th>
									<th className="hidden px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 sm:table-cell">
										Domicile
									</th>
									<th
										className="cursor-pointer px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 hover:text-ink-2"
										onClick={() => toggleSort("company_count")}
									>
										Companies{sortIcon("company_count")}
									</th>
									<th
										className="cursor-pointer px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 hover:text-ink-2"
										onClick={() => toggleSort("total_pct")}
									>
										Total %{sortIcon("total_pct")}
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-rule">
								{data.investors.map((inv) => (
									<tr
										key={`${inv.investor_name}-${inv.investor_type}`}
										className="transition-colors hover:bg-paper-2/60"
									>
										<td className="max-w-[320px] truncate px-3 py-2">
											<Link
												to={`/idx/ownership/investor/${encodeURIComponent(inv.investor_name)}`}
												className="font-mono text-xs font-medium text-ink hover:text-ember-600 hover:underline"
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
														? "border-pos/30 bg-pos/10 text-pos"
														: inv.local_foreign === "A"
															? "border-cyan-400/30 bg-cyan-50 text-cyan-700"
															: "border-rule bg-paper-2 text-ink-4",
												)}
											>
												{inv.local_foreign === "L"
													? "Local"
													: inv.local_foreign === "A"
														? "Foreign"
														: "—"}
											</span>
										</td>
										<td className="hidden px-3 py-2 text-xs text-ink-2 sm:table-cell">
											{inv.domicile || "—"}
										</td>
										<td className="px-3 py-2 text-right font-mono text-xs font-medium tabular-nums text-ember-700">
											{inv.company_count}
										</td>
										<td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-ink-2">
											{inv.total_pct.toFixed(1)}%
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className="mt-4 flex items-center justify-between">
							<span className="font-mono text-[11px] text-ink-4">
								Page {page} of {totalPages} ({data.total} investors)
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
