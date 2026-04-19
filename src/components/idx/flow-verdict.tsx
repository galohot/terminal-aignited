import { clsx } from "clsx";
import type { FlowVerdict } from "../../types/flow";
import { FlowRegimeBadge } from "./flow-regime-badge";

const SIGNAL_STYLES: Record<string, { bg: string; text: string; label: string; icon: string }> = {
	bullish: {
		bg: "border-pos/25 bg-pos/[0.04]",
		text: "text-pos",
		label: "BULLISH",
		icon: "▲",
	},
	bearish: {
		bg: "border-neg/25 bg-neg/[0.04]",
		text: "text-neg",
		label: "BEARISH",
		icon: "▼",
	},
	neutral: {
		bg: "border-ember-400/30 bg-ember-50",
		text: "text-ember-700",
		label: "NEUTRAL",
		icon: "●",
	},
};

export function FlowVerdictPanel({ verdict, symbol }: { verdict: FlowVerdict; symbol: string }) {
	const style = SIGNAL_STYLES[verdict.signal];

	return (
		<div className={clsx("rounded-[18px] border p-4", style.bg)}>
			{/* Header */}
			<div className="mb-3 flex items-center justify-between">
				<div>
					<span className="font-mono text-[10px] uppercase tracking-wider text-ink-4">
						Verdict
					</span>
					<div className="mt-0.5 font-mono text-xs text-ink-2">{symbol}</div>
				</div>
				<div className="text-right">
					<div className={clsx("flex items-center gap-2 font-mono text-lg font-bold", style.text)}>
						<span>{style.icon}</span>
						<span className="tracking-wider">{style.label}</span>
					</div>
					<div className="mt-0.5 font-mono text-[10px] text-ink-4">
						{verdict.conviction}% conviction
					</div>
				</div>
			</div>

			{/* Wyckoff current phase */}
			{verdict.wyckoff && (
				<div className="mb-3 rounded-md border border-rule bg-card p-3">
					<div className="flex items-center justify-between">
						<span className="font-mono text-[10px] uppercase tracking-wider text-ink-4">
							Wyckoff Phase
						</span>
						<span className="font-mono text-xs font-medium capitalize text-ink">
							{verdict.wyckoff.phase}
						</span>
					</div>
					<div className="mt-2 flex items-center gap-3">
						<div className="flex-1">
							<div className="mb-1 flex justify-between font-mono text-[10px] text-ink-4">
								<span>Confidence</span>
								<span>{Math.round(verdict.wyckoff.confidence * 100)}%</span>
							</div>
							<div className="h-1.5 rounded-full bg-paper-2">
								<div
									className="h-full rounded-full bg-ember-500"
									style={{ width: `${verdict.wyckoff.confidence * 100}%` }}
								/>
							</div>
						</div>
						<span
							className={clsx(
								"font-mono text-xs",
								verdict.wyckoff.priceChange >= 0 ? "text-pos" : "text-neg",
							)}
						>
							{verdict.wyckoff.priceChange >= 0 ? "+" : ""}
							{verdict.wyckoff.priceChange.toFixed(1)}%
						</span>
					</div>
				</div>
			)}

			{/* Indicators */}
			<div className="mb-3 grid grid-cols-2 gap-2">
				<IndicatorGauge
					label="MFI"
					value={verdict.mfi.current}
					signal={verdict.mfi.signal}
					lowLabel="OS"
					highLabel="OB"
					lowThreshold={20}
					highThreshold={80}
				/>
				<IndicatorGauge
					label="RSI"
					value={verdict.rsi.current}
					signal={verdict.rsi.signal}
					lowLabel="OS"
					highLabel="OB"
					lowThreshold={30}
					highThreshold={70}
				/>
			</div>

			{/* Divergences */}
			{verdict.divergences.divergences.length > 0 && (
				<div className="mb-3 rounded-md border border-rule bg-card p-3">
					<span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-ink-4">
						Divergences
					</span>
					{verdict.divergences.divergences.map((div) => (
						<div key={`${div.indicator}-${div.type}`} className="flex items-start gap-2 py-1">
							<span
								className={clsx(
									"mt-0.5 font-mono text-[10px] font-bold",
									div.type === "bullish" ? "text-pos" : "text-neg",
								)}
							>
								{div.type === "bullish" ? "▲" : "▼"}
							</span>
							<div>
								<span className="font-mono text-[11px] text-ink">
									{div.type === "bullish" ? "Bullish" : "Bearish"} ({div.indicator})
								</span>
								<p className="mt-0.5 font-mono text-[10px] text-ink-4">{div.description}</p>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Volume trend */}
			<div className="mb-3 rounded-md border border-rule bg-card p-3">
				<div className="flex items-center justify-between">
					<span className="font-mono text-[10px] uppercase tracking-wider text-ink-4">
						Volume Trend
					</span>
					<span
						className={clsx(
							"font-mono text-[10px] font-medium uppercase",
							verdict.volumeTrend.direction === "increasing"
								? "text-pos"
								: verdict.volumeTrend.direction === "decreasing"
									? "text-neg"
									: "text-ink-2",
						)}
					>
						{verdict.volumeTrend.direction}
					</span>
				</div>
				<p className="mt-1 font-mono text-[10px] text-ink-4">{verdict.volumeTrend.description}</p>
			</div>

			{/* Regime */}
			<div className="mb-3">
				<span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-ink-4">
					Stock Regime
				</span>
				<FlowRegimeBadge regime={verdict.regime} />
			</div>

			{/* Factors */}
			<div className="border-t border-rule pt-3">
				<span className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-ink-4">
					Factors
				</span>
				<ul className="space-y-1">
					{verdict.reasons.map((reason) => (
						<li
							key={reason}
							className="flex items-start gap-2 font-mono text-[11px] text-ink-2"
						>
							<span className="mt-0.5 text-ink-4">·</span>
							{reason}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

function IndicatorGauge({
	label,
	value,
	signal,
	lowLabel,
	highLabel,
	lowThreshold,
	highThreshold,
}: {
	label: string;
	value: number;
	signal: string;
	lowLabel: string;
	highLabel: string;
	lowThreshold: number;
	highThreshold: number;
}) {
	return (
		<div className="rounded-md border border-rule bg-card p-2.5">
			<div className="flex items-center justify-between">
				<span className="font-mono text-[10px] uppercase tracking-wider text-ink-4">
					{label}
				</span>
				<span
					className={clsx(
						"font-mono text-xs font-medium",
						signal === "overbought"
							? "text-neg"
							: signal === "oversold"
								? "text-pos"
								: "text-ink-2",
					)}
				>
					{value.toFixed(0)}
				</span>
			</div>
			<div className="mt-1.5 h-1.5 rounded-full bg-paper-2">
				<div
					className={clsx(
						"h-full rounded-full",
						value >= highThreshold ? "bg-neg" : value <= lowThreshold ? "bg-pos" : "bg-ember-500",
					)}
					style={{ width: `${value}%` }}
				/>
			</div>
			<div className="mt-0.5 flex justify-between font-mono text-[8px] text-ink-4">
				<span>{lowLabel}</span>
				<span>{highLabel}</span>
			</div>
		</div>
	);
}
