import { useMemo } from "react";
import { formatPercent } from "../../lib/format";
import { type ApacSessionStatus, getApacSessions } from "../../lib/market-sessions";
import type { Quote } from "../../types/market";

export function ApacSessionBar({ apacQuotes }: { apacQuotes: Quote[] }) {
	const sessions = useMemo(() => getApacSessions(), []);

	const apacSummary = useMemo(() => {
		if (apacQuotes.length === 0) return null;
		const avg = apacQuotes.reduce((sum, q) => sum + (q.change_percent ?? 0), 0) / apacQuotes.length;
		const up = apacQuotes.filter((q) => q.change_percent > 0).length;
		const down = apacQuotes.filter((q) => q.change_percent < 0).length;
		const tone = up > down ? "positive" : up < down ? "negative" : "mixed";
		return { avg, up, down, tone };
	}, [apacQuotes]);

	return (
		<div className="space-y-3">
			{apacSummary && (
				<div className="font-mono text-xs text-t-text-secondary">
					APAC{" "}
					{apacSummary.tone === "positive"
						? "positive"
						: apacSummary.tone === "negative"
							? "negative"
							: "mixed"}{" "}
					— avg {formatPercent(apacSummary.avg)}, {apacSummary.up} up / {apacSummary.down} down
				</div>
			)}
			<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
				{sessions.map((s) => (
					<SessionTile key={s.code} session={s} />
				))}
			</div>
		</div>
	);
}

function SessionTile({ session }: { session: ApacSessionStatus }) {
	return (
		<div className="flex items-center gap-2 rounded-xl border border-white/6 bg-white/[0.04] px-3 py-2">
			<span
				className={`h-2 w-2 shrink-0 rounded-full ${session.isOpen ? "bg-t-green" : "bg-t-red/60"}`}
			/>
			<div className="min-w-0">
				<div className="font-mono text-[11px] font-medium text-white">{session.name}</div>
				<div className="font-mono text-[10px] text-t-text-muted">
					{session.isOpen ? session.localTime : "Closed"}
				</div>
			</div>
		</div>
	);
}
