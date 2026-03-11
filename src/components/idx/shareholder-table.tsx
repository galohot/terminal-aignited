import { Link } from "react-router";
import type { IdxShareholder } from "../../types/market";

export function ShareholderTable({ shareholders }: { shareholders: IdxShareholder[] }) {
	if (shareholders.length === 0) return null;

	return (
		<div className="rounded border border-t-border bg-t-surface">
			<div className="border-b border-t-border px-3 py-2">
				<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
					Shareholders
				</h3>
			</div>
			<div className="divide-y divide-white/5">
				{shareholders.map((sh, i) => (
					<div
						key={`${sh.insider_name}-${sh.percentage}-${i}`}
						className="flex items-center justify-between px-3 py-2"
					>
						<Link
							to={`/idx/insiders?name=${encodeURIComponent(sh.insider_name)}`}
							className="min-w-0 truncate text-xs text-t-text transition-colors hover:text-t-amber hover:underline"
						>
							{sh.insider_name}
						</Link>
						<div className="ml-3 flex shrink-0 items-center gap-3">
							<span className="font-mono text-xs text-t-text-muted">
								{sh.shares_owned != null ? sh.shares_owned.toLocaleString("en-US") : "—"}
							</span>
							<span className="w-16 text-right font-mono text-xs font-medium text-t-amber">
								{sh.percentage != null ? `${sh.percentage.toFixed(2)}%` : "—"}
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
