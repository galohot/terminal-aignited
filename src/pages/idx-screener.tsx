import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { IdxNav } from "../components/idx/idx-nav";
import { ScreenerBubbleChart } from "../components/idx/screener-bubble-chart";
import { Skeleton } from "../components/ui/loading";
import { useIdxScreener, useIdxSectors } from "../hooks/use-idx-screener";
import { usePageTitle } from "../hooks/use-page-title";
import type { IdxScreenerParams } from "../types/market";

const PAGE_SIZE = 50;

interface Preset {
	label: string;
	params: Partial<IdxScreenerParams>;
}

const PRESETS: Preset[] = [
	{ label: "Value", params: { pbv_max: 1, roe_min: 5, sort: "roe", order: "desc" } },
	{ label: "Growth", params: { roe_min: 20, npm_min: 15, sort: "roe", order: "desc" } },
	{
		label: "Dividend",
		params: { roe_min: 10, per_max: 15, der_max: 2, sort: "roe", order: "desc" },
	},
	{ label: "Low Debt", params: { der_max: 1, roe_min: 5, sort: "der", order: "asc" } },
	{
		label: "Large Cap",
		params: { market_cap_min: 10_000_000_000_000, roe_min: 10, sort: "market_cap", order: "desc" },
	},
	{ label: "Bank", params: { sector: "Keuangan", sort: "roe", order: "desc" } },
];

type SortField = "market_cap" | "roe" | "roa" | "per" | "npm" | "der" | "eps" | "pbv";

const RATIO_COLUMNS: { key: SortField; label: string; suffix: string }[] = [
	{ key: "roe", label: "ROE", suffix: "%" },
	{ key: "roa", label: "ROA", suffix: "%" },
	{ key: "per", label: "PER", suffix: "x" },
	{ key: "npm", label: "NPM", suffix: "%" },
	{ key: "der", label: "DER", suffix: "x" },
	{ key: "eps", label: "EPS", suffix: "" },
	{ key: "pbv", label: "PBV", suffix: "x" },
];

