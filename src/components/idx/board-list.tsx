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
				<div className="rounded border border-t-border bg-t-surface">
					<div className="border-b border-t-border px-3 py-2">
						<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
							Board of Directors
						</h3>
					</div>
					<div className="divide-y divide-white/5">
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
				<div className="rounded border border-t-border bg-t-surface">
					<div className="border-b border-t-border px-3 py-2">
						<h3 className="text-xs font-medium uppercase tracking-wider text-t-text-secondary">
							Board of Commissioners
						</h3>
					</div>
					<div className="divide-y divide-white/5">
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
			<span className="min-w-0 truncate text-xs text-t-text">{name}</span>
			<div className="ml-3 flex shrink-0 items-center gap-2">
				<span className="font-mono text-[11px] text-t-text-muted">{position}</span>
				{isIndependent && (
					<span className="rounded-full border border-t-blue/30 bg-t-blue/10 px-2 py-0.5 font-mono text-[10px] text-t-blue">
						Independent
					</span>
				)}
			</div>
		</div>
	);
}
