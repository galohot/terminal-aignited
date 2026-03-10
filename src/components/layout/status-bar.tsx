import { Activity, Eye, Users, Zap } from "lucide-react";
import { useSiteStats } from "../../hooks/use-analytics";
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

function compactNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString();
}

export function StatusBar() {
	const status = useRealtimeStore((s) => s.status);
	const priceCount = useRealtimeStore((s) => Object.keys(s.prices).length);
	const { data: stats } = useSiteStats();
	const jakartaTime = new Intl.DateTimeFormat("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZone: "Asia/Jakarta",
	}).format(new Date());

	return (
		<footer className="flex h-8 shrink-0 items-center gap-4 border-t border-white/10 bg-[linear-gradient(180deg,rgba(15,22,21,0.98),rgba(10,14,14,0.98))] px-4 font-mono text-xs text-t-text-muted">
			{/* Connection status */}
			<span className="flex items-center gap-1.5">
				<span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor[status]}`} />
				<span className={statusColor[status]}>{statusLabel[status]}</span>
			</span>

			<span className="hidden sm:inline">Jakarta {jakartaTime} WIB</span>

			{priceCount > 0 && (
				<span className="flex items-center gap-1">
					<Activity className="h-3 w-3" />
					{priceCount} tickers
				</span>
			)}

			{/* Spacer */}
			<span className="flex-1" />

			{/* Cumulative site stats — never resets */}
			{stats && (
				<>
					{stats.online > 0 && (
						<span className="flex items-center gap-1" title="Online right now">
							<Zap className="h-3 w-3 text-t-green" />
							<span className="text-t-green">{stats.online}</span> online
						</span>
					)}
					<span className="hidden items-center gap-1 sm:flex" title="Total unique visitors">
						<Users className="h-3 w-3" />
						{compactNumber(stats.total_visitors)} visitors
					</span>
					<span className="hidden items-center gap-1 md:flex" title="Total page views">
						<Eye className="h-3 w-3" />
						{compactNumber(stats.total_views)} views
					</span>
				</>
			)}
		</footer>
	);
}