function formatMarketCap(value: number | null): string {
	if (value == null) return "—";
	const abs = Math.abs(value);
	if (abs >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
	if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
	if (abs >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
	return value.toLocaleString();
}

function parseNum(v: string | null): number | undefined {
	if (v == null || v === "") return undefined;
	const n = Number(v);
	return Number.isNaN(n) ? undefined : n;
}

function buildParamsFromURL(sp: URLSearchParams): IdxScreenerParams {
	return {
		sector: sp.get("sector") || undefined,
		market_cap_min: parseNum(sp.get("market_cap_min")),
		market_cap_max: parseNum(sp.get("market_cap_max")),
		roe_min: parseNum(sp.get("roe_min")),
		roe_max: parseNum(sp.get("roe_max")),
		per_min: parseNum(sp.get("per_min")),
		per_max: parseNum(sp.get("per_max")),
		der_max: parseNum(sp.get("der_max")),
		npm_min: parseNum(sp.get("npm_min")),
		roa_min: parseNum(sp.get("roa_min")),
		eps_min: parseNum(sp.get("eps_min")),
		pbv_min: parseNum(sp.get("pbv_min")),
		pbv_max: parseNum(sp.get("pbv_max")),
		sort: sp.get("sort") || "roe",
		order: sp.get("order") || "desc",
		limit: PAGE_SIZE,
		offset: parseNum(sp.get("offset")) ?? 0,
	};
}

export function IdxScreenerPage() {
	usePageTitle("Stock Screener");
	const [searchParams, setSearchParams] = useSearchParams();
	const [view, setView] = useState<"table" | "scatter">("table");

	const params = useMemo(() => buildParamsFromURL(searchParams), [searchParams]);
	const codesParam = searchParams.get("codes");
	const codesSet = useMemo(
		() => (codesParam ? new Set(codesParam.split(",")) : null),
		[codesParam],
	);
	const groupLabel = searchParams.get("group") || null;
	const { data: rawData, isLoading, error } = useIdxScreener(params);
	const data = useMemo(() => {
		if (!rawData || !codesSet) return rawData;
		const filtered = rawData.results.filter((r) => codesSet.has(r.kode_emiten));
		return { results: filtered, total: filtered.length };
	}, [rawData, codesSet]);
	const sectors = useIdxSectors();

	// Local filter state for debounced inputs
	const [localFilters, setLocalFilters] = useState<Record<string, string>>(() => {
		const entries: Record<string, string> = {};
		for (const key of [
			"market_cap_min",
			"market_cap_max",
			"roe_min",
			"roe_max",
			"per_min",
			"per_max",
			"der_max",
			"npm_min",
			"roa_min",
			"eps_min",
			"pbv_min",
			"pbv_max",
		]) {
			const v = searchParams.get(key);
			if (v) entries[key] = v;
		}
		return entries;
	});

	// Debounce filter changes to URL
	useEffect(() => {
		const id = setTimeout(() => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					// Clear all filter keys first
					for (const key of [
						"market_cap_min",
						"market_cap_max",
						"roe_min",
						"roe_max",
						"per_min",
						"per_max",
						"der_max",
						"npm_min",
						"roa_min",
						"eps_min",
						"pbv_min",
						"pbv_max",
					]) {
						next.delete(key);
					}
					// Set non-empty values
					for (const [k, v] of Object.entries(localFilters)) {
						if (v !== "") next.set(k, v);
					}
					next.set("offset", "0");
					return next;
				},
				{ replace: true },
			);
		}, 300);
		return () => clearTimeout(id);
	}, [localFilters, setSearchParams]);

	const setFilter = (key: string, value: string) => {
		setLocalFilters((prev) => ({ ...prev, [key]: value }));
	};

	const setSector = (value: string) => {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (value) next.set("sector", value);
				else next.delete("sector");
				next.set("offset", "0");
				return next;
			},
			{ replace: true },
		);
	};

	const setSort = (field: SortField) => {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				const currentSort = next.get("sort");
				const currentOrder = next.get("order") || "desc";
				if (currentSort === field) {
					next.set("order", currentOrder === "desc" ? "asc" : "desc");
				} else {
					next.set("sort", field);
					next.set("order", "desc");
				}
				next.set("offset", "0");
				return next;
			},
			{ replace: true },
		);
	};

	const applyPreset = (preset: Preset) => {
		const next = new URLSearchParams();
		for (const [k, v] of Object.entries(preset.params)) {
			if (v != null) next.set(k, String(v));
		}
		next.set("limit", String(PAGE_SIZE));
		next.set("offset", "0");
		setSearchParams(next, { replace: true });
		// Sync local filter state
		const newLocal: Record<string, string> = {};
		for (const [k, v] of Object.entries(preset.params)) {
			if (k !== "sector" && k !== "sort" && k !== "order" && v != null) {
				newLocal[k] = String(v);
			}
		}
		setLocalFilters(newLocal);
	};

	const clearAll = () => {
		setSearchParams(new URLSearchParams(), { replace: true });
		setLocalFilters({});
	};

	const totalItems = data?.total ?? 0;
	const offset = params.offset ?? 0;
	const totalPages = Math.ceil(totalItems / PAGE_SIZE);
	const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

	const goToPage = useCallback(
		(page: number) => {
			const clamped = Math.max(1, Math.min(page, totalPages));
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					next.set("offset", String((clamped - 1) * PAGE_SIZE));
					return next;
				},
				{ replace: true },
			);
		},
		[totalPages, setSearchParams],
	);

	const currentSort = params.sort || "roe";
	const currentOrder = params.order || "desc";

	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<IdxNav />
			<div className="mb-4">
				<h1 className="font-mono text-lg font-semibold tracking-wide text-white">Stock Screener</h1>
				<p className="mt-1 text-sm text-t-text-secondary">
					Filter IDX companies by financial metrics.
				</p>
			</div>

			{/* Group filter banner */}
			{codesSet && (
				<div className="mb-4 flex items-center gap-3 rounded-lg border border-t-amber/25 bg-t-amber/10 px-4 py-2.5">
					<span className="font-mono text-xs text-t-amber">
						Showing {codesSet.size} companies{groupLabel ? ` from ${groupLabel}` : ""}
					</span>
					<button
						type="button"
						onClick={() => {
							setSearchParams(
								(prev) => {
									const next = new URLSearchParams(prev);
									next.delete("codes");
									next.delete("group");
									return next;
								},
								{ replace: true },
							);
						}}
						className="rounded-full border border-t-amber/30 bg-t-amber/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-t-amber transition-colors hover:bg-t-amber/30"
					>
						Show all
					</button>
				</div>
			)}

			{/* Presets */}
			<div className="mb-4 flex flex-wrap gap-2">
				{PRESETS.map((preset) => (
					<button
						key={preset.label}
						type="button"
						onClick={() => applyPreset(preset)}
						className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-t-text-secondary transition-colors hover:bg-white/10 hover:text-white"
					>
						{preset.label}
					</button>
				))}
				<button
					type="button"
					onClick={clearAll}
					className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-t-text-muted transition-colors hover:bg-white/10 hover:text-white"
				>
					Clear
				</button>
			</div>

			{/* Filters */}
			<div className="mb-4 rounded-lg border border-white/10 bg-white/[0.02] p-3">
				<div className="flex flex-wrap items-end gap-3">
					<FilterSelect
						label="Sector"
						value={searchParams.get("sector") || ""}
						onChange={setSector}
						options={sectors.data?.sectors.map((s) => ({ value: s.sector, label: s.sector })) ?? []}
						placeholder="All Sectors"
					/>
					<MarketCapFilter values={localFilters} onChange={setFilter} />
					<FilterRange
						label="ROE"
						keyMin="roe_min"
						keyMax="roe_max"
						values={localFilters}
						onChange={setFilter}
					/>
					<FilterRange
						label="PER"
						keyMin="per_min"
						keyMax="per_max"
						values={localFilters}
						onChange={setFilter}
					/>
					<FilterInput
						label="ROA min"
						filterKey="roa_min"
						values={localFilters}
						onChange={setFilter}
					/>
					<FilterInput
						label="NPM min"
						filterKey="npm_min"
						values={localFilters}
						onChange={setFilter}
					/>
					<FilterInput
						label="EPS min"
						filterKey="eps_min"
						values={localFilters}
						onChange={setFilter}
					/>
					<FilterInput
						label="DER max"
						filterKey="der_max"
						values={localFilters}
						onChange={setFilter}
					/>
					<FilterRange
						label="PBV"
						keyMin="pbv_min"
						keyMax="pbv_max"
						values={localFilters}
						onChange={setFilter}
					/>
				</div>
			</div>

			{/* Results */}
			{isLoading ? (
				<Skeleton className="h-[400px] w-full rounded-xl" />
			) : error ? (
				<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
					Failed to load screener data.
				</div>
			) : !data?.results.length ? (
				<div className="rounded-2xl border border-dashed border-t-border p-8 text-center">
					<p className="text-sm text-t-text-muted">No results found.</p>
					<p className="mt-1 text-xs text-t-text-muted">
						Try loosening your filters or using a different preset.
					</p>
				</div>
			) : (
				<>
					{/* View toggle + results count */}
					<div className="mb-3 flex items-center justify-between">
						<span className="font-mono text-xs text-t-text-muted">
							{data.results.length === data.total
								? `${data.total} result${data.total !== 1 ? "s" : ""}`
								: `${data.results.length} of ${data.total} results`}
						</span>
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => setView("table")}
								className={clsx(
									"rounded-l-lg border px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
									view === "table"
										? "border-white/20 bg-white text-black"
										: "border-white/10 bg-white/[0.04] text-t-text-secondary hover:bg-white/10 hover:text-white",
								)}
							>
								Table
							</button>
							<button
								type="button"
								onClick={() => setView("scatter")}
								className={clsx(
									"rounded-r-lg border border-l-0 px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
									view === "scatter"
										? "border-white/20 bg-white text-black"
										: "border-white/10 bg-white/[0.04] text-t-text-secondary hover:bg-white/10 hover:text-white",
								)}
							>
								Scatter
							</button>
						</div>
					</div>

					{view === "scatter" ? (
						<ScreenerBubbleChart results={data.results} />
					) : (
					<>
					<div className="overflow-x-auto rounded-lg border border-t-border">
						<table className="w-full text-xs">
							<thead>
								<tr className="border-b border-white/10 bg-white/[0.02]">
									<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
										Code
									</th>
									<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
										Name
									</th>
									<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
										Sector
									</th>
									<SortableHeader
										label="Mkt Cap"
										field="market_cap"
										currentSort={currentSort}
										currentOrder={currentOrder}
										onClick={setSort}
									/>
									{RATIO_COLUMNS.map((col) => (
										<SortableHeader
											key={col.key}
											label={col.label}
											field={col.key}
											currentSort={currentSort}
											currentOrder={currentOrder}
											onClick={setSort}
										/>
									))}
									<th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
										Div %
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{data.results.map((row) => (
									<tr key={row.kode_emiten} className="transition-colors hover:bg-white/[0.04]">
										<td className="whitespace-nowrap px-3 py-2">
											<Link
												to={`/idx/${row.kode_emiten}`}
												className="font-mono text-xs font-medium text-t-green transition-colors hover:text-t-amber hover:underline"
											>
												{row.kode_emiten}
											</Link>
										</td>
										<td className="max-w-[200px] truncate px-3 py-2 text-t-text-secondary">
											{row.name}
										</td>
										<td className="whitespace-nowrap px-3 py-2 text-t-text-muted">{row.sector}</td>
										<td className="whitespace-nowrap px-3 py-2 text-right font-mono text-t-text-secondary">
											{formatMarketCap(row.market_cap)}
										</td>
										{RATIO_COLUMNS.map((col) => {
											const v = row[col.key];
											return (
												<td
													key={col.key}
													className={clsx(
														"whitespace-nowrap px-3 py-2 text-right font-mono",
														ratioColor(col.key, v),
													)}
												>
													{v != null ? `${v.toFixed(2)}${col.suffix}` : "—"}
												</td>
											);
										})}
										<td className="whitespace-nowrap px-3 py-2 text-right font-mono text-t-text-secondary">
											{row.dividend_yield != null ? `${row.dividend_yield.toFixed(2)}%` : "—"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className="mt-4 flex items-center justify-between">
							<span className="font-mono text-xs text-t-text-muted">
								Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, totalItems)} of {totalItems}
							</span>
							<div className="flex items-center gap-1">
								<PageButton disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
									←
								</PageButton>
								{paginationRange(currentPage, totalPages).map((page) =>
									page === "..." ? (
										<span
											key={`ellipsis-${page}`}
											className="px-2 font-mono text-xs text-t-text-muted"
										>
											...
										</span>
									) : (
										<PageButton
											key={page}
											active={page === currentPage}
											onClick={() => goToPage(page as number)}
										>
											{page}
										</PageButton>
									),
								)}
								<PageButton
									disabled={currentPage >= totalPages}
									onClick={() => goToPage(currentPage + 1)}
								>
									→
								</PageButton>
							</div>
						</div>
					)}
					</>
					)}
				</>
			)}
		</div>
	);
}

