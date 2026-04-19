import { clsx } from "clsx";
import type { MoversParams } from "../../types/market";

export interface MoversPreset {
	label: string;
	params: Partial<MoversParams>;
}

export const MOVERS_PRESETS: MoversPreset[] = [
	{ label: "All", params: {} },
	{
		label: "Breakout",
		params: { preset: "breakout", change_min: 3, relative_volume_min: 1.5 },
	},
	{
		label: "Unusual Volume",
		params: { preset: "unusual_volume", relative_volume_min: 2 },
	},
	{ label: "Gap Up", params: { preset: "gap_up", change_min: 2 } },
	{ label: "Gap Down", params: { preset: "gap_down", change_max: -2 } },
	{
		label: "Selloff",
		params: { preset: "selloff", change_max: -3, relative_volume_min: 1.5 },
	},
];

export function MoversPresetsBar({
	active,
	onSelect,
}: {
	active: string;
	onSelect: (preset: MoversPreset) => void;
}) {
	return (
		<div className="mb-4 flex flex-wrap gap-2">
			{MOVERS_PRESETS.map((preset) => {
				const isActive = active === preset.label;
				return (
					<button
						key={preset.label}
						type="button"
						onClick={() => onSelect(preset)}
						className={clsx(
							"rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
							isActive
								? "border-ink bg-ink text-paper"
								: "border-rule bg-card text-ink-3 hover:bg-paper-2 hover:text-ink",
						)}
					>
						{preset.label}
					</button>
				);
			})}
		</div>
	);
}
