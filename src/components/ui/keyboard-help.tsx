interface ShortcutGroup {
	title: string;
	shortcuts: [string, string][];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
	{
		title: "Global",
		shortcuts: [
			["Ctrl+K  /  /", "Focus search"],
			["Esc", "Close / unfocus"],
			["1", "Market Dashboard"],
			["2", "Watchlist"],
			["?", "Show shortcuts"],
		],
	},
	{
		title: "Quote Detail",
		shortcuts: [
			["W", "Toggle watchlist"],
			["F", "Go to financials"],
			["3-9", "Switch chart period"],
		],
	},
	{
		title: "Financials",
		shortcuts: [
			["I", "Income Statement"],
			["B", "Balance Sheet"],
			["C", "Cash Flow"],
			["A", "Annual"],
			["Q", "Quarterly"],
		],
	},
];

interface KeyboardHelpProps {
	onClose: () => void;
}

export function KeyboardHelp({ onClose }: KeyboardHelpProps) {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
		<div
			role="presentation"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
			onClick={onClose}
			onKeyDown={(e) => e.key === "Escape" && onClose()}
		>
			<div
				role="dialog"
				className="w-full max-w-lg rounded border border-t-border bg-t-surface p-6"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-mono text-sm font-medium text-t-text">Keyboard Shortcuts</h2>
					<button
						type="button"
						onClick={onClose}
						className="font-mono text-xs text-t-text-muted hover:text-t-text-secondary"
					>
						ESC
					</button>
				</div>
				<div className="space-y-4">
					{SHORTCUT_GROUPS.map((group) => (
						<div key={group.title}>
							<h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-t-text-muted">
								{group.title}
							</h3>
							<div className="space-y-1">
								{group.shortcuts.map(([key, desc]) => (
									<div key={key} className="flex items-center justify-between py-0.5">
										<span className="text-xs text-t-text-secondary">{desc}</span>
										<kbd className="rounded border border-t-border bg-t-bg px-1.5 py-0.5 font-mono text-[10px] text-t-text-muted">
											{key}
										</kbd>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
