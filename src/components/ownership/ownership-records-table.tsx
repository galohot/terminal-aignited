import clsx from "clsx";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { INVESTOR_TYPE_COLORS, INVESTOR_TYPE_LABELS, LOCAL_FOREIGN_LABELS } from "./constants";
import { Badge } from "./ownership-badge";
import type { InvestorType } from "./types";

function fmtNum(n: number): string {
	return n.toLocaleString("en-US");
}

function formatShares(n: number): string {
	if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

export interface ShareholderRecord {
	SHARE_CODE: string;
	ISSUER_NAME: string;
	INVESTOR_NAME: string;
	INVESTOR_TYPE: InvestorType;
	LOCAL_FOREIGN: "L" | "A" | "";
	DOMICILE: string;
	NATIONALITY: string;
	TOTAL_HOLDING_SHARES: number;
	PERCENTAGE: number;
}

interface RecordsTableProps {
	records: ShareholderRecord[];
	totalRecords?: number;
	page?: number;
	onPageChange?: (page: number) => void;
	pageSize?: number;
}

type SortKey =
	| "SHARE_CODE"
	| "ISSUER_NAME"
	| "INVESTOR_NAME"
	| "INVESTOR_TYPE"
	| "LOCAL_FOREIGN"
	| "DOMICILE"
	| "NATIONALITY"
	| "TOTAL_HOLDING_SHARES"
	| "PERCENTAGE";

type SortDir = "asc" | "desc";

const ALL_TYPES = Object.keys(INVESTOR_TYPE_COLORS) as InvestorType[];
const PAGE_SIZE = 25;

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
	{ key: "SHARE_CODE", label: "Code", className: "w-[72px]" },
	{ key: "ISSUER_NAME", label: "Company" },
	{ key: "INVESTOR_NAME", label: "Investor" },
	{ key: "INVESTOR_TYPE", label: "Type", className: "w-[120px]" },
	{ key: "LOCAL_FOREIGN", label: "L/F", className: "w-[68px]" },
	{
		key: "NATIONALITY",
		label: "Nationality",
		className: "hidden xl:table-cell",
	},
	{ key: "DOMICILE", label: "Domicile", className: "hidden lg:table-cell" },
	{
		key: "TOTAL_HOLDING_SHARES",
		label: "Shares",
		className: "text-right w-[100px]",
	},
	{ key: "PERCENTAGE", label: "%", className: "text-right w-[64px]" },
];

