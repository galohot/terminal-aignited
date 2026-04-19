import { clsx } from "clsx";
import { BarChart3, Building2, Network, PieChart, Users } from "lucide-react";
import { Link, useLocation } from "react-router";

const OWNERSHIP_LINKS = [
	{ to: "/idx/ownership", label: "Overview", icon: PieChart, exact: true },
	{ to: "/idx/ownership/companies", label: "Companies", icon: Building2, exact: false },
	{ to: "/idx/ownership/investors", label: "Investors", icon: Users, exact: false },
	{ to: "/idx/ownership/network", label: "Network", icon: Network, exact: false },
] as const;

export function OwnershipNav() {
	const { pathname } = useLocation();

	return (
		<div className="mb-4 flex items-center gap-1 overflow-x-auto">
			{OWNERSHIP_LINKS.map((link) => {
				const active = link.exact ? pathname === link.to : pathname.startsWith(link.to);
				const Icon = link.icon;

				return (
					<Link
						key={link.to}
						to={link.to}
						className={clsx(
							"group flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-all",
							active
								? "border border-ink bg-ink text-paper"
								: "border border-transparent text-ink-3 hover:bg-paper-2 hover:text-ink",
						)}
					>
						<Icon
							className={clsx(
								"h-3 w-3 transition-colors",
								active ? "text-ember-400" : "text-ink-4 group-hover:text-ink-2",
							)}
						/>
						{link.label}
					</Link>
				);
			})}
		</div>
	);
}
