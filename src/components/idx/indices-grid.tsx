import { useMemo } from "react";
import { useIdxIndices } from "../../hooks/use-idx-indices";
import { formatPercent, formatPrice } from "../../lib/format";
import type { IdxIndex } from "../../types/market";
import { Skeleton } from "../ui/loading";

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
	if (pct <= -5) return "border-t-red/40 bg-t-red/20 text-t-red";
	if (pct < -2) return "border-t-red/25 bg-t-red/10 text-t-red";
	if (pct < 0) return "border-t-red/15 bg-t-red/5 text-t-red";
	if (pct === 0) return "border-white/10 bg-white/[0.04] text-t-text-secondary";
	if (pct <= 2) return "border-t-green/15 bg-t-green/5 text-t-green";
	if (pct <= 5) return "border-t-green/25 bg-t-green/10 text-t-green";
	return "border-t-green/40 bg-t-green/20 text-t-green";
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
			<div className="rounded-2xl border border-dashed border-t-border p-4 text-sm text-t-text-muted">
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
			<div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-t-text-muted">
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

function IndexTile({ index }: { index: IdxIndex }) {
	const pct = Number.isFinite(index.change_percent) ? index.change_percent : 0;
	const tone = changeTone(pct);

	return (
		<div className={`rounded-xl border p-3 transition-colors ${tone}`}>
			<div className="truncate font-mono text-[11px] font-semibold tracking-wide text-white">
				{index.index_code}
			</div>
			<div className="mt-1 font-mono text-sm text-white">{formatPrice(index.close)}</div>
			<div className="mt-0.5 font-mono text-xs font-medium">{formatPercent(pct)}</div>
		</div>
	);
}
