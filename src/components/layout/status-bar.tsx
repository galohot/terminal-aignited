import { Activity, Eye, Users, Zap } from "lucide-react";
import { useSiteStats } from "../../hooks/use-analytics";
import type { ConnectionStatus } from "../../stores/realtime-store";
import { useRealtimeStore } from "../../stores/realtime-store";

const statusLabel: Record<ConnectionStatus, string> = {
	connected: "Connected",
	connecting: "Connecting…",
	disconnected: "Disconnected",
};

const statusColor: Record<ConnectionStatus, string> = {
	connected: "text-pos",
	connecting: "text-spark",
	disconnected: "text-neg",
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
		<footer className="flex h-[38px] shrink-0 items-center gap-4 border-rule border-t bg-card px-4 font-mono text-[11px] text-ink-4">
			<span className="flex items-center gap-1.5">
				<span className={`aig-dot aig-dot-pulse ${statusColor[status]}`} />
				<span className={statusColor[status]}>{statusLabel[status]}</span>
			</span>

			<span className="hidden sm:inline">Jakarta {jakartaTime} WIB</span>

			{priceCount > 0 && (
				<span className="flex items-center gap-1">
					<Activity className="h-3 w-3" />
					{priceCount} tickers
				</span>
			)}

			{status === "connected" && (
				<span className="hidden items-center gap-1.5 md:flex">
					<span className="aig-dot aig-dot-pulse text-ember-500" />
					WS streaming
				</span>
			)}

			<span className="flex-1" />

			{stats && (
				<>
					{stats.online > 0 && (
						<span className="flex items-center gap-1" title="Online right now">
							<Zap className="h-3 w-3 text-pos" />
							<span className="text-pos">{stats.online}</span> online
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
