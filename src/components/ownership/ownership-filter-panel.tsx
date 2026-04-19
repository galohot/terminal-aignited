import clsx from "clsx";
import { INVESTOR_TYPE_COLORS, INVESTOR_TYPE_LABELS, LOCAL_FOREIGN_LABELS } from "./constants";
import type { InvestorType } from "./types";

interface FilterPanelProps {
	selectedTypes: InvestorType[];
	onTypesChange: (types: InvestorType[]) => void;
	selectedLF: ("L" | "A" | "")[];
	onLFChange: (lf: ("L" | "A" | "")[]) => void;
	minConnections: number;
	onMinConnectionsChange: (n: number) => void;
	typeCounts?: Partial<Record<InvestorType, number>>;
	lfCounts?: Partial<Record<string, number>>;
}

const ALL_TYPES = Object.keys(INVESTOR_TYPE_COLORS) as InvestorType[];

export function FilterPanel({
	selectedTypes,
	onTypesChange,
	selectedLF,
	onLFChange,
	minConnections,
	onMinConnectionsChange,
	typeCounts,
	lfCounts,
}: FilterPanelProps) {
	function toggleType(t: InvestorType) {
		if (selectedTypes.includes(t)) {
			onTypesChange(selectedTypes.filter((x) => x !== t));
		} else {
			onTypesChange([...selectedTypes, t]);
		}
	}

	function toggleLF(v: "L" | "A" | "") {
		if (selectedLF.includes(v)) {
			onLFChange(selectedLF.filter((x) => x !== v));
		} else {
			onLFChange([...selectedLF, v]);
		}
	}

	return (
		<div className="space-y-4 rounded-[18px] border border-rule bg-card p-4">
			<div>
				<p className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-2">
					Investor Type
				</p>
				<div className="flex flex-wrap gap-1.5">
					{ALL_TYPES.map((t) => {
						const selected = selectedTypes.includes(t);
						const count = typeCounts?.[t] ?? 0;
						const hasData = !typeCounts || count > 0;
						return (
							<button
								type="button"
								key={t}
								onClick={() => toggleType(t)}
								className={clsx(
									"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono text-xs font-medium transition-all",
									selected
										? "border-transparent"
										: hasData
											? "border-rule text-ink-3 hover:border-ink/30 hover:text-ink"
											: "border-rule/50 text-ink-4/60",
								)}
								style={
									selected
										? {
												backgroundColor: `${INVESTOR_TYPE_COLORS[t]}15`,
												color: INVESTOR_TYPE_COLORS[t],
												borderColor: `${INVESTOR_TYPE_COLORS[t]}30`,
											}
										: undefined
								}
							>
								<span
									className={clsx(
										"h-2 w-2 shrink-0 rounded-full",
										!hasData && !selected && "opacity-30",
									)}
									style={{ backgroundColor: INVESTOR_TYPE_COLORS[t] }}
								/>
								{INVESTOR_TYPE_LABELS[t]}
								{typeCounts && (
									<span
										className={clsx(
											"font-mono text-[10px]",
											selected ? "opacity-70" : "opacity-40",
										)}
									>
										{count}
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>

			<div>
				<p className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-2">
					Origin
				</p>
				<div className="flex gap-2">
					{(["L", "A", ""] as const).map((v) => {
						const count = lfCounts?.[v] ?? 0;
						const hasData = !lfCounts || count > 0;
						return (
							<button
								type="button"
								key={v}
								onClick={() => toggleLF(v)}
								className={clsx(
									"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs font-medium transition-all",
									selectedLF.includes(v)
										? "border-ember-400/30 bg-ember-50 text-ember-700"
										: hasData
											? "border-rule text-ink-3 hover:border-ink/30 hover:text-ink"
											: "border-rule/50 text-ink-4/60",
								)}
							>
								{LOCAL_FOREIGN_LABELS[v]}
								{lfCounts && (
									<span
										className={clsx(
											"font-mono text-[10px]",
											selectedLF.includes(v) ? "opacity-70" : "opacity-40",
										)}
									>
										{count}
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>

			<div>
				<p className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-2">
					Min. Connections: <span className="text-ink">{minConnections}</span>
				</p>
				<input
					type="range"
					min={2}
					max={20}
					value={minConnections}
					onChange={(e) => onMinConnectionsChange(parseInt(e.target.value, 10))}
					className="w-full accent-ember-500"
				/>
				<div className="mt-1 flex justify-between font-mono text-[10px] text-ink-4">
					<span>2</span>
					<span>20</span>
				</div>
			</div>
		</div>
	);
}
