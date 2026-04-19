import { Link } from "react-router";
import type { IdxPeer } from "../../types/market";

export function PeerCompanies({ peers }: { peers: IdxPeer[] }) {
	if (peers.length === 0) return null;

	return (
		<div className="rounded-[18px] border border-rule bg-card">
			<div className="border-b border-rule px-3 py-2">
				<h3 className="text-xs font-medium uppercase tracking-wider text-ink-2">
					Peer Companies
				</h3>
				<span className="font-mono text-[11px] text-ink-4">via shared insiders</span>
			</div>
			<div className="divide-y divide-rule">
				{peers.map((peer) => (
					<div key={peer.kode_emiten} className="flex items-center justify-between px-3 py-2">
						<div className="min-w-0">
							<Link
								to={`/idx/${peer.kode_emiten}`}
								className="font-mono text-xs font-medium text-ember-600 transition-colors hover:text-ember-700 hover:underline"
							>
								{peer.kode_emiten}
							</Link>
							<span className="ml-2 truncate text-xs text-ink-2">
								{peer.company_name}
							</span>
						</div>
						<span className="ml-3 shrink-0 font-mono text-xs text-ink-4">
							{peer.shared_insiders} shared
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
