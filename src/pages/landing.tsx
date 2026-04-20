import { ArrowRight, BarChart3, Brain, LineChart, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { loginWithGoogle } from "../contexts/auth";

export function LandingPage() {
	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
			<section className="relative overflow-hidden rounded-[22px] border border-rule bg-card px-6 py-16 sm:px-12 sm:py-24">
				<div
					aria-hidden
					className="-right-24 -top-24 pointer-events-none absolute h-[320px] w-[320px] rounded-full opacity-60"
					style={{
						background:
							"radial-gradient(closest-side, rgba(255,138,42,0.32), rgba(255,138,42,0) 72%)",
					}}
				/>
				<div
					aria-hidden
					className="-left-40 pointer-events-none absolute bottom-[-120px] h-[320px] w-[320px] rounded-full opacity-50"
					style={{
						background:
							"radial-gradient(closest-side, rgba(29,95,201,0.28), rgba(29,95,201,0) 72%)",
					}}
				/>

				<div className="relative max-w-2xl">
					<div className="mb-5 inline-flex items-center gap-2 rounded-full border border-rule bg-paper-2/70 px-3 py-1 font-mono text-[10px] text-ink-3 uppercase tracking-[0.24em]">
						<span
							className="inline-block h-1.5 w-1.5 rounded-full bg-ember-500"
							style={{ boxShadow: "0 0 8px rgba(232,78,0,0.55)" }}
						/>
						AIgnited Terminal · IDX
					</div>

					<h1
						className="mb-4 text-[clamp(2rem,5vw,3.5rem)] text-ink leading-[1.02]"
						style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
					>
						An{" "}
						<span
							style={{
								background: "var(--aig-grad-ember)",
								WebkitBackgroundClip: "text",
								backgroundClip: "text",
								color: "transparent",
							}}
						>
							AI analyst
						</span>{" "}
						for the Indonesia Stock Exchange.
					</h1>

					<p className="mb-8 max-w-xl text-[15px] text-ink-3 leading-[1.65] sm:text-[16px]">
						Research 957 IDX tickers with a quant-backed scorecard, broker tape
						concentration, peer rankings, and a copilot that reads the same data you do
						— then paper-trade the thesis.
					</p>

					<div className="flex flex-wrap items-center gap-3">
						<button
							type="button"
							onClick={loginWithGoogle}
							className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-mono text-[12px] text-paper tracking-[0.18em] uppercase transition-all hover:-translate-y-[1px] hover:bg-ink-2"
							style={{ boxShadow: "0 6px 24px rgba(20,23,53,0.18)" }}
						>
							Sign in with Google
							<ArrowRight className="h-3.5 w-3.5" />
						</button>
						<Link
							to="/pricing"
							className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-5 py-3 font-mono text-[12px] text-ink-2 tracking-[0.18em] uppercase transition-colors hover:bg-paper-2 hover:text-ink"
						>
							See pricing
						</Link>
					</div>

					<p className="mt-6 font-mono text-[10px] text-ink-4 uppercase tracking-[0.22em]">
						Starter · 49,000 IDR / month · Paper-trade only
					</p>
				</div>
			</section>

			<section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<FeatureCard
					icon={<Brain className="h-5 w-5" />}
					title="Research copilot"
					body="Ask plain-English questions, the agent pulls quotes, flows, financials, patterns, scorecards — and cites its sources."
				/>
				<FeatureCard
					icon={<BarChart3 className="h-5 w-5" />}
					title="Scorecard & peers"
					body="4-axis composite (valuation, momentum, quality, risk) per ticker plus ranked peer tables in its sub-sector."
				/>
				<FeatureCard
					icon={<LineChart className="h-5 w-5" />}
					title="Tape intelligence"
					body="Broker concentration, foreign flow bias, pattern detection — signals that read the order book like a desk trader."
				/>
				<FeatureCard
					icon={<ShieldCheck className="h-5 w-5" />}
					title="Paper trading"
					body="Simulated fills on IDX round lots. Test a thesis with 100M IDR of virtual capital before risking real money."
				/>
			</section>

			<section className="mt-12 rounded-[22px] border border-rule bg-paper-2/60 px-6 py-8 sm:px-10 sm:py-10">
				<div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
					<div className="max-w-lg">
						<div className="mb-2 font-mono text-[10px] text-ember-600 uppercase tracking-[0.28em]">
							Get started
						</div>
						<h2
							className="mb-2 text-[clamp(1.35rem,3vw,1.85rem)] text-ink leading-tight"
							style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
						>
							Your first thesis, in under five minutes.
						</h2>
						<p className="text-[14px] text-ink-3 leading-[1.6]">
							Sign in, pick a ticker, ask the agent — it returns a scorecard, peers, and
							the tape in one pass. Upgrade when you want alerts and higher limits.
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={loginWithGoogle}
							className="inline-flex items-center gap-2 rounded-full bg-ember-500 px-5 py-3 font-mono text-[12px] text-paper tracking-[0.18em] uppercase transition-colors hover:bg-ember-600"
						>
							Continue with Google
							<ArrowRight className="h-3.5 w-3.5" />
						</button>
						<Link
							to="/research"
							className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-5 py-3 font-mono text-[12px] text-ink-2 tracking-[0.18em] uppercase transition-colors hover:bg-paper-2 hover:text-ink"
						>
							Browse research
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}

function FeatureCard({
	icon,
	title,
	body,
}: {
	icon: React.ReactNode;
	title: string;
	body: string;
}) {
	return (
		<div className="rounded-[18px] border border-rule bg-card p-5">
			<div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-paper-2 text-ember-600">
				{icon}
			</div>
			<div className="mb-1.5 font-semibold text-[14px] text-ink">{title}</div>
			<div className="text-[13px] text-ink-3 leading-[1.55]">{body}</div>
		</div>
	);
}
