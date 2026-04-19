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
		<div className="flex flex-wrap items-center gap-1 border-b border-rule px-4 py-2">
			{PERIOD_OPTIONS.map((opt, i) => (
				<button
					key={opt.label}
					type="button"
					onClick={() => onSelect(i)}
					className={clsx(
						"rounded-full px-2.5 py-1 font-mono text-xs transition-colors",
						i === selectedIndex
							? "bg-ink text-paper"
							: "text-ink-4 hover:bg-paper-2 hover:text-ink",
					)}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}