export function RecordsTable({
	records,
	totalRecords,
	page: externalPage,
	onPageChange,
	pageSize = PAGE_SIZE,
}: RecordsTableProps) {
	const [query, setQuery] = useState("");
	const [selectedTypes, setSelectedTypes] = useState<InvestorType[]>([]);
	const [selectedLF, setSelectedLF] = useState<("L" | "A" | "")[]>([]);
	const [sortKey, setSortKey] = useState<SortKey>("PERCENTAGE");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	const [internalPage, setInternalPage] = useState(0);

	const page = externalPage ?? internalPage;
	const setPage = onPageChange ?? setInternalPage;

	function toggleType(t: InvestorType) {
		setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
		setPage(0);
	}

	function toggleLF(v: "L" | "A" | "") {
		setSelectedLF((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
		setPage(0);
	}

	function handleSort(key: SortKey) {
		if (sortKey === key) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir(key === "PERCENTAGE" || key === "TOTAL_HOLDING_SHARES" ? "desc" : "asc");
		}
		setPage(0);
	}

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		let result = records;

		if (q) {
			result = result.filter(
				(r) =>
					r.SHARE_CODE.toLowerCase().includes(q) ||
					r.ISSUER_NAME.toLowerCase().includes(q) ||
					r.INVESTOR_NAME.toLowerCase().includes(q) ||
					r.DOMICILE.toLowerCase().includes(q) ||
					r.NATIONALITY.toLowerCase().includes(q),
			);
		}

		if (selectedTypes.length > 0) {
			result = result.filter((r) => selectedTypes.includes(r.INVESTOR_TYPE));
		}

		if (selectedLF.length > 0) {
			result = result.filter((r) => selectedLF.includes(r.LOCAL_FOREIGN));
		}

		result = [...result].sort((a, b) => {
			const av = a[sortKey];
			const bv = b[sortKey];
			let cmp = 0;
			if (typeof av === "number" && typeof bv === "number") {
				cmp = av - bv;
			} else {
				cmp = String(av).localeCompare(String(bv));
			}
			return sortDir === "asc" ? cmp : -cmp;
		});

		return result;
	}, [records, query, selectedTypes, selectedLF, sortKey, sortDir]);

	const effectiveTotal = totalRecords ?? filtered.length;
	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
	const safePage = Math.min(page, totalPages - 1);
	const pageRows = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

	const hasFilters = query || selectedTypes.length > 0 || selectedLF.length > 0;

	return (
		<div className="overflow-hidden">
			{/* Header */}
			<div className="flex items-start justify-between gap-4 mb-4">
				<div>
					<h3 className="font-mono text-[13px] font-semibold text-ink tracking-tight">
						All Holdings
					</h3>
					<p className="font-mono text-[11px] text-ink-4 mt-0.5">
						<span className="font-mono font-semibold text-ink">{fmtNum(filtered.length)}</span>{" "}
						records
						{hasFilters && <span className="text-ink-4"> of {fmtNum(effectiveTotal)}</span>}
					</p>
				</div>
				{hasFilters && (
					<button
						type="button"
						onClick={() => {
							setQuery("");
							setSelectedTypes([]);
							setSelectedLF([]);
							setPage(0);
						}}
						className="font-mono text-[11px] font-medium text-ember-600 hover:text-ember-600/80 transition-colors flex items-center gap-1"
					>
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
						>
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
						Clear filters
					</button>
				)}
			</div>

			{/* Filters */}
			<div className="space-y-3">
				{/* Search */}
				<div className="relative">
					<svg
						className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<circle cx="11" cy="11" r="8" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
					<input
						type="text"
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setPage(0);
						}}
						placeholder="Search code, company, investor, domicile..."
						className="w-full rounded-lg border border-rule bg-card pl-10 pr-4 py-2 font-mono text-sm text-ink placeholder:text-ink-4/70 focus:outline-none focus:ring-2 focus:ring-ember-500/15 focus:border-ember-500 transition-all"
					/>
				</div>

				{/* Type pills */}
				<div className="flex flex-wrap gap-1.5">
					{ALL_TYPES.map((t) => {
						const selected = selectedTypes.includes(t);
						return (
							<button
								type="button"
								key={t}
								onClick={() => toggleType(t)}
								className={clsx(
									"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium transition-all duration-200",
									selected
										? "border-transparent shadow-sm"
										: "border-rule text-ink-4 hover:text-ink hover:border-rule hover:bg-paper-2",
								)}
								style={
									selected
										? {
												backgroundColor: `${INVESTOR_TYPE_COLORS[t]}12`,
												color: INVESTOR_TYPE_COLORS[t],
												borderColor: `${INVESTOR_TYPE_COLORS[t]}25`,
											}
										: undefined
								}
							>
								<span
									className="h-1.5 w-1.5 rounded-full shrink-0 transition-transform duration-200"
									style={{
										backgroundColor: INVESTOR_TYPE_COLORS[t],
										transform: selected ? "scale(1.3)" : "scale(1)",
									}}
								/>
								{INVESTOR_TYPE_LABELS[t]}
							</button>
						);
					})}

					<span className="w-px h-6 bg-rule self-center mx-1.5" />

					{(["L", "A", ""] as const).map((v) => (
						<button
							type="button"
							key={v}
							onClick={() => toggleLF(v)}
							className={clsx(
								"inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium transition-all duration-200",
								selectedLF.includes(v)
									? "border-ember-400/30 bg-ember-50 text-ember-700 shadow-sm"
									: "border-rule text-ink-4 hover:text-ink hover:border-rule hover:bg-paper-2",
							)}
						>
							{LOCAL_FOREIGN_LABELS[v]}
						</button>
					))}
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto mt-4">
				<table className="w-full border-collapse">
					<thead>
						<tr className="border-b border-rule">
							{COLUMNS.map((col) => (
								<th
									key={col.key}
									onClick={() => handleSort(col.key)}
									className={clsx(
										"text-left font-mono text-[11px] font-semibold text-ink-4 uppercase tracking-wider px-2 py-2 cursor-pointer select-none",
										col.className,
									)}
								>
									<span className="inline-flex items-center gap-1">
										{col.label}
										{sortKey === col.key && (
											<svg
												width="10"
												height="10"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2.5"
												className={clsx(
													"transition-transform text-ember-600",
													sortDir === "asc" ? "rotate-180" : "",
												)}
											>
												<polyline points="6 9 12 15 18 9" />
											</svg>
										)}
									</span>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{pageRows.map((r, i) => (
							<tr
								key={`${r.SHARE_CODE}-${r.INVESTOR_NAME}-${i}`}
								className="border-b border-rule/50 hover:bg-paper-2/60 transition-colors"
							>
								<td className="px-2 py-1.5">
									<Link
										to={`/idx/${r.SHARE_CODE}`}
										className="font-mono font-bold text-ember-600 hover:underline underline-offset-2"
									>
										{r.SHARE_CODE}
									</Link>
								</td>
								<td className="px-2 py-1.5 max-w-[200px]">
									<Link
										to={`/idx/${r.SHARE_CODE}`}
										className="font-mono text-[12px] text-ink truncate block hover:text-ember-600 transition-colors"
										title={r.ISSUER_NAME}
									>
										{r.ISSUER_NAME}
									</Link>
								</td>
								<td className="px-2 py-1.5 max-w-[200px]">
									<Link
										to={`/idx/ownership/investor/${encodeURIComponent(r.INVESTOR_NAME)}`}
										className="font-mono text-[12px] text-ink truncate block hover:text-ember-600 transition-colors"
										title={r.INVESTOR_NAME}
									>
										{r.INVESTOR_NAME}
									</Link>
								</td>
								<td className="px-2 py-1.5">
									<Badge type={r.INVESTOR_TYPE} />
								</td>
								<td className="px-2 py-1.5">
									<span
										className={clsx(
											"inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold",
											r.LOCAL_FOREIGN === "L"
												? "bg-pos/10 text-pos"
												: r.LOCAL_FOREIGN === "A"
													? "bg-cyan-50 text-cyan-700"
													: "bg-paper-2 text-ink-4",
										)}
									>
										{LOCAL_FOREIGN_LABELS[r.LOCAL_FOREIGN]}
									</span>
								</td>
								<td className="px-2 py-1.5 font-mono text-[12px] text-ink-4 hidden xl:table-cell">
									{r.NATIONALITY || "\u2014"}
								</td>
								<td className="px-2 py-1.5 font-mono text-[12px] text-ink-4 hidden lg:table-cell">
									{r.DOMICILE || "\u2014"}
								</td>
								<td className="px-2 py-1.5 text-right font-mono text-[12px] text-ink-4 tabular-nums">
									{formatShares(r.TOTAL_HOLDING_SHARES)}
								</td>
								<td className="px-2 py-1.5 text-right font-mono text-[12px] font-bold text-ink tabular-nums">
									{r.PERCENTAGE.toFixed(2)}
								</td>
							</tr>
						))}
						{pageRows.length === 0 && (
							<tr>
								<td colSpan={COLUMNS.length} className="!py-12 text-center text-ink-4">
									<div className="flex flex-col items-center gap-2">
										<svg
											width="32"
											height="32"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.5"
											className="text-ink-4/40"
										>
											<circle cx="11" cy="11" r="8" />
											<line x1="21" y1="21" x2="16.65" y2="16.65" />
										</svg>
										<span className="font-mono text-sm">No records match your filters.</span>
									</div>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between py-3 mt-2">
					<p className="font-mono text-[11px] text-ink-4 font-medium">
						<span className="font-mono tabular-nums">{fmtNum(safePage * pageSize + 1)}</span>
						<span className="mx-0.5">&ndash;</span>
						<span className="font-mono tabular-nums">
							{fmtNum(Math.min((safePage + 1) * pageSize, filtered.length))}
						</span>
						<span className="mx-1">of</span>
						<span className="font-mono tabular-nums">{fmtNum(filtered.length)}</span>
					</p>
					<div className="flex items-center gap-0.5">
						<button
							type="button"
							onClick={() => setPage(0)}
							disabled={safePage === 0}
							className="p-1 rounded text-ink-4 hover:text-ink hover:bg-paper-2 disabled:opacity-30 disabled:pointer-events-none transition-colors"
							title="First page"
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<polyline points="11 17 6 12 11 7" />
								<polyline points="18 17 13 12 18 7" />
							</svg>
						</button>
						<button
							type="button"
							onClick={() => setPage(Math.max(0, safePage - 1))}
							disabled={safePage === 0}
							className="p-1 rounded text-ink-4 hover:text-ink hover:bg-paper-2 disabled:opacity-30 disabled:pointer-events-none transition-colors"
							title="Previous page"
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<polyline points="15 18 9 12 15 6" />
							</svg>
						</button>
						<span className="px-3 py-1 font-mono text-xs font-semibold tabular-nums text-ink">
							{safePage + 1}
							<span className="text-ink-4 font-normal mx-0.5">/</span>
							{totalPages}
						</span>
						<button
							type="button"
							onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
							disabled={safePage >= totalPages - 1}
							className="p-1 rounded text-ink-4 hover:text-ink hover:bg-paper-2 disabled:opacity-30 disabled:pointer-events-none transition-colors"
							title="Next page"
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<polyline points="9 18 15 12 9 6" />
							</svg>
						</button>
						<button
							type="button"
							onClick={() => setPage(totalPages - 1)}
							disabled={safePage >= totalPages - 1}
							className="p-1 rounded text-ink-4 hover:text-ink hover:bg-paper-2 disabled:opacity-30 disabled:pointer-events-none transition-colors"
							title="Last page"
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<polyline points="13 17 18 12 13 7" />
								<polyline points="6 17 11 12 6 7" />
							</svg>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
