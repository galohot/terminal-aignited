import { Link } from "react-router";
import { usePageTitle } from "../hooks/use-page-title";

export function NotFoundPage() {
	usePageTitle("404 — Not Found");

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
			<div
				className="text-[clamp(3.5rem,10vw,6rem)] font-semibold leading-none text-ink"
				style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
			>
				<em className="text-ember-600">404</em>
			</div>
			<p className="font-mono text-sm text-ink-3">This page doesn't exist.</p>
			<Link
				to="/"
				className="mt-2 rounded-full border border-rule bg-card px-4 py-2 font-mono text-xs uppercase tracking-wider text-ink-3 transition-colors hover:border-ember-400/40 hover:bg-ember-50 hover:text-ember-700"
			>
				Back to Dashboard
			</Link>
		</div>
	);
}
