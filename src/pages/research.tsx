import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { BookOpen, Briefcase, Building2, Calendar, Globe2, Lock, Newspaper, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { research, type ResearchArticle, type ResearchType } from "../lib/api";

const TYPE_META: Record<ResearchType, { label: string; icon: typeof BookOpen; accent: string }> = {
	am_brief: { label: "AM Brief", icon: Newspaper, accent: "text-ember-600" },
	deep_dive: { label: "Deep Dive", icon: BookOpen, accent: "text-ink" },
	sector: { label: "Sector", icon: Building2, accent: "text-pos" },
	earnings_preview: { label: "Earnings Preview", icon: Calendar, accent: "text-spark" },
	earnings_recap: { label: "Earnings Recap", icon: TrendingUp, accent: "text-spark" },
	power_map: { label: "Power Map", icon: Briefcase, accent: "text-ember-600" },
	macro: { label: "Macro", icon: Globe2, accent: "text-ink" },
};

const FILTERS: Array<{ key: ResearchType | "all"; label: string }> = [
	{ key: "all", label: "All" },
	{ key: "am_brief", label: "AM Brief" },
	{ key: "deep_dive", label: "Deep Dive" },
	{ key: "sector", label: "Sector" },
	{ key: "earnings_preview", label: "Earnings" },
	{ key: "macro", label: "Macro" },
	{ key: "power_map", label: "Power Map" },
];

export function ResearchPage() {
	const [filter, setFilter] = useState<ResearchType | "all">("all");

	const listQ = useQuery({
		queryKey: ["research", "list", filter],
		queryFn: () => research.list(filter === "all" ? undefined : { type: filter }),
		staleTime: 60_000,
	});

	const items = listQ.data?.items ?? [];
	const featured = items.find((a) => a.type === "am_brief") ?? items[0];
	const rest = featured ? items.filter((a) => a.id !== featured.id) : items;

	return (
		<div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
			<header className="mb-6 border-b border-rule pb-5">
				<div className="flex items-center gap-2 font-mono text-[11px] text-ember-600 uppercase tracking-[0.28em]">
					<Newspaper className="h-3.5 w-3.5" /> Exclusive Research
				</div>
				<h1
					className="mt-2 font-extrabold text-[30px] text-ink leading-tight tracking-[-0.015em] sm:text-[38px]"
					style={{ fontFamily: "var(--font-display)" }}
				>
					The AIgnited Research Desk
				</h1>
				<p className="mt-1 max-w-2xl text-[14px] text-ink-3">
					Daily AM briefs, company deep-dives, sector monthlies, and earnings coverage — generated
					from our own IDX data, reviewed by our team.
				</p>
			</header>

			<nav className="mb-6 flex gap-2 overflow-x-auto pb-2">
				{FILTERS.map((f) => {
					const active = filter === f.key;
					return (
						<button
							key={f.key}
							type="button"
							onClick={() => setFilter(f.key)}
							className={clsx(
								"shrink-0 rounded-full border px-3.5 py-1.5 font-mono text-[11px] tracking-[0.18em] uppercase transition-colors",
								active
									? "border-ink bg-ink text-paper"
									: "border-rule bg-paper-2 text-ink-3 hover:bg-card hover:text-ink",
							)}
						>
							{f.label}
						</button>
					);
				})}
			</nav>

			{listQ.isLoading && (
				<div className="py-24 text-center font-mono text-sm text-ink-4">Loading research…</div>
			)}

			{listQ.isError && (
				<div className="rounded-xl border border-rule bg-paper-2 p-6 text-center font-mono text-sm text-neg">
					Failed to load research. Please refresh.
				</div>
			)}

			{!listQ.isLoading && items.length === 0 && (
				<div className="rounded-xl border border-rule bg-card p-10 text-center">
					<p className="font-mono text-[12px] text-ink-4 tracking-[0.18em] uppercase">
						No research published yet
					</p>
					<p className="mt-2 text-[13px] text-ink-3">
						Our first AM brief drops tomorrow at 06:30 WIB.
					</p>
				</div>
			)}

			{featured && <FeaturedCard article={featured} />}

			{rest.length > 0 && (
				<section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{rest.map((a) => (
						<ArticleCard key={a.id} article={a} />
					))}
				</section>
			)}
		</div>
	);
}

function FeaturedCard({ article }: { article: ResearchArticle }) {
	const meta = TYPE_META[article.type];
	const Icon = meta.icon;

	return (
		<Link
			to={`/research/${article.slug}`}
			className="block overflow-hidden rounded-[20px] border border-rule bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(20,23,53,0.08)] sm:p-8"
		>
			<div className="flex items-center gap-2">
				<span
					className={clsx(
						"inline-flex items-center gap-1.5 rounded-full border border-rule bg-paper-2 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em]",
						meta.accent,
					)}
				>
					<Icon className="h-3 w-3" />
					{meta.label}
				</span>
				<span className="font-mono text-[10px] text-ink-4 uppercase tracking-[0.18em]">
					{formatDate(article.published_at)}
				</span>
			</div>
			<h2
				className="mt-4 font-extrabold text-[26px] text-ink leading-tight tracking-[-0.01em] sm:text-[32px]"
				style={{ fontFamily: "var(--font-display)" }}
			>
				{article.title}
			</h2>
			<p className="mt-3 text-[15px] text-ink-2 leading-relaxed">{article.summary}</p>
			{article.tickers.length > 0 && (
				<div className="mt-4 flex flex-wrap gap-1.5">
					{article.tickers.slice(0, 8).map((t) => (
						<span
							key={t}
							className="rounded-md bg-paper-2 px-2 py-0.5 font-mono text-[10px] text-ink-3 tracking-[0.08em]"
						>
							{t}
						</span>
					))}
				</div>
			)}
		</Link>
	);
}

function ArticleCard({ article }: { article: ResearchArticle }) {
	const meta = TYPE_META[article.type];
	const Icon = meta.icon;

	return (
		<Link
			to={`/research/${article.slug}`}
			className="group flex flex-col rounded-[16px] border border-rule bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(20,23,53,0.06)]"
		>
			<div className="flex items-center justify-between">
				<span
					className={clsx(
						"inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em]",
						meta.accent,
					)}
				>
					<Icon className="h-3 w-3" />
					{meta.label}
				</span>
				<Lock className="h-3 w-3 text-ink-4" aria-label="Pro" />
			</div>
			<h3 className="mt-3 font-bold text-[16px] text-ink leading-snug tracking-[-0.005em] group-hover:text-ink-2">
				{article.title}
			</h3>
			<p className="mt-2 line-clamp-3 text-[13px] text-ink-3 leading-relaxed">
				{article.summary}
			</p>
			<div className="mt-4 flex items-center justify-between border-t border-rule pt-3">
				<span className="font-mono text-[10px] text-ink-4 uppercase tracking-[0.18em]">
					{formatDate(article.published_at)}
				</span>
				{article.tickers.length > 0 && (
					<span className="font-mono text-[10px] text-ink-3 tracking-[0.08em]">
						{article.tickers.slice(0, 3).join(" · ")}
					</span>
				)}
			</div>
		</Link>
	);
}

function formatDate(iso: string | null): string {
	if (!iso) return "—";
	const d = new Date(iso);
	return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
