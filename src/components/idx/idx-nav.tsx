import { clsx } from "clsx";
import {
	Activity,
	BarChart3,
	Building2,
	Filter,
	Network,
	PieChart,
	Search,
	TrendingUp,
} from "lucide-react";
import { Link, useLocation } from "react-router";

const IDX_LINKS = [
	{ to: "/idx", label: "Explorer", icon: Search, exact: true },
	{ to: "/idx/movers", label: "Movers", icon: TrendingUp, exact: false },
	{ to: "/idx/screener", label: "Screener", icon: Filter, exact: false },
	{ to: "/idx/flow", label: "Flow", icon: Activity, exact: false },
	{ to: "/idx/insiders", label: "Insiders", icon: Network, exact: false },
	{ to: "/idx/ownership", label: "Ownership", icon: PieChart, exact: false },
	{ to: "/idx/entities", label: "Power Map", icon: Building2, exact: false },
	{ to: "/idx/macro", label: "Macro", icon: BarChart3, exact: false },
] as const;

export function IdxNav() {
	const { pathname } = useLocation();

	return (
		<div className="-mx-4 mb-5 overflow-x-auto border-b border-rule px-4 sm:mx-0 sm:px-0">
			<div className="flex items-center gap-1 pb-3">
				{IDX_LINKS.map((link) => {
					const active = link.exact ? pathname === link.to : pathname.startsWith(link.to);
					const Icon = link.icon;

					return (
						<Link
							key={link.to}
							to={link.to}
							className={clsx(
								"group flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-all",
								active
									? "bg-card text-ink shadow-[0_1px_2px_rgba(20,23,53,0.06),inset_0_0_0_1px_var(--color-rule)]"
									: "text-ink-4 hover:bg-paper-2 hover:text-ink-2",
							)}
						>
							<Icon
								className={clsx(
									"h-3.5 w-3.5 transition-colors",
									active ? "text-ember-600" : "text-ink-4/70 group-hover:text-ink-3",
								)}
							/>
							{link.label}
						</Link>
					);
				})}
			</div>
		</div>
	);
}
