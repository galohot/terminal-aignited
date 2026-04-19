import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { loginWithGoogle, type Tier, tierMeets, useAuth } from "../contexts/auth";

interface TierCard {
	tier: Tier;
	name: string;
	priceIdr: number;
	blurb: string;
	features: string[];
	cta: string;
	highlight?: boolean;
}

const TIER_CARDS: TierCard[] = [
	{
		tier: "starter",
		name: "Starter",
		priceIdr: 49_000,
		blurb: "Research agent + paper trading. The full loop, for retail.",
		features: [
			"AI research agent (10 tools)",
			"IDX paper trading (100M IDR virtual)",
			"Broker flow, foreign flow, insiders",
			"Disclosures + company fundamentals",
			"Daily agent conversation history",
		],
		cta: "Subscribe",
		highlight: true,
	},
	{
		tier: "pro",
		name: "Pro",
		priceIdr: 149_000,
		blurb: "For active traders. Higher limits, price alerts, early features.",
		features: [
			"Everything in Starter",
			"Unlimited agent research calls",
			"Price + volume alerts",
			"Higher API rate limits",
			"Advanced screener filters",
			"Export positions/fills to CSV",
		],
		cta: "Subscribe",
	},
	{
		tier: "institutional",
		name: "Institutional",
		priceIdr: 499_000,
		blurb: "Teams, newsletters, or multi-portfolio use.",
		features: [
			"Everything in Pro",
			"Up to 5 seats",
			"Private share links",
			"Webhook + email alerts",
			"Priority support",
		],
		cta: "Contact sales",
	},
];

function formatIdr(n: number): string {
	return n.toLocaleString("id-ID");
}

export function PricingPage() {
	const { state, refresh } = useAuth();
	const [params, setParams] = useSearchParams();
	const [checkoutError, setCheckoutError] = useState<string | null>(null);
	const [pending, setPending] = useState<Tier | null>(null);

	const paid = params.get("paid");

	// biome-ignore lint/correctness/useExhaustiveDependencies: refresh ref is stable
	useEffect(() => {
		if (!paid) return;
		let tries = 0;
		const id = setInterval(() => {
			tries++;
			refresh();
			if (tries > 10) clearInterval(id);
		}, 2000);
		return () => clearInterval(id);
	}, [paid]);

	async function subscribe(tier: Tier) {
		setCheckoutError(null);

		if (tier === "institutional") {
			window.location.href =
				"mailto:aignite.tech@gmail.com?subject=AIgnited Terminal Institutional";
			return;
		}

		if (state.status !== "auth") {
			loginWithGoogle();
			return;
		}

		setPending(tier);
		try {
			const res = await fetch("/api/billing/checkout", {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tier }),
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error((body as { message?: string }).message || `HTTP ${res.status}`);
			}
			const data = (await res.json()) as { link: string };
			window.location.href = data.link;
		} catch (e) {
			setCheckoutError(e instanceof Error ? e.message : String(e));
			setPending(null);
		}
	}

	const currentTier = state.status === "auth" ? (state.subscription?.tier ?? null) : null;
	const currentExpires = state.status === "auth" ? (state.subscription?.expires_at ?? null) : null;

	return (
		<div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:py-8">
			<div className="text-center">
				<div className="mb-2 flex items-center justify-center gap-3">
					<span className="h-px w-16 bg-ember-400/40" />
					<span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ember-600">
						Pricing
					</span>
					<span className="h-px w-16 bg-ember-400/40" />
				</div>
				<h1
					className="text-[clamp(2rem,4vw,2.75rem)] leading-[1.05] text-ink"
					style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
				>
					Pick your <em className="text-ember-600">tier</em>
				</h1>
				<p className="mt-3 font-mono text-sm text-ink-3">
					All plans include free access to market data, screeners, and ownership intel.
				</p>
			</div>

			{paid && (
				<div className="rounded-[18px] border border-pos/30 bg-pos/10 p-4 text-center font-mono text-sm text-pos">
					Payment received. Your subscription should activate within a few seconds.{" "}
					<button
						type="button"
						onClick={() => {
							setParams({});
							refresh();
						}}
						className="underline"
					>
						Refresh now
					</button>
				</div>
			)}

			{checkoutError && (
				<div className="rounded-[18px] border border-neg/30 bg-neg/10 p-4 text-center font-mono text-sm text-neg">
					Checkout failed: {checkoutError}
				</div>
			)}

			<div className="grid gap-4 md:grid-cols-3">
				{TIER_CARDS.map((t) => {
					const isCurrent = currentTier === t.tier;
					const isDowngrade =
						currentTier &&
						t.tier !== "institutional" &&
						tierMeets(currentTier, t.tier) &&
						!isCurrent;
					return (
						<div
							key={t.tier}
							className={`relative flex flex-col rounded-[18px] border p-5 transition-colors ${
								t.highlight
									? "border-ember-400/50 bg-ember-50"
									: "border-rule bg-card hover:border-ember-400/30"
							}`}
						>
							{t.highlight && (
								<div className="absolute -top-2 right-4 rounded-full bg-ember-500 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-paper">
									Most popular
								</div>
							)}
							<h3
								className="text-xl text-ink"
								style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
							>
								{t.name}
							</h3>
							<div className="mt-2 flex items-baseline gap-1">
								<span className="font-mono text-3xl font-semibold tracking-tight text-ink">
									Rp {formatIdr(t.priceIdr)}
								</span>
								<span className="font-mono text-xs text-ink-4">/ month</span>
							</div>
							<p className="mt-2 font-mono text-sm text-ink-3">{t.blurb}</p>

							<ul className="mt-4 flex-1 space-y-2">
								{t.features.map((f) => (
									<li key={f} className="flex items-start gap-2 font-mono text-sm text-ink-2">
										<Check
											className={`mt-0.5 h-4 w-4 shrink-0 ${
												t.highlight ? "text-ember-600" : "text-pos"
											}`}
										/>
										<span>{f}</span>
									</li>
								))}
							</ul>

							<div className="mt-5 space-y-2">
								{isCurrent ? (
									<div className="rounded-full border border-pos/30 bg-pos/10 px-3 py-2 text-center font-mono text-xs text-pos">
										Active{currentExpires ? ` · renews ${formatDate(currentExpires)}` : ""}
									</div>
								) : (
									<button
										type="button"
										onClick={() => subscribe(t.tier)}
										disabled={pending === t.tier || !!isDowngrade}
										className={`w-full rounded-full px-4 py-2 font-mono text-sm font-medium transition-colors disabled:opacity-40 ${
											t.highlight
												? "bg-ember-500 text-paper hover:bg-ember-600"
												: "border border-rule bg-card text-ink hover:bg-paper-2"
										}`}
									>
										{pending === t.tier
											? "Redirecting…"
											: isDowngrade
												? "Downgrade unavailable"
												: state.status !== "auth"
													? "Sign in to subscribe"
													: t.cta}
									</button>
								)}
							</div>
						</div>
					);
				})}
			</div>

			<p className="text-center font-mono text-xs text-ink-4">
				Payments via Mayar · IDR only · Cancel anytime (subscription expires at end of billing
				period).
			</p>
		</div>
	);
}

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString("en-GB", {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	} catch {
		return iso.slice(0, 10);
	}
}
