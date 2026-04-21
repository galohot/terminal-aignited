import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { BreadthChart } from "../components/idx/breadth-chart";
import { IdxNav } from "../components/idx/idx-nav";
import {
	type MoversPreset,
	MoversPresetsBar,
} from "../components/idx/movers-presets";
import { MoversTable } from "../components/idx/movers-table";
import { StockHeatmap } from "../components/idx/stock-heatmap";
import { Skeleton } from "../components/ui/loading";
import { useHeatmap } from "../hooks/use-heatmap";
import { useIdxSectors } from "../hooks/use-idx-screener";
import { useMarketBreadth } from "../hooks/use-market-breadth";
import { useMovers } from "../hooks/use-movers";
import { usePageTitle } from "../hooks/use-page-title";
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

	const params: MoversParams = useMemo(
		() => ({
			change_min: parseNum(searchParams.get("change_min")),
			change_max: parseNum(searchParams.get("change_max")),
			volume_min: parseNum(searchParams.get("volume_min")),
			relative_volume_min: parseNum(searchParams.get("relative_volume_min")),
			sector: searchParams.get("sector") || undefined,
			sort: sortField,
			order: sortOrder,
			preset: searchParams.get("preset") || undefined,
			limit: parseNum(searchParams.get("limit")) ?? 50,
		}),
		[searchParams, sortField, sortOrder],
	);

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
			<div className="mb-5">
				<h1
					className="text-[clamp(2rem,4vw,2.5rem)] leading-[1.05] text-ink"
					style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
				>
					Movers <em className="text-ember-600">& Market</em>
				</h1>
				<p className="mt-2 max-w-2xl text-sm text-ink-3">
					Price action screener, market breadth, and stock heatmap.
				</p>
			</div>

			<MoversPresetsBar active={activePreset} onSelect={onPresetSelect} />

			{/* Expandable filters */}
			<div className="mb-4">
				<button
					type="button"
					onClick={() => setFiltersOpen(!filtersOpen)}
					className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-4 transition-colors hover:text-ink-2"
				>
					{filtersOpen ? "▼" : "▶"} Custom Filters
				</button>
				{filtersOpen && (
					<div className="rounded-[18px] border border-rule bg-card p-3">
						<div className="flex flex-wrap items-end gap-3">
							<label className="block">
								<span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-4">
									Sector
								</span>
								<select
									value={searchParams.get("sector") || ""}
									onChange={(e) => setFilter("sector", e.target.value)}
									className="rounded-lg border border-rule bg-paper-2 px-3 py-1.5 font-mono text-xs text-ink outline-none transition-colors focus:border-ember-500 focus:ring-2 focus:ring-ember-500/15"
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
						<div className="rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-8 text-center text-sm text-ink-4">
							Failed to load movers data.
						</div>
					) : !data?.movers.length ? (
						<div className="rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-8 text-center">
							<p className="text-sm text-ink-4">No movers found.</p>
							<p className="mt-1 text-xs text-ink-4">
								Try a different preset or loosen your filters.
							</p>
						</div>
					) : (
						<>
							<div className="mb-2">
								<span className="font-mono text-xs text-ink-4">
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
			<span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-4">
				{label}
			</span>
			<input
				type="number"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="—"
				className="w-20 rounded-lg border border-rule bg-paper-2 px-2 py-1.5 font-mono text-xs text-ink placeholder-ink-4 outline-none transition-colors focus:border-ember-500 focus:ring-2 focus:ring-ember-500/15"
			/>
		</label>
	);
}