function ratioColor(key: SortField, value: number | null): string {
	if (value == null) return "text-t-text-muted";
	switch (key) {
		case "roe":
			return value >= 15 ? "text-t-green" : value < 0 ? "text-t-red" : "text-t-text";
		case "roa":
			return value >= 10 ? "text-t-green" : value < 0 ? "text-t-red" : "text-t-text";
		case "der":
			return value > 3 ? "text-t-red" : value <= 1 ? "text-t-green" : "text-t-text";
		case "npm":
			return value >= 20 ? "text-t-green" : value < 0 ? "text-t-red" : "text-t-text";
		case "market_cap":
			return "text-t-text-secondary";
		default:
			return "text-t-text";
	}
}

function SortableHeader({
	label,
	field,
	currentSort,
	currentOrder,
	onClick,
}: {
	label: string;
	field: SortField;
	currentSort: string;
	currentOrder: string;
	onClick: (field: SortField) => void;
}) {
	const isActive = currentSort === field;
	return (
		<th className="px-3 py-2 text-right">
			<button
				type="button"
				onClick={() => onClick(field)}
				className={clsx(
					"font-mono text-[10px] uppercase tracking-wider transition-colors",
					isActive ? "text-t-amber" : "text-t-text-muted hover:text-t-text-secondary",
				)}
			>
				{label}
				{isActive && <span className="ml-1">{currentOrder === "desc" ? "↓" : "↑"}</span>}
			</button>
		</th>
	);
}

