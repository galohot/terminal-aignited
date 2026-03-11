import { Link } from "react-router";
import { usePageTitle } from "../hooks/use-page-title";

export function NotFoundPage() {
	usePageTitle("404 — Not Found");

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
			<div className="font-mono text-6xl font-bold tracking-wider text-t-text-muted">404</div>
			<p className="font-mono text-sm text-t-text-secondary">This page doesn't exist.</p>
			<Link
				to="/"
				className="mt-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-xs uppercase tracking-wider text-t-text-secondary transition-colors hover:bg-white/10 hover:text-white"
			>
				Back to Dashboard
			</Link>
		</div>
	);
}
