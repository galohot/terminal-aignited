import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { CommandBar } from "../search/command-bar";

const NAV_LINKS = [
	{ to: "/", label: "Markets" },
	{ to: "/watchlist", label: "Watchlist" },
	{ to: "/charts", label: "Charts" },
] as const;

export function Header() {
	const location = useLocation();
	const [time, setTime] = useState(() => formatUTCTime());

	useEffect(() => {
		const id = setInterval(() => setTime(formatUTCTime()), 1000);
		return () => clearInterval(id);
	}, []);

	return (
		<header className="flex h-12 shrink-0 items-center gap-4 border-b border-t-border bg-t-surface px-4">
			<Link to="/" className="shrink-0 font-mono text-sm font-medium text-t-green">
				TERMINAL
			</Link>
			<nav className="hidden items-center gap-1 sm:flex">
				{NAV_LINKS.map((link) => (
					<Link
						key={link.to}
						to={link.to}
						className={clsx(
							"rounded px-2 py-1 font-mono text-xs transition-colors",
							location.pathname === link.to ||
								(link.to !== "/" && location.pathname.startsWith(link.to))
								? "bg-t-hover text-t-text"
								: "text-t-text-muted hover:bg-t-hover hover:text-t-text-secondary",
						)}
					>
						{link.label}
					</Link>
				))}
			</nav>
			<CommandBar />
			<span className="shrink-0 font-mono text-xs text-t-text-muted">{time} UTC</span>
		</header>
	);
}

function formatUTCTime(): string {
	const d = new Date();
	return d.toISOString().slice(11, 19);
}