function FilterSelect({
	label,
	value,
	onChange,
	options,
	placeholder,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: { value: string; label: string }[];
	placeholder: string;
}) {
	return (
		<label className="block">
			<span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
				{label}
			</span>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-t-text-secondary outline-none transition-colors focus:border-t-amber/50"
			>
				<option value="">{placeholder}</option>
				{options.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
		</label>
	);
}

function FilterRange({
	label,
	keyMin,
	keyMax,
	values,
	onChange,
}: {
	label: string;
	keyMin: string;
	keyMax: string;
	values: Record<string, string>;
	onChange: (key: string, value: string) => void;
}) {
	return (
		<fieldset>
			<legend className="mb-1 font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
				{label}
			</legend>
			<div className="flex items-center gap-1">
				<input
					type="number"
					aria-label={`${label} min`}
					value={values[keyMin] ?? ""}
					onChange={(e) => onChange(keyMin, e.target.value)}
					placeholder="min"
					className="w-16 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 font-mono text-xs text-white placeholder-t-text-muted outline-none transition-colors focus:border-t-amber/50"
				/>
				<span className="text-[10px] text-t-text-muted">-</span>
				<input
					type="number"
					aria-label={`${label} max`}
					value={values[keyMax] ?? ""}
					onChange={(e) => onChange(keyMax, e.target.value)}
					placeholder="max"
					className="w-16 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 font-mono text-xs text-white placeholder-t-text-muted outline-none transition-colors focus:border-t-amber/50"
				/>
			</div>
		</fieldset>
	);
}

function FilterInput({
	label,
	filterKey,
	values,
	onChange,
}: {
	label: string;
	filterKey: string;
	values: Record<string, string>;
	onChange: (key: string, value: string) => void;
}) {
	return (
		<label className="block">
			<span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
				{label}
			</span>
			<input
				type="number"
				value={values[filterKey] ?? ""}
				onChange={(e) => onChange(filterKey, e.target.value)}
				placeholder="—"
				className="w-16 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 font-mono text-xs text-white placeholder-t-text-muted outline-none transition-colors focus:border-t-amber/50"
			/>
		</label>
	);
}

const MCAP_OPTIONS = [
	{ value: "", label: "Any" },
	{ value: "50000000000000", label: "> 50T (Mega)" },
	{ value: "10000000000000", label: "> 10T (Large)" },
	{ value: "1000000000000", label: "> 1T (Mid)" },
	{ value: "100000000000", label: "> 100B (Small)" },
];

function MarketCapFilter({
	values,
	onChange,
}: {
	values: Record<string, string>;
	onChange: (key: string, value: string) => void;
}) {
	return (
		<label className="block">
			<span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
				Market Cap
			</span>
			<select
				value={values.market_cap_min ?? ""}
				onChange={(e) => onChange("market_cap_min", e.target.value)}
				className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-t-text-secondary outline-none transition-colors focus:border-t-amber/50"
			>
				{MCAP_OPTIONS.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
		</label>
	);
}

function PageButton({
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
