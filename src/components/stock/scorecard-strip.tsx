import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import type { IdxScoreAxis, IdxScoreCard } from "../../types/market";

interface ScorecardStripProps {
	symbol: string;
}

/**
 * 4-axis strip (valuation / momentum / quality / risk) + overall badge.
 * IDX-only — returns null for non-.JK symbols or when the API has no data.
 * Expands inline on click to show per-strategy signal breakdown.
 */
export function ScorecardStrip({ symbol }: ScorecardStripProps) {
	const isJK = symbol.endsWith(".JK");
	const kode = isJK ? symbol.replace(".JK", "") : "";
	const [expanded, setExpanded] = useState(false);

	const q = useQuery({
		queryKey: ["idx-score", kode],
		queryFn: () => api.idxScore(kode),
		enabled: isJK && kode.length > 0,
		staleTime: 5 * 60_000,
		retry: false,
	});

	if (!isJK) return null;
	if (q.isLoading) {
		return (
			<div className="mx-4 mt-3 h-[68px] animate-pulse rounded-[14px] border border-rule bg-paper-2" />
		);
	}
	if (q.isError || !q.data) return null;

	const card = q.data;
	const hasAnySignal =
		card.valuation.strategies.length > 0 ||
		card.momentum.strategies.length > 0 ||
		card.quality.strategies.length > 0 ||
		card.risk.strategies.length > 0;
	if (!hasAnySignal) return null;

	return (
		<div className="mx-4 mt-3 rounded-[14px] border border-rule bg-card">
			<button
				type="button"
				onClick={() => setExpanded((v) => !v)}
				className="flex w-full items-stretch gap-3 px-3 py-2.5 text-left transition-colors hover:bg-paper-2"
				aria-expanded={expanded}
			>
				<OverallBadge score={card.overall} />
				<div className="grid flex-1 grid-cols-4 gap-3">
					<AxisBar label="Valuation" axis={card.valuation} />
					<AxisBar label="Momentum" axis={card.momentum} />
					<AxisBar label="Quality" axis={card.quality} />
					<AxisBar label="Risk" axis={card.risk} />
				</div>
				<div className="flex items-center font-mono text-[10px] text-ink-4 tracking-[0.14em] uppercase">
					{expanded ? "Hide ▴" : "Details ▾"}
				</div>
			</button>
			{expanded && <Breakdown card={card} />}
		</div>
	);
}

function OverallBadge({ score }: { score: number }) {
	const tone = toneFor(score);
	return (
		<div
			className={`flex min-w-[72px] flex-col items-center justify-center rounded-[10px] border ${tone.border} ${tone.bg} px-2 py-1`}
		>
			<div className="font-mono text-[10px] text-ink-4 tracking-[0.14em] uppercase">Overall</div>
			<div className={`font-mono text-[20px] leading-none tracking-tight ${tone.text}`}>
				{score.toFixed(1)}
			</div>
			<div className="font-mono text-[9px] text-ink-4 tracking-[0.1em] uppercase">/ 10</div>
		</div>
	);
}

function AxisBar({ label, axis }: { label: string; axis: IdxScoreAxis }) {
	const hasData = axis.strategies.length > 0;
	const score = hasData ? axis.score : null;
	const tone = score != null ? toneFor(score) : null;
	const pct = score != null ? Math.max(0, Math.min(100, score * 10)) : 0;

	return (
		<div className="flex min-w-0 flex-col justify-center gap-1">
			<div className="flex items-baseline justify-between gap-2">
				<span className="truncate font-mono text-[10px] text-ink-4 tracking-[0.14em] uppercase">
					{label}
				</span>
				<span className={`font-mono text-[13px] leading-none ${tone?.text ?? "text-ink-4"}`}>
					{score != null ? score.toFixed(1) : "—"}
				</span>
			</div>
			<div className="h-1.5 overflow-hidden rounded-full bg-paper-2">
				{hasData && (
					<div
						className={`h-full rounded-full ${tone?.fill ?? "bg-ink-4"}`}
						style={{ width: `${pct}%` }}
					/>
				)}
			</div>
		</div>
	);
}

function Breakdown({ card }: { card: IdxScoreCard }) {
	return (
		<div className="grid grid-cols-1 gap-3 border-t border-rule px-3 py-3 sm:grid-cols-2 lg:grid-cols-4">
			<AxisDetails label="Valuation" axis={card.valuation} />
			<AxisDetails label="Momentum" axis={card.momentum} />
			<AxisDetails label="Quality" axis={card.quality} />
			<AxisDetails label="Risk" axis={card.risk} />
		</div>
	);
}

function AxisDetails({ label, axis }: { label: string; axis: IdxScoreAxis }) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="font-mono text-[10px] text-ink-3 tracking-[0.14em] uppercase">{label}</div>
			{axis.strategies.length === 0 ? (
				<div className="font-mono text-[10px] text-ink-4">No data</div>
			) : (
				axis.strategies.map((s) => (
					<div key={s.name} className="flex items-center justify-between gap-2">
						<span className="truncate font-mono text-[10px] text-ink-3">{humanize(s.name)}</span>
						<span className={`font-mono text-[10px] ${signalColor(s.signal)}`}>
							{s.signal >= 0 ? "+" : ""}
							{s.signal.toFixed(2)}
						</span>
					</div>
				))
			)}
		</div>
	);
}

function humanize(name: string): string {
	return name
		.replace(/_/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase())
		.replace("Pe Ratio", "P/E")
		.replace("Pb Ratio", "P/B")
		.replace("Roe", "ROE")
		.replace("Rsi", "RSI")
		.replace("Sma Cross", "SMA Cross");
}

function signalColor(signal: number): string {
	if (signal >= 0.3) return "text-emerald-600";
	if (signal <= -0.3) return "text-ember-700";
	return "text-ink-3";
}

interface Tone {
	bg: string;
	border: string;
	text: string;
	fill: string;
}

function toneFor(score: number): Tone {
	if (score >= 7)
		return {
			bg: "bg-emerald-50",
			border: "border-emerald-500/30",
			text: "text-emerald-700",
			fill: "bg-emerald-500",
		};
	if (score >= 5)
		return {
			bg: "bg-ember-50/50",
			border: "border-ember-500/25",
			text: "text-ember-700",
			fill: "bg-ember-500",
		};
	if (score >= 3)
		return {
			bg: "bg-paper-2",
			border: "border-rule",
			text: "text-ink-2",
			fill: "bg-ink-3",
		};
	return {
		bg: "bg-rose-50",
		border: "border-rose-500/30",
		text: "text-rose-700",
		fill: "bg-rose-500",
	};
}
