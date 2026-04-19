import { Link } from "react-router";
import type { IdxCommissioner, IdxDirector } from "../../types/market";

export function BoardList({
	directors,
	commissioners,
}: {
	directors: IdxDirector[];
	commissioners: IdxCommissioner[];
}) {
	return (
		<div className="space-y-4">
			{directors.length > 0 && (
				<div className="rounded-[18px] border border-rule bg-card">
					<div className="border-b border-rule px-3 py-2">
						<h3 className="text-xs font-medium uppercase tracking-wider text-ink-2">
							Board of Directors
						</h3>
					</div>
					<div className="divide-y divide-rule">
						{directors.map((d) => (
							<PersonRow
								key={`${d.insider_name}-${d.position}`}
								name={d.insider_name}
								position={d.position}
								isIndependent={d.is_independent}
							/>
						))}
					</div>
				</div>
			)}
			{commissioners.length > 0 && (
				<div className="rounded-[18px] border border-rule bg-card">
					<div className="border-b border-rule px-3 py-2">
						<h3 className="text-xs font-medium uppercase tracking-wider text-ink-2">
							Board of Commissioners
						</h3>
					</div>
					<div className="divide-y divide-rule">
						{commissioners.map((c) => (
							<PersonRow
								key={`${c.insider_name}-${c.position}`}
								name={c.insider_name}
								position={c.position}
								isIndependent={c.is_independent}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function PersonRow({
	isIndependent,
	name,
	position,
}: {
	name: string;
	position: string;
	isIndependent: boolean;
}) {
	return (
		<div className="flex items-center justify-between px-3 py-2">
			<Link
				to={`/idx/insiders?name=${encodeURIComponent(name)}`}
				className="min-w-0 truncate text-xs text-ink transition-colors hover:text-ember-600 hover:underline"
			>
				{name}
			</Link>
			<div className="ml-3 flex shrink-0 items-center gap-2">
				<span className="font-mono text-[11px] text-ink-4">{position}</span>
				{isIndependent && (
					<span className="rounded-full border border-cyan-400/30 bg-cyan-50 px-2 py-0.5 font-mono text-[10px] text-cyan-700">
						Independent
					</span>
				)}
			</div>
		</div>
	);
}
