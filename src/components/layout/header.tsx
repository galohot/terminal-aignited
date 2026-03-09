import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CommandBar } from "../search/command-bar";

export function Header() {
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
			<CommandBar />
			<span className="shrink-0 font-mono text-xs text-t-text-muted">{time} UTC</span>
		</header>
	);
}

function formatUTCTime(): string {
	const d = new Date();
	return d.toISOString().slice(11, 19);
}
