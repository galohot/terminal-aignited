import { clsx } from "clsx";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { BreadthChart } from "../components/idx/breadth-chart";
import { IdxNav } from "../components/idx/idx-nav";
import { type MoversPreset, MOVERS_PRESETS, MoversPresetsBar } from "../components/idx/movers-presets";
import { MoversTable } from "../components/idx/movers-table";
import { StockHeatmap } from "../components/idx/stock-heatmap";
import { Skeleton } from "../components/ui/loading";
import { useHeatmap } from "../hooks/use-heatmap";
import { useMarketBreadth } from "../hooks/use-market-breadth";
import { useMovers } from "../hooks/use-movers";
import { usePageTitle } from "../hooks/use-page-title";
import { useIdxSectors } from "../hooks/use-idx-screener";
import type { MoversParams } from "../types/market";

function parseNum(v: string | null): number | undefined {
	if (v == null || v === "") return undefined;
	const n = Number(v);
	return Number.isNaN(n) ? undefined : n;
}

export function IdxMoversPage() {
	usePageTitle("Movers & Market");

	const [searchParams, setSearchParams] = useSearchParams();
	const [filtersOpen, setFiltersOpen] = useState(false);

	const activePreset = searchParams.get("preset_label") || "All";
	const sortField = searchParams.get("sort") || "change_percent";
	const sortOrder = searchParams.get("order") || "desc";

	const params: MoversParams = useMemo(() => ({
		change_min: parseNum(searchParams.get("change_min")),
		change_max: parseNum(searchParams.get("change_max")),
		volume_min: parseNum(searchParams.get("volume_min")),
		relative_volume_min: parseNum(searchParams.get("relative_volume_min")),
		sector: searchParams.get("sector") || undefined,
		sort: sortField,
		order: sortOrder,
		preset: searchParams.get("preset") || undefined,
		limit: parseNum(searchParams.get("limit")) ?? 50,
	}), [searchParams, sortField, sortOrder]);

	const { data, isLoading, error } = useMovers(params);
	const breadth = useMarketBreadth(30);
	const heatmap = useHeatmap();
	const sectors = useIdxSectors();

	const onPresetSelect = useCallback(
		(preset: MoversPreset) => {
			const next = new URLSearchParams();
			next.set("preset_label", preset.label);
			for (const [k, v] of Object.entries(preset.params)) {
				if (v != null) next.set(k, String(v));
			}
			next.set("sort", "change_percent");
			next.set("order", "desc");
			setSearchParams(next, { replace: true });
		},
		[setSearchParams],
	);

	const onSort = useCallback(
		(field: string) => {
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
					return next;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);

	const setFilter = useCallback(
		(key: string, value: string) => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					if (value) next.set(key, value);
					else next.delete(key);
					next.delete("preset_label");
					return next;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);

	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<IdxNav />
			<div className="mb-4">
				<h1 className="font-mono text-lg font-semibold tracking-wide text-white">Movers & Market</h1>
				<p className="mt-1 text-sm text-t-text-secondary">
					Price action screener, market breadth, and stock heatmap.
				</p>
			</div>

			<MoversPresetsBar active={activePreset} onSelect={onPresetSelect} />

			{/* Expandable filters */}
			<div className="mb-4">
				<button
					type="button"
					onClick={() => setFiltersOpen(!filtersOpen)}
					className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-t-text-muted transition-colors hover:text-t-text-secondary"
				>
					{filtersOpen ? "▼" : "▶"} Custom Filters
				</button>
				{filtersOpen && (
					<div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
						<div className="flex flex-wrap items-end gap-3">
							<label className="block">
								<span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
									Sector
								</span>
								<select
									value={searchParams.get("sector") || ""}
									onChange={(e) => setFilter("sector", e.target.value)}
									className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-t-text-secondary outline-none transition-colors focus:border-t-amber/50"
								>
									<option value="">All Sectors</option>
									{(sectors.data?.sectors ?? []).map((s) => (
										<option key={s.sector} value={s.sector}>
											{s.sector}
										</option>
									))}
								</select>
							</label>
							<FilterInput
								label="Min Change%"
								value={searchParams.get("change_min") || ""}
								onChange={(v) => setFilter("change_min", v)}
							/>
							<FilterInput
								label="Max Change%"
								value={searchParams.get("change_max") || ""}
								onChange={(v) => setFilter("change_max", v)}
							/>
							<FilterInput
								label="Min Volume"
								value={searchParams.get("volume_min") || ""}
								onChange={(v) => setFilter("volume_min", v)}
							/>
							<FilterInput
								label="Min Rel Vol"
								value={searchParams.get("relative_volume_min") || ""}
								onChange={(v) => setFilter("relative_volume_min", v)}
							/>
						</div>
					</div>
				)}
			</div>

			{/* Main content grid */}
			<div className="grid gap-4 lg:grid-cols-[1fr_380px]">
				{/* Left: Movers table */}
				<div>
					{isLoading ? (
						<Skeleton className="h-[400px] w-full rounded-xl" />
					) : error ? (
						<div className="rounded-2xl border border-dashed border-t-border p-8 text-center text-sm text-t-text-muted">
							Failed to load movers data.
						</div>
					) : !data?.movers.length ? (
						<div className="rounded-2xl border border-dashed border-t-border p-8 text-center">
							<p className="text-sm text-t-text-muted">No movers found.</p>
							<p className="mt-1 text-xs text-t-text-muted">
								Try a different preset or loosen your filters.
							</p>
						</div>
					) : (
						<>
							<div className="mb-2">
								<span className="font-mono text-xs text-t-text-muted">
									{data.movers.length} of {data.total} stocks
								</span>
							</div>
							<MoversTable
								movers={data.movers}
								sortField={sortField}
								sortOrder={sortOrder}
								onSort={onSort}
							/>
						</>
					)}
				</div>

				{/* Right: Breadth + Heatmap */}
				<div className="flex flex-col gap-4">
					{breadth.isLoading ? (
						<Skeleton className="h-[260px] w-full rounded-lg" />
					) : breadth.data ? (
						<BreadthChart data={breadth.data.breadth} />
					) : null}

					{heatmap.isLoading ? (
						<Skeleton className="h-[420px] w-full rounded-lg" />
					) : heatmap.data ? (
						<StockHeatmap stocks={heatmap.data.stocks} />
					) : null}
				</div>
			</div>
		</div>
	);
}

function FilterInput({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<label className="block">
			<span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
				{label}
			</span>
			<input
				type="number"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="—"
				className="w-20 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 font-mono text-xs text-white placeholder-t-text-muted outline-none transition-colors focus:border-t-amber/50"
			/>
		</label>
	);
}
