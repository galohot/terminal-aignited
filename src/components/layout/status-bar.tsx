import type { ConnectionStatus } from "../../stores/realtime-store";
import { useRealtimeStore } from "../../stores/realtime-store";

const statusLabel: Record<ConnectionStatus, string> = {
	connected: "Connected",
	connecting: "Connecting...",
	disconnected: "Disconnected",
};

const statusColor: Record<ConnectionStatus, string> = {
	connected: "text-t-green",
	connecting: "text-t-amber",
	disconnected: "text-t-red",
};

const dotColor: Record<ConnectionStatus, string> = {
	connected: "bg-t-green",
	connecting: "bg-t-amber",
	disconnected: "bg-t-red",
};

export function StatusBar() {
	const status = useRealtimeStore((s) => s.status);
	const priceCount = useRealtimeStore((s) => Object.keys(s.prices).length);

	return (
		<footer className="flex h-7 shrink-0 items-center gap-4 border-t border-t-border bg-t-surface px-4 font-mono text-xs text-t-text-muted">
			<span className="flex items-center gap-1.5">
				<span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor[status]}`} />
				<span className={statusColor[status]}>{statusLabel[status]}</span>
			</span>
			{priceCount > 0 && <span>{priceCount} tickers</span>}
		</footer>
	);
}
