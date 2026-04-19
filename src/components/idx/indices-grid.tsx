import { useMemo } from "react";
import { useIdxIndexHistory, useIdxIndices } from "../../hooks/use-idx-indices";
import { formatPercent, formatPrice } from "../../lib/format";
import type { IdxIndex } from "../../types/market";
import { Skeleton } from "../ui/loading";
import { IndexSparkline } from "./index-sparkline";

const MAJOR_CODES = new Set(["COMPOSITE", "LQ45", "IDX30", "IDX80", "IDXQ30"]);

const SECTOR_CODES = new Set([
	"IDXBASIC",
	"IDXCYCLIC",
	"IDXENERGY",
	"IDXFINANCE",
	"IDXHEALTH",
	"IDXINDUST",
	"IDXINFRA",
	"IDXNONCYC",
	"IDXPROPERT",
	"IDXTECHNO",
	"IDXTRANS",
]);

function classifyIndex(code: string): "major" | "sector" | "thematic" {
	if (MAJOR_CODES.has(code)) return "major";
	if (SECTOR_CODES.has(code)) return "sector";
	return "thematic";
}

function changeTone(pct: number) {
	if (pct <= -5) return "border-neg/40 bg-neg/10 text-neg";
	if (pct < -2) return "border-neg/25 bg-neg/[0.06] text-neg";
	if (pct < 0) return "border-neg/15 bg-neg/[0.04] text-neg";
	if (pct === 0) return "border-rule bg-paper-2 text-ink-3";
	if (pct <= 2) return "border-pos/15 bg-pos/[0.04] text-pos";
	if (pct <= 5) return "border-pos/25 bg-pos/[0.06] text-pos";
	return "border-pos/40 bg-pos/10 text-pos";
}

export function IdxIndicesGrid() {
	const { data, isLoading, error } = useIdxIndices();

	const groups = useMemo(() => {
		if (!data?.indices) return { major: [], sector: [], thematic: [] };
		const major: IdxIndex[] = [];
		const sector: IdxIndex[] = [];
		const thematic: IdxIndex[] = [];
		for (const idx of data.indices) {
			const group = classifyIndex(idx.index_code);
			if (group === "major") major.push(idx);
			else if (group === "sector") sector.push(idx);
			else thematic.push(idx);
		}
		return { major, sector, thematic };
	}, [data]);

	if (isLoading) {
		return (
			<div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
				{Array.from({ length: 10 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
					<Skeleton key={i} className="h-20 w-full rounded-xl" />
				))}
			</div>
		);
	}

	if (error || !data?.indices.length) {
		return (
			<div className="rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-4 text-sm text-ink-4">
				IDX indices data unavailable.
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{groups.major.length > 0 && <IndexGroup label="Major Indices" indices={groups.major} />}
			{groups.sector.length > 0 && <IndexGroup label="Sectoral" indices={groups.sector} />}
			{groups.thematic.length > 0 && <IndexGroup label="Thematic" indices={groups.thematic} />}
		</div>
	);
}

function IndexGroup({ indices, label }: { indices: IdxIndex[]; label: string }) {
	return (
		<div>
			<div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
				{label}
			</div>
			<div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
				{indices.map((idx) => (
					<IndexTile key={idx.index_code} index={idx} />
				))}
			</div>
		</div>
	);
}

function deriveChangePercent(idx: IdxIndex): number {
	if (Number.isFinite(idx.change_percent) && idx.change_percent !== 0) return idx.change_percent;
	// API may return null change_percent — derive from change and previous close
	const prevClose = idx.close - (idx.change ?? 0);
	if (prevClose === 0 || !Number.isFinite(idx.change)) return 0;
	return (idx.change / prevClose) * 100;
}

function IndexTile({ index }: { index: IdxIndex }) {
	const pct = deriveChangePercent(index);
	const tone = changeTone(pct);
	const { data } = useIdxIndexHistory(index.index_code, 14);

	return (
		<div className={`rounded-xl border p-3 transition-colors ${tone}`}>
			<div className="truncate font-mono text-[11px] font-semibold tracking-wide text-ink">
				{index.index_code}
			</div>
			<div className="mt-1 font-mono text-sm text-ink">{formatPrice(index.close)}</div>
			<div className="mt-0.5 font-mono text-xs font-medium">{formatPercent(pct)}</div>
			{data?.data && data.data.length >= 2 && (
				<div className="mt-1.5">
					<IndexSparkline data={data.data} />
				</div>
			)}
		</div>
	);
}
