import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { CommandBar } from "../search/command-bar";

const NAV_LINKS = [
	{ to: "/", label: "IDX Home" },
	{ to: "/watchlist", label: "Watchlist" },
	{ to: "/charts", label: "Charts" },
] as const;

export function Header() {
	const location = useLocation();
	const [time, setTime] = useState(() => formatDeskTimes());

	useEffect(() => {
		const id = setInterval(() => setTime(formatDeskTimes()), 1000);
		return () => clearInterval(id);
	}, []);

	return (
		<header className="flex h-14 shrink-0 items-center gap-4 border-b border-white/10 bg-[linear-gradient(180deg,rgba(16,24,23,0.98),rgba(10,14,14,0.96))] px-4">
			<Link to="/" className="flex shrink-0 items-center gap-3">
				<span className="rounded-md border border-t-amber/40 bg-t-amber/10 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-t-amber">
					ID
				</span>
				<div className="leading-tight">
					<div className="font-mono text-sm font-semibold tracking-[0.24em] text-white">
						NUSANTARA
					</div>
					<div className="hidden text-[10px] uppercase tracking-[0.22em] text-t-text-muted sm:block">
						Jakarta Market Desk
					</div>
				</div>
			</Link>
			<nav className="hidden items-center gap-1 sm:flex">
				{NAV_LINKS.map((link) => (
					<Link
						key={link.to}
						to={link.to}
						className={clsx(
							"rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors",
							location.pathname === link.to ||
								(link.to !== "/" && location.pathname.startsWith(link.to))
								? "bg-white text-black"
								: "text-t-text-muted hover:bg-white/8 hover:text-white",
						)}
					>
						{link.label}
					</Link>
				))}
			</nav>
			<CommandBar />
			<div className="hidden shrink-0 text-right font-mono sm:block">
				<div className="text-xs text-white">{time.jakarta} WIB</div>
				<div className="text-[10px] uppercase tracking-[0.2em] text-t-text-muted">
					{time.utc} UTC
				</div>
			</div>
		</header>
	);
}

function formatDeskTimes() {
	const d = new Date();
	return {
		jakarta: new Intl.DateTimeFormat("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
			timeZone: "Asia/Jakarta",
		}).format(d),
		utc: d.toISOString().slice(11, 19),
	};
}
