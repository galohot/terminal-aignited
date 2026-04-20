import type { ReactNode } from "react";
import { loginWithGoogle, useAuth } from "../../contexts/auth";

interface Props {
	featureName?: string;
	children: ReactNode;
}

export function RequireAuth({ featureName, children }: Props) {
	const { state } = useAuth();

	if (state.status === "loading") {
		return (
			<div className="flex items-center justify-center py-24 font-mono text-sm text-ink-4">
				Loading…
			</div>
		);
	}

	if (state.status === "unauth") {
		return <SignInWall featureName={featureName ?? "this page"} />;
	}

	return <>{children}</>;
}

function SignInWall({ featureName }: { featureName: string }) {
	return (
		<div className="flex min-h-[60vh] items-center justify-center p-8">
			<div className="max-w-md rounded-[18px] border border-rule bg-card p-8 text-center">
				<div className="mb-3 font-mono text-[10px] text-ember-600 uppercase tracking-[0.24em]">
					Sign in required
				</div>
				<h2
					className="mb-2 text-[clamp(1.25rem,2.5vw,1.75rem)] leading-tight text-ink"
					style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
				>
					Sign in to use {featureName}
				</h2>
				<p className="mb-6 font-mono text-sm text-ink-3">
					Free with any AIgnited account — Starter from 49,000 IDR / month unlocks the full
					research agent and paper trading.
				</p>
				<button
					type="button"
					onClick={loginWithGoogle}
					className="inline-flex items-center justify-center rounded-full bg-ember-500 px-4 py-2 font-mono text-sm font-medium text-paper transition-colors hover:bg-ember-600"
				>
					Continue with Google
				</button>
			</div>
		</div>
	);
}
