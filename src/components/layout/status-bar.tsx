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
	const jakartaTime = new Intl.DateTimeFormat("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZone: "Asia/Jakarta",
	}).format(new Date());

	return (
		<footer className="flex h-8 shrink-0 items-center gap-4 border-t border-white/10 bg-[linear-gradient(180deg,rgba(15,22,21,0.98),rgba(10,14,14,0.98))] px-4 font-mono text-xs text-t-text-muted">
			<span className="flex items-center gap-1.5">
				<span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor[status]}`} />
				<span className={statusColor[status]}>{statusLabel[status]}</span>
			</span>
			<span className="hidden sm:inline">Jakarta {jakartaTime} WIB</span>
			{priceCount > 0 && <span>{priceCount} tickers</span>}
		</footer>
	);
}
