import { clsx } from "clsx";
import { ExternalLink, Newspaper } from "lucide-react";
import { useMemo, useState } from "react";
import { useNews, useNewsCategories } from "../../hooks/use-news";
import { safeUrl } from "../../lib/safe-url";
import type { NewsArticle, NewsSentiment } from "../../types/market";
import { Skeleton } from "../ui/loading";

export function NewsPanel() {
	const [category, setCategory] = useState<string>("all");
	const { data, error, isLoading } = useNews({
		category: category === "all" ? undefined : category,
		hours: 48,
		limit: 6,
	});

	const items = data?.news ?? [];

	const catData = useNewsCategories();
	const categories = useMemo(() => {
		const cats = catData.data?.categories ?? [];
		return ["all", ...cats.map((c) => c.name)];
	}, [catData.data]);

	const itemCountLabel = useMemo(() => {
		if (isLoading) return "Loading";
		if (!data) return "0";
		return `${items.length}/${data.total}`;
	}, [data, isLoading, items.length]);

	// Hide entire panel if no news and not loading
	if (!isLoading && items.length === 0) return null;

	return (
		<div className="aig-section">
			<div className="flex flex-col gap-3 border-rule border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="min-w-0">
					<div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-ember-600">
						<Newspaper className="h-3.5 w-3.5" />
						Market News
					</div>
					<p className="break-words text-sm leading-6 text-ink-3">
						Curated market-moving stories from the latest news pipeline window.
					</p>
				</div>
				<div className="font-mono text-xs text-ink-4">Items {itemCountLabel}</div>
			</div>

			<div className="mt-4 flex flex-wrap gap-2">
				{categories.map((cat) => (
					<button
						key={cat}
						type="button"
						onClick={() => setCategory(cat)}
						className={clsx(
							"rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
							category === cat
								? "border-ink bg-ink text-paper"
								: "border-rule bg-card text-ink-3 hover:bg-paper-2 hover:text-ink",
						)}
					>
						{formatCategory(cat)}
					</button>
				))}
			</div>

			<div className="mt-4 grid gap-3 lg:grid-cols-2">
				{isLoading ? (
					Array.from({ length: 4 }).map((_, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
						<div key={index} className="rounded-[18px] border border-rule bg-paper-2 p-4">
							<Skeleton className="mb-3 h-4 w-28 rounded-full" />
							<Skeleton className="mb-3 h-8 w-full rounded-xl" />
							<Skeleton className="mb-2 h-16 w-full rounded-xl" />
							<Skeleton className="h-4 w-32 rounded-full" />
						</div>
					))
				) : error ? (
					<NewsStateCard
						title="News unavailable"
						body="The news feed could not be loaded right now."
					/>
				) : items.length === 0 ? (
					<NewsStateCard
						title="No news yet"
						body="This endpoint is live, but the first curated stories have not been ingested yet."
					/>
				) : (
					items.map((item) => <NewsCard key={item.id} item={item} />)
				)}
			</div>
		</div>
	);
}

export function StockNewsSection({ ticker }: { ticker: string }) {
	const { data, isLoading } = useNews({ ticker, limit: 5 });
	const items = data?.news ?? [];

	if (isLoading) {
		return (
			<div id="news-section" className="space-y-3">
				<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-ember-600">
					<Newspaper className="h-3.5 w-3.5" />
					Related News
				</div>
				{Array.from({ length: 3 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
					<div key={i} className="rounded-xl border border-rule bg-paper-2 p-3">
						<Skeleton className="mb-2 h-4 w-3/4 rounded-full" />
						<Skeleton className="h-3 w-1/2 rounded-full" />
					</div>
				))}
			</div>
		);
	}

	if (items.length === 0) return null;

	return (
		<div id="news-section" className="space-y-3">
			<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-ember-600">
				<Newspaper className="h-3.5 w-3.5" />
				Related News
			</div>
			{items.map((item) => (
				<a
					key={item.id}
					href={safeUrl(`https://thedailycatalyst.site/article/${item.daily_catalyst_slug}`)}
					target="_blank"
					rel="noopener noreferrer"
					className="group block rounded-xl border border-rule bg-card p-3 transition-colors hover:bg-card-2"
				>
					<div className="flex items-center gap-2">
						<Chip tone={sentimentTone(item.sentiment)}>{item.sentiment}</Chip>
						<span className="font-mono text-[11px] text-ink-4">
							{formatAge(item.published_at)}
						</span>
					</div>
					<h4
						className="mt-2 text-[16px] font-semibold leading-5 text-ink group-hover:text-ember-600"
						style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
					>
						{item.title}
					</h4>
					<p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-3">
						{item.summary}
					</p>
				</a>
			))}
		</div>
	);
}

