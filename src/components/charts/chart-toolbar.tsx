import { clsx } from "clsx";
import { DEFAULT_PERIOD_INDEX, PERIOD_OPTIONS } from "../../lib/constants";

interface ChartToolbarProps {
	selectedIndex: number;
	onSelect: (index: number) => void;
}

export function ChartToolbar({
	selectedIndex = DEFAULT_PERIOD_INDEX,
	onSelect,
}: ChartToolbarProps) {
	return (
		<div className="flex items-center gap-1 px-4 py-2">
			{PERIOD_OPTIONS.map((opt, i) => (
				<button
					key={opt.label}
					type="button"
					onClick={() => onSelect(i)}
					className={clsx(
						"rounded px-2 py-0.5 font-mono text-xs transition-colors",
						i === selectedIndex
							? "bg-t-border-active text-t-text"
							: "text-t-text-muted hover:bg-t-hover hover:text-t-text-secondary",
					)}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}
