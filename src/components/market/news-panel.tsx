import { clsx } from "clsx";
import { ExternalLink, Newspaper } from "lucide-react";
import { useMemo, useState } from "react";
import { useNews, useNewsCategories } from "../../hooks/use-news";
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

	return (
		<div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,22,22,0.96),rgba(9,12,12,0.98))] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
			<div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="min-w-0">
					<div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-t-amber">
						<Newspaper className="h-3.5 w-3.5" />
						Market News
					</div>
					<p className="break-words text-sm leading-6 text-t-text-secondary">
						Curated market-moving stories from the latest news pipeline window.
					</p>
				</div>
				<div className="font-mono text-xs text-t-text-muted">Items {itemCountLabel}</div>
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
								? "border-white/20 bg-white text-black"
								: "border-white/10 bg-white/[0.04] text-t-text-secondary hover:bg-white/10 hover:text-white",
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
						<div key={index} className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
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
				<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-t-amber">
					<Newspaper className="h-3.5 w-3.5" />
					Related News
				</div>
				{Array.from({ length: 3 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
					<div key={i} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
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
			<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-t-amber">
				<Newspaper className="h-3.5 w-3.5" />
				Related News
			</div>
			{items.map((item) => (
				<a
					key={item.id}
					href={`https://thedailycatalyst.site/article/${item.daily_catalyst_slug}`}
					target="_blank"
					rel="noreferrer"
					className="group block rounded-xl border border-white/8 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]"
				>
					<div className="flex items-center gap-2">
						<Chip tone={sentimentTone(item.sentiment)}>{item.sentiment}</Chip>
						<span className="font-mono text-[11px] text-t-text-muted">
							{formatAge(item.published_at)}
						</span>
					</div>
					<h4 className="mt-2 text-sm font-medium leading-5 text-white group-hover:text-t-amber">
						{item.title}
					</h4>
					<p className="mt-1 line-clamp-2 text-xs leading-5 text-t-text-secondary">
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
		<article className="min-w-0 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
			<div className="flex flex-wrap items-center gap-2">
				<Chip>{formatCategory(item.category)}</Chip>
				<Chip tone={sentimentTone(item.sentiment)}>{item.sentiment}</Chip>
				<span className="font-mono text-[11px] text-t-text-muted">
					{formatAge(item.published_at)}
				</span>
			</div>

			<h3 className="mt-3 break-words text-base font-semibold leading-6 text-white">
				{item.title}
			</h3>
			<p className="mt-2 break-words text-sm leading-6 text-t-text-secondary">{item.summary}</p>

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
				<div className="min-w-0 break-words text-xs text-t-text-muted">{item.source_name}</div>
				<a
					href={link}
					target="_blank"
					rel="noreferrer"
					className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-t-text-secondary transition-colors hover:bg-white/10 hover:text-white"
				>
					Read <ExternalLink className="h-3 w-3" />
				</a>
			</div>
		</article>
	);
}

function NewsStateCard({ body, title }: { body: string; title: string }) {
	return (
		<div className="flex min-h-[220px] items-center justify-center rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-center lg:col-span-2">
			<div className="max-w-md">
				<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-t-amber">
					{title}
				</div>
				<p className="mt-3 break-words text-sm leading-6 text-t-text-secondary">{body}</p>
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
			? "border-t-green/30 bg-t-green/10 text-t-green"
			: tone === "red"
				? "border-t-red/30 bg-t-red/10 text-t-red"
				: tone === "yellow"
					? "border-t-amber/30 bg-t-amber/10 text-t-amber"
					: "border-white/10 bg-white/[0.04] text-t-text-secondary";

	return (
		<span
			className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${classes}`}
		>
			{children}
		</span>
	);
}

function Tag({ children }: { children: string }) {
	return (
		<span className="rounded-full border border-white/8 bg-black/15 px-2.5 py-1 font-mono text-[10px] text-t-text-secondary">
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
