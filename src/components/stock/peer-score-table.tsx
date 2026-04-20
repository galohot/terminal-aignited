import { Link } from "react-router";
import { useIdxPeersScored } from "../../hooks/use-idx-company";
import type { IdxPeerScoredEntry, IdxScoreCard } from "../../types/market";

interface PeerScoreTableProps {
	symbol: string;
}

export function PeerScoreTable({ symbol }: PeerScoreTableProps) {
	const isJK = symbol.endsWith(".JK");
	const kode = isJK ? symbol.replace(".JK", "") : "";
	const q = useIdxPeersScored(kode, 10);

	if (!isJK) return null;
	if (q.isLoading) {
		return (
			<div className="rounded-[14px] border border-rule bg-card">
				<div className="h-[260px] animate-pulse rounded-[14px] bg-paper-2" />
			</div>
		);
	}
	if (q.isError || !q.data) return null;
	if (q.data.peers.length === 0) return null;

	const { base, peers, basis } = q.data;

	const basisLabel = basis === "sub_sector" ? "Sub-sector peers" : basis === "sector" ? "Sector peers" : "Peers";

	return (
		<div className="rounded-[14px] border border-rule bg-card">
			<div className="flex items-center justify-between border-b border-rule px-3 py-2">
				<div className="font-mono text-[10px] text-ink-3 tracking-[0.14em] uppercase">
					{basisLabel}
				</div>
				<div className="font-mono text-[10px] text-ink-4 tracking-[0.14em] uppercase">
					Ranked by overall
				</div>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full border-collapse font-mono text-[11px]">
					<thead>
						<tr className="border-b border-rule text-ink-4">
							<th className="px-3 py-1.5 text-left text-[10px] tracking-[0.14em] uppercase">Ticker</th>
							<th className="px-3 py-1.5 text-left text-[10px] tracking-[0.14em] uppercase">Name</th>
							<th className="px-2 py-1.5 text-right text-[10px] tracking-[0.14em] uppercase">Overall</th>
							<th className="px-2 py-1.5 text-right text-[10px] tracking-[0.14em] uppercase">Val</th>
							<th className="px-2 py-1.5 text-right text-[10px] tracking-[0.14em] uppercase">Mom</th>
							<th className="px-2 py-1.5 text-right text-[10px] tracking-[0.14em] uppercase">Qual</th>
							<th className="px-2 py-1.5 text-right text-[10px] tracking-[0.14em] uppercase">Risk</th>
						</tr>
					</thead>
					<tbody>
						<PeerRow
							kode={base.kode_emiten}
							name={base.name}
							card={base.score}
							isBase
						/>
						{peers.map((p) => (
							<PeerRow key={p.kode_emiten} kode={p.kode_emiten} name={p.name} card={p.score} />
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function PeerRow({
	kode,
	name,
	card,
	isBase,
}: {
	kode: string;
	name: IdxPeerScoredEntry["name"];
	card: IdxScoreCard;
	isBase?: boolean;
}) {
	return (
		<tr
			className={`border-b border-rule/50 last:border-0 ${isBase ? "bg-ember-50/30" : "hover:bg-paper-2"}`}
		>
			<td className="px-3 py-1.5">
				<Link
					to={`/stock/${kode}.JK`}
					className={`text-ink-2 hover:text-ember-700 ${isBase ? "font-semibold" : ""}`}
				>
					{kode}
				</Link>
			</td>
			<td className="max-w-[180px] truncate px-3 py-1.5 text-ink-3">{name ?? "—"}</td>
			<ScoreCell value={card.overall} bold />
			<AxisCell card={card} axis="valuation" />
			<AxisCell card={card} axis="momentum" />
			<AxisCell card={card} axis="quality" />
			<AxisCell card={card} axis="risk" />
		</tr>
	);
}

function AxisCell({
	card,
	axis,
}: {
	card: IdxScoreCard;
	axis: "valuation" | "momentum" | "quality" | "risk";
}) {
	const a = card[axis];
	const hasData = a.strategies.length > 0;
	return <ScoreCell value={hasData ? a.score : null} />;
}

function ScoreCell({ value, bold }: { value: number | null; bold?: boolean }) {
	if (value == null) {
		return <td className="px-2 py-1.5 text-right text-ink-4">—</td>;
	}
	const color = toneText(value);
	return (
		<td className={`px-2 py-1.5 text-right ${color} ${bold ? "font-semibold" : ""}`}>
			{value.toFixed(1)}
		</td>
	);
}

function toneText(score: number): string {
	if (score >= 7) return "text-emerald-700";
	if (score >= 5) return "text-ember-700";
	if (score >= 3) return "text-ink-2";
	return "text-rose-700";
}
