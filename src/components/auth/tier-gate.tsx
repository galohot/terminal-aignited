import type { ReactNode } from "react";
import { loginWithGoogle, type Tier, tierMeets, useAuth } from "../../contexts/auth";

interface Props {
	minTier: Tier;
	featureName: string;
	children: ReactNode;
}

export function TierGate({ minTier, featureName, children }: Props) {
	const { state } = useAuth();

	if (state.status === "loading") {
		return (
			<div className="flex items-center justify-center py-24 font-mono text-sm text-ink-4">
				Loading…
			</div>
		);
	}

	if (state.status === "unauth") {
		return (
			<Paywall
				headline={`Sign in to use ${featureName}`}
				subline="AIgnited Starter — 49,000 IDR/month. Research AI + paper trading."
				ctaLabel="Continue with Google"
				onCta={loginWithGoogle}
			/>
		);
	}

	const tier = state.subscription?.tier;
	if (!tierMeets(tier, minTier)) {
		return (
			<Paywall
				headline={`${featureName} requires ${tierLabel(minTier)}`}
				subline={
					tier
						? `You're on ${tierLabel(tier)}. Upgrade for access.`
						: "You're signed in but have no active subscription."
				}
				ctaLabel={tier ? "Upgrade" : "Subscribe"}
				onCta={() => {
					window.location.href = "/pricing";
				}}
			/>
		);
	}

	return <>{children}</>;
}

function tierLabel(tier: Tier): string {
	return tier === "starter" ? "Starter" : tier === "pro" ? "Pro" : "Institutional";
}

interface PaywallProps {
	headline: string;
	subline: string;
	ctaLabel: string;
	onCta: () => void;
}

function Paywall({ headline, subline, ctaLabel, onCta }: PaywallProps) {
	return (
		<div className="flex min-h-[60vh] items-center justify-center p-8">
			<div className="max-w-md rounded-[18px] border border-rule bg-card p-8 text-center">
				<h2
					className="mb-2 text-[clamp(1.25rem,2.5vw,1.75rem)] leading-tight text-ink"
					style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
				>
					{headline}
				</h2>
				<p className="mb-6 font-mono text-sm text-ink-3">{subline}</p>
				<button
					type="button"
					onClick={onCta}
					className="inline-flex items-center justify-center rounded-full bg-ember-500 px-4 py-2 font-mono text-sm font-medium text-paper transition-colors hover:bg-ember-600"
				>
					{ctaLabel}
				</button>
			</div>
		</div>
	);
}