function NewsCard({ item }: { item: NewsArticle }) {
	const link = `https://thedailycatalyst.site/article/${item.daily_catalyst_slug}`;

	return (
		<article className="min-w-0 rounded-[18px] border border-rule bg-card p-4 shadow-[0_1px_2px_rgba(20,23,53,0.04)]">
			<div className="flex flex-wrap items-center gap-2">
				<Chip>{formatCategory(item.category)}</Chip>
				<Chip tone={sentimentTone(item.sentiment)}>{item.sentiment}</Chip>
				<span className="font-mono text-[11px] text-ink-4">
					{formatAge(item.published_at)}
				</span>
			</div>

			<h3
				className="mt-3 break-words text-[20px] font-semibold leading-[1.2] text-ink"
				style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
			>
				{item.title}
			</h3>
			<p className="mt-2 break-words text-sm leading-6 text-ink-3">{item.summary}</p>

			{(item.related_tickers.length > 0 || item.related_sectors.length > 0) && (
				<div className="mt-3 flex flex-wrap gap-2">
					{item.related_tickers.slice(0, 4).map((ticker) => (
						<Tag key={ticker}>{ticker}</Tag>
					))}
					{item.related_sectors.slice(0, 2).map((sector) => (
						<Tag key={sector}>{sector}</Tag>
					))}
				</div>
			)}

			<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
				<div className="min-w-0 break-words text-xs text-ink-4">{item.source_name}</div>
				<a
					href={safeUrl(link)}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-paper-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ember-600 transition-colors hover:bg-card"
				>
					Read <ExternalLink className="h-3 w-3" />
				</a>
			</div>
		</article>
	);
}

function NewsStateCard({ body, title }: { body: string; title: string }) {
	return (
		<div className="flex min-h-[220px] items-center justify-center rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-6 text-center lg:col-span-2">
			<div className="max-w-md">
				<div className="font-mono text-[11px] uppercase tracking-[0.24em] text-ember-600">
					{title}
				</div>
				<p className="mt-3 break-words text-sm leading-6 text-ink-3">{body}</p>
			</div>
		</div>
	);
}

function Chip({
	children,
	tone = "neutral",
}: {
	children: string;
	tone?: "green" | "neutral" | "red" | "yellow";
}) {
	const classes =
		tone === "green"
			? "border-[rgba(23,165,104,0.28)] bg-[rgba(23,165,104,0.1)] text-pos"
			: tone === "red"
				? "border-[rgba(210,52,74,0.28)] bg-[rgba(210,52,74,0.08)] text-neg"
				: tone === "yellow"
					? "border-ember-200 bg-ember-100/60 text-ember-700"
					: "border-rule bg-paper-2 text-ink-3";

	return (
		<span
			className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] ${classes}`}
		>
			{children}
		</span>
	);
}

function Tag({ children }: { children: string }) {
	return (
		<span className="rounded-full border border-rule bg-paper-2 px-2.5 py-1 font-mono text-[10px] text-ink-3">
			{children}
		</span>
	);
}

function formatCategory(category: string) {
	if (category === "all") return "All";
	if (category === "idx") return "IDX";
	return category.charAt(0).toUpperCase() + category.slice(1);
}

function sentimentTone(sentiment: NewsSentiment) {
	if (sentiment === "bullish") return "green" as const;
	if (sentiment === "bearish") return "red" as const;
	if (sentiment === "mixed") return "yellow" as const;
	return "neutral" as const;
}

function formatAge(iso: string) {
	const published = new Date(iso).getTime();
	if (Number.isNaN(published)) return "Unknown time";

	const diffMinutes = Math.max(0, Math.round((Date.now() - published) / 60_000));
	if (diffMinutes < 60) return `${diffMinutes}m ago`;

	const diffHours = Math.round(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours}h ago`;

	const diffDays = Math.round(diffHours / 24);
	return `${diffDays}d ago`;
}
