import { clsx } from "clsx";
import { useNavigate } from "react-router";
import type { MoverStock } from "../../types/market";

function formatVolume(v: number): string {
	if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
	if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
	if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
	return v.toLocaleString();
}

function formatMarketCap(value: number | null): string {
	if (value == null) return "—";
	const abs = Math.abs(value);
	if (abs >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
	if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
	if (abs >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
	return value.toLocaleString();
}

type SortField = "change_percent" | "volume" | "relative_volume" | "gap_percent" | "market_cap";

export function MoversTable({
	movers,
	sortField,
	sortOrder,
	onSort,
}: {
	movers: MoverStock[];
	sortField: string;
	sortOrder: string;
	onSort: (field: SortField) => void;
}) {
	const navigate = useNavigate();

	return (
		<div className="overflow-x-auto rounded-lg border border-t-border">
			<table className="w-full text-xs">
				<thead>
					<tr className="border-b border-white/10 bg-white/[0.02]">
						<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
							Symbol
						</th>
						<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
							Name
						</th>
						<SortHeader
							label="Change%"
							field="change_percent"
							current={sortField}
							order={sortOrder}
							onClick={onSort}
						/>
						<th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
							Price
						</th>
						<SortHeader
							label="Volume"
							field="volume"
							current={sortField}
							order={sortOrder}
							onClick={onSort}
						/>
						<SortHeader
							label="Rel Vol"
							field="relative_volume"
							current={sortField}
							order={sortOrder}
							onClick={onSort}
						/>
						<SortHeader
							label="Gap%"
							field="gap_percent"
							current={sortField}
							order={sortOrder}
							onClick={onSort}
						/>
						<th className="hidden px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted md:table-cell">
							Sector
						</th>
						<SortHeader
							label="Mkt Cap"
							field="market_cap"
							current={sortField}
							order={sortOrder}
							onClick={onSort}
							className="hidden lg:table-cell"
						/>
					</tr>
				</thead>
				<tbody className="divide-y divide-white/5">
					{movers.map((stock) => (
						<tr
							key={stock.symbol}
							onClick={() => navigate(`/stock/${stock.symbol}`)}
							className="cursor-pointer transition-colors hover:bg-white/[0.04]"
						>
							<td className="whitespace-nowrap px-3 py-2">
								<span className="font-mono text-xs font-medium text-t-green">
									{stock.symbol}
								</span>
							</td>
							<td className="max-w-[180px] truncate px-3 py-2 text-t-text-secondary">
								{stock.name}
							</td>
							<td
								className={clsx(
									"whitespace-nowrap px-3 py-2 text-right font-mono font-medium",
									stock.change_percent >= 0 ? "text-t-green" : "text-t-red",
								)}
							>
								{stock.change_percent >= 0 ? "+" : ""}
								{stock.change_percent.toFixed(2)}%
							</td>
							<td className="whitespace-nowrap px-3 py-2 text-right font-mono text-t-text-secondary">
								{stock.price.toLocaleString()}
							</td>
							<td className="whitespace-nowrap px-3 py-2 text-right font-mono text-t-text-secondary">
								{formatVolume(stock.volume)}
							</td>
							<td
								className={clsx(
									"whitespace-nowrap px-3 py-2 text-right font-mono",
									stock.relative_volume != null && stock.relative_volume > 1.5
										? "font-medium text-t-amber"
										: "text-t-text-secondary",
								)}
							>
								{stock.relative_volume != null
									? `${stock.relative_volume.toFixed(1)}x`
									: "—"}
							</td>
							<td
								className={clsx(
									"whitespace-nowrap px-3 py-2 text-right font-mono",
									stock.gap_percent >= 0 ? "text-t-green" : "text-t-red",
								)}
							>
								{stock.gap_percent >= 0 ? "+" : ""}
								{stock.gap_percent.toFixed(2)}%
							</td>
							<td className="hidden whitespace-nowrap px-3 py-2 text-t-text-muted md:table-cell">
								{stock.sector}
							</td>
							<td className="hidden whitespace-nowrap px-3 py-2 text-right font-mono text-t-text-secondary lg:table-cell">
								{formatMarketCap(stock.market_cap)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function SortHeader({
	label,
	field,
	current,
	order,
	onClick,
	className,
}: {
	label: string;
	field: SortField;
	current: string;
	order: string;
	onClick: (field: SortField) => void;
	className?: string;
}) {
	const isActive = current === field;
	return (
		<th className={clsx("px-3 py-2 text-right", className)}>
			<button
				type="button"
				onClick={() => onClick(field)}
				className={clsx(
					"font-mono text-[10px] uppercase tracking-wider transition-colors",
					isActive ? "text-t-amber" : "text-t-text-muted hover:text-t-text-secondary",
				)}
			>
				{label}
				{isActive && <span className="ml-1">{order === "desc" ? "↓" : "↑"}</span>}
			</button>
		</th>
	);
}
