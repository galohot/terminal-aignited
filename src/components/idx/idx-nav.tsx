import { clsx } from "clsx";
import { Activity, Building2, Filter, Network, Search } from "lucide-react";
import { Link, useLocation } from "react-router";

const IDX_LINKS = [
	{ to: "/idx", label: "Explorer", icon: Search, exact: true },
	{ to: "/idx/screener", label: "Screener", icon: Filter, exact: false },
	{ to: "/idx/flow", label: "Flow", icon: Activity, exact: false },
	{ to: "/idx/insiders", label: "Insiders", icon: Network, exact: false },
	{ to: "/idx/entities", label: "Power Map", icon: Building2, exact: false },
] as const;

export function IdxNav() {
	const { pathname } = useLocation();

	return (
		<div className="-mx-4 mb-5 overflow-x-auto border-b border-white/[0.06] px-4 sm:mx-0 sm:px-0">
			<div className="flex items-center gap-1 pb-3">
				{IDX_LINKS.map((link) => {
					const active = link.exact ? pathname === link.to : pathname.startsWith(link.to);
					const Icon = link.icon;

					return (
						<Link
							key={link.to}
							to={link.to}
							className={clsx(
								"group flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-all",
								active
									? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
									: "text-t-text-muted hover:bg-white/[0.04] hover:text-t-text-secondary",
							)}
						>
							<Icon
								className={clsx(
									"h-3.5 w-3.5 transition-colors",
									active ? "text-t-amber" : "text-t-text-muted/60 group-hover:text-t-text-muted",
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
