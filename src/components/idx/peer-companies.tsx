import { Link } from "react-router";
import type { IdxPeer } from "../../types/market";

export function PeerCompanies({ peers }: { peers: IdxPeer[] }) {
	if (peers.length === 0) return null;

	return (
		<div className="rounded border border-t-border bg-t-surface">
			<div className="border-b border-t-border px-3 py-2">
				<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
					Peer Companies
				</h3>
				<span className="font-mono text-[11px] text-t-text-muted">via shared insiders</span>
			</div>
			<div className="divide-y divide-white/5">
				{peers.map((peer) => (
					<div key={peer.kode_emiten} className="flex items-center justify-between px-3 py-2">
						<div className="min-w-0">
							<Link
								to={`/idx/${peer.kode_emiten}`}
								className="font-mono text-xs font-medium text-t-green transition-colors hover:text-t-amber hover:underline"
							>
								{peer.kode_emiten}
							</Link>
							<span className="ml-2 truncate text-xs text-t-text-secondary">
								{peer.company_name}
							</span>
						</div>
						<span className="ml-3 shrink-0 font-mono text-xs text-t-text-muted">
							{peer.shared_insiders} shared
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
