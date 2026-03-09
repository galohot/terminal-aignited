import { useIsFetching } from "@tanstack/react-query";

export function StatusBar() {
	const activeFetches = useIsFetching();
	const isPolling = activeFetches > 0;

	return (
		<footer className="flex h-7 shrink-0 items-center gap-4 border-t border-t-border bg-t-surface px-4 font-mono text-xs text-t-text-muted">
			<span className="flex items-center gap-1.5">
				<span
					className={`inline-block h-1.5 w-1.5 rounded-full ${isPolling ? "bg-t-green" : "bg-t-amber"}`}
				/>
				<span className={isPolling ? "text-t-green" : "text-t-amber"}>
					{isPolling ? "Polling" : "Idle"}
				</span>
			</span>
			<span>Auto-refresh 30s</span>
		</footer>
	);
}
