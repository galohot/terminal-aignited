import {
	Activity,
	ArrowRight,
	CandlestickChart,
	ChartColumnIncreasing,
	Clock3,
	Globe2,
	Landmark,
	RefreshCw,
	ShieldCheck,
	TrendingUp,
	TriangleAlert,
} from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { Link } from "react-router";
import { useMarkets } from "../../hooks/use-markets";
import { useRealtimeSubscription } from "../../hooks/use-realtime";
import { formatPercent, formatPrice, formatTime, formatVolume } from "../../lib/format";
import type { ConnectionStatus } from "../../stores/realtime-store";
import { useRealtimeStore } from "../../stores/realtime-store";
import type { Quote } from "../../types/market";
import { IdxIndicesGrid } from "../idx/indices-grid";
import { MarketGridSkeleton } from "../ui/loading";
import { ApacSessionBar } from "./apac-session-bar";
import { NewsPanel } from "./news-panel";

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

type BadgeTone = "amber" | "green" | "neutral" | "red";
type InsightTone = "neutral" | "positive" | "warning";
type QuoteTone = "apac" | "global" | "local" | "macro";

interface SpotlightItem {
	kicker: string;
	note: string;
	quote: Quote;
	tone: QuoteTone;
}

interface FreshnessState {
	ageMinutes: number | null;
	detail: string;
	label: string;
	stale: boolean;
	tone: BadgeTone;
}

interface BreadthSummary {
	advancers: number;
	avgMove: number;
	decliners: number;
	label: string;
	leader: Quote | null;
	quotes: Quote[];
	unchanged: number;
}

interface CoverageCardData {
	label: string;
	note: string;
	value: string;
}

interface InsightItem {
	body: string;
	title: string;
	tone: InsightTone;
}

export function MarketGrid() {
	const { data, isLoading, error, refetch } = useMarkets();

	const allSymbols = useMemo(() => {
		if (!data) return [];
		const symbols = [
			...data.indices.indonesia,
			...data.indices.asia_pacific,
			...data.indices.us,
			...data.indices.europe,
			...data.commodities,
			...data.forex,
			...data.crypto,
		].map((quote) => quote.symbol);
		return [...new Set(symbols)];
	}, [data]);

	useRealtimeSubscription(allSymbols);

	const realtimePrices = useRealtimeStore((state) => state.prices);
	const connectionStatus = useRealtimeStore((state) => state.status);

	if (isLoading) return <MarketGridSkeleton />;

	if (error) {
		const is503 = error.message.includes("503");
		return (
			<div className="flex min-h-full flex-col items-center justify-center gap-3 p-12 text-center">
				<p className="font-mono text-sm text-t-text-secondary">
					{is503
						? "Market data is warming up. Try again in a moment."
						: "Markets are unavailable right now."}
				</p>
				{!is503 && (
					<button
						type="button"
						onClick={() => refetch()}
						className="rounded-xl border border-t-border bg-t-surface px-3 py-1.5 font-mono text-xs text-t-text-secondary transition-colors hover:bg-t-hover"
					>
						Retry
					</button>
				)}
			</div>
		);
	}

	if (!data) return null;

	const withRealtime = (quotes: Quote[]): Quote[] =>
		quotes.map((quote) => {
			const realtime = realtimePrices[quote.symbol];
			if (!realtime) return quote;
			return {
				...quote,
				price: realtime.price,
				change: realtime.change,
				change_percent: realtime.changePercent,
				volume: realtime.volume || quote.volume,
			};
		});

	const indonesiaBoard = withRealtime(data.indices.indonesia);
	const apacBoard = withRealtime(data.indices.asia_pacific);
	const usBoard = withRealtime(data.indices.us);
	const europeBoard = withRealtime(data.indices.europe);
	const westernBoard = [...usBoard, ...europeBoard];
	const commoditiesBoard = withRealtime(data.commodities);
	const forexBoard = withRealtime(data.forex);
	const cryptoBoard = withRealtime(data.crypto);

	const jakarta = formatJakartaNow();
	const session = getJakartaSession();
	const freshness = getFeedFreshness(data.updated_at);
	const heroNarrative = buildHeroNarrative({
		apacBoard,
		commoditiesBoard,
		forexBoard,
		freshness,
		indonesiaBoard,
		session,
		usBoard,
	});
	const heroMetrics = buildHeroMetrics({
		apacBoard,
		cryptoBoard,
		forexBoard,
		indonesiaBoard,
		session,
	});
	const heroSpotlights = buildHeroSpotlights({
		apacBoard,
		commoditiesBoard,
		forexBoard,
		indonesiaBoard,
		usBoard,
	});
	const deskInsights = buildDeskInsights({
		apacBoard,
		commoditiesBoard,
		forexBoard,
		freshness,
		indonesiaBoard,
		session,
		usBoard,
	});
	const macroCards = buildMacroCards({
		commoditiesBoard,
		cryptoBoard,
		forexBoard,
		usBoard,
	});
	const breadthCards = [
		buildBreadthSummary("Indonesia", indonesiaBoard),
		buildBreadthSummary("APAC", apacBoard),
		buildBreadthSummary("US / Europe", westernBoard),
		buildBreadthSummary("Crypto", cryptoBoard),
	];
	const coverageCards = buildCoverageCards({
		apacBoard,
		commoditiesBoard,
		connectionStatus,
		cryptoBoard,
		forexBoard,
		freshness,
		indonesiaBoard,
		westernBoard,
	});

	return (
		<div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(255,191,71,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(61,220,145,0.11),transparent_28%),linear-gradient(180deg,rgba(5,10,10,0.35),rgba(5,9,9,0))]">
			<div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 pb-6">
				<section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
					<div className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(10,24,20,0.98),rgba(7,11,11,0.96))] shadow-[0_24px_90px_rgba(0,0,0,0.35)]">
						<div className="flex flex-col gap-5 p-5 sm:p-6">
							<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
								<div className="min-w-0 max-w-3xl">
									<div className="mb-3 flex flex-wrap items-center gap-2">
										<Badge tone="amber">Jakarta First</Badge>
										<Badge tone={session.tone}>{session.label}</Badge>
										<Badge tone={freshness.tone}>{freshness.label}</Badge>
										<Badge tone="neutral">Updated {formatTime(data.updated_at)} UTC</Badge>
									</div>
									<h2 className="max-w-3xl break-words text-3xl font-semibold tracking-tight text-white sm:text-[2.65rem]">
										{heroNarrative.headline}
									</h2>
									<p className="mt-3 max-w-3xl break-words text-sm leading-6 text-t-text-secondary sm:text-[15px]">
										{heroNarrative.summary}
									</p>
								</div>
								<div className="grid max-w-full min-w-0 gap-2 rounded-[24px] border border-white/10 bg-black/20 p-3 text-sm text-t-text-secondary">
									<SignalLine label="Jakarta" value={`${jakarta.time} WIB`} />
									<SignalLine label="Date" value={jakarta.date} />
									<SignalLine label="Feed" value={freshness.detail} />
								</div>
							</div>

							{freshness.stale && (
								<div className="rounded-[24px] border border-t-amber/25 bg-t-amber/10 p-4">
									<div className="flex items-start gap-3">
										<TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-t-amber" />
										<div>
											<div className="font-mono text-[11px] uppercase tracking-[0.24em] text-t-amber">
												Feed notice
											</div>
											<p className="mt-1 text-sm leading-6 text-t-text-secondary">
												Quotes are delayed. Check feed freshness before using this overview as a
												live board.
											</p>
										</div>
									</div>
								</div>
							)}

							<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
								{heroMetrics.map((metric) => (
									<HeroMetric
										key={metric.label}
										icon={metric.icon}
										label={metric.label}
										secondary={metric.secondary}
										value={metric.value}
									/>
								))}
							</div>

							<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
								{heroSpotlights.map((item) => (
									<FocusCard
										key={`${item.kicker}-${item.quote.symbol}`}
										kicker={item.kicker}
										note={item.note}
										quote={item.quote}
										tone={item.tone}
									/>
								))}
							</div>

							<div className="flex flex-wrap items-center gap-3">
								<Link
									to="/watchlist"
									className="inline-flex items-center gap-2 rounded-full border border-t-border bg-white px-4 py-2 font-mono text-xs font-medium text-black transition-transform hover:-translate-y-0.5"
								>
									Open Watchlist <ArrowRight className="h-3.5 w-3.5" />
								</Link>
								<Link
									to="/charts"
									className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-t-text-secondary transition-colors hover:bg-white/10 hover:text-white"
								>
									Open Charts <CandlestickChart className="h-3.5 w-3.5" />
								</Link>
							</div>
						</div>
					</div>

					<div className="grid gap-4">
						<SectionPanel
							icon={<ShieldCheck className="h-4 w-4" />}
							title="Market State"
							description="Session, freshness, coverage, and connection status."
						>
							<div className="grid gap-2 md:grid-cols-2">
								<SignalTile label="Session" value={session.detail} note={session.subtext} />
								<SignalTile label="Freshness" value={freshness.label} note={freshness.detail} />
								<SignalTile
									label="Tracked Board"
									value={`${countQuotes([
										...indonesiaBoard,
										...apacBoard,
										...westernBoard,
										...commoditiesBoard,
										...forexBoard,
										...cryptoBoard,
									])} instruments`}
									note="Overview cards show coverage currently available from the shared markets payload"
								/>
								<SignalTile
									label="Realtime Overlay"
									value={formatConnectionStatus(connectionStatus)}
									note="Homepage prices update in place when the websocket is connected"
								/>
							</div>
						</SectionPanel>

						<SectionPanel
							icon={<Activity className="h-4 w-4" />}
							title="Desk Read"
							description="Key moves across local, regional, and cross-asset boards."
						>
							<div className="space-y-2">
								{deskInsights.map((item) => (
									<InsightCard
										key={item.title}
										body={item.body}
										title={item.title}
										tone={item.tone}
									/>
								))}
							</div>
						</SectionPanel>
					</div>
				</section>

				<section>
					<NewsPanel />
				</section>

				<section>
					<SectionPanel
						icon={<Landmark className="h-4 w-4" />}
						title="IDX Indices"
						description="All IDX indices with daily performance. Color intensity reflects magnitude of change."
					>
						<IdxIndicesGrid />
					</SectionPanel>
				</section>

				<section>
					<SectionPanel
						icon={<Globe2 className="h-4 w-4" />}
						title="APAC Sessions"
						description="Regional market session status and sentiment overview."
					>
						<ApacSessionBar apacQuotes={apacBoard} />
					</SectionPanel>
				</section>

				<section className="grid gap-4 xl:grid-cols-[1.05fr_1fr_0.9fr_0.9fr]">
					<SectionPanel
						icon={<Landmark className="h-4 w-4" />}
						title="Indonesia"
						description="Local benchmarks."
					>
						<QuoteList quotes={indonesiaBoard} maxItems={8} tone="local" />
					</SectionPanel>
					<SectionPanel
						icon={<Globe2 className="h-4 w-4" />}
						title="APAC Pulse"
						description="Regional indices."
					>
						<QuoteList quotes={sortByMagnitude(apacBoard)} maxItems={6} tone="apac" />
					</SectionPanel>
					<SectionPanel
						icon={<CandlestickChart className="h-4 w-4" />}
						title="Commodity Drivers"
						description="Commodities."
					>
						<QuoteList quotes={sortByMagnitude(commoditiesBoard)} maxItems={6} tone="macro" />
					</SectionPanel>
					<SectionPanel
						icon={<TrendingUp className="h-4 w-4" />}
						title="Currency Watch"
						description="Foreign exchange."
					>
						<QuoteList quotes={sortByMagnitude(forexBoard)} maxItems={6} tone="macro" />
					</SectionPanel>
				</section>

				<section className="grid gap-4 xl:grid-cols-[1fr_1fr_0.92fr]">
					<SectionPanel
						icon={<ChartColumnIncreasing className="h-4 w-4" />}
						title="Breadth Snapshot"
						description="Advancers, decliners, and average move."
					>
						<div className="grid gap-2">
							{breadthCards.map((card) => (
								<BreadthCard key={card.label} summary={card} />
							))}
						</div>
					</SectionPanel>

					<SectionPanel
						icon={<RefreshCw className="h-4 w-4" />}
						title="Cross-Asset Board"
						description="FX, commodities, volatility, and crypto."
					>
						<div className="grid gap-2">
							{macroCards.map((card) => (
								<div
									key={card.label}
									className="rounded-2xl border border-white/6 bg-white/[0.04] p-3"
								>
									<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-t-text-muted">
										{card.label}
									</div>
									<div className="mt-1 text-lg font-semibold text-white">{card.value}</div>
									<div className="mt-1 text-xs leading-5 text-t-text-secondary">{card.note}</div>
								</div>
							))}
						</div>
					</SectionPanel>

					<SectionPanel
						icon={<Clock3 className="h-4 w-4" />}
						title="Coverage & Feed Health"
						description="Coverage, freshness, and realtime status."
					>
						<div className="grid gap-2">
							{coverageCards.map((card) => (
								<CoverageCard key={card.label} {...card} />
							))}
						</div>
					</SectionPanel>
				</section>

				<section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
					<SectionPanel
						icon={<Globe2 className="h-4 w-4" />}
						title="US / Europe Handoff"
						description="US and Europe."
					>
						<QuoteList quotes={sortByMagnitude(westernBoard)} maxItems={8} tone="global" />
					</SectionPanel>
					<SectionPanel
						icon={<CandlestickChart className="h-4 w-4" />}
						title="Crypto Risk Board"
						description="Crypto."
					>
						<QuoteList quotes={sortByMagnitude(cryptoBoard)} maxItems={8} tone="macro" />
					</SectionPanel>
				</section>
			</div>
		</div>
	);
}

function SectionPanel({
	children,
	description,
	icon,
	title,
}: {
	children: ReactNode;
	description: string;
	icon: ReactNode;
	title: string;
}) {
	return (
		<div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,23,22,0.96),rgba(9,13,13,0.98))] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
			<div className="mb-4 flex items-start justify-between gap-4">
				<div className="min-w-0">
					<div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-t-amber">
						<span className="text-t-green">{icon}</span>
						{title}
					</div>
					<p className="max-w-2xl break-words text-sm leading-6 text-t-text-secondary">
						{description}
					</p>
				</div>
			</div>
			{children}
		</div>
	);
}

function QuoteList({
	maxItems,
	quotes,
	tone,
}: {
	maxItems: number;
	quotes: Quote[];
	tone: QuoteTone;
}) {
	if (!quotes.length) {
		return (
			<div className="rounded-2xl border border-dashed border-t-border p-4 text-sm text-t-text-muted">
				Awaiting market feed.
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{quotes.slice(0, maxItems).map((quote) => (
				<QuoteRow key={quote.symbol} quote={quote} tone={tone} />
			))}
		</div>
	);
}

function QuoteRow({ quote, tone }: { quote: Quote; tone: QuoteTone }) {
	const changePercent = getChangePercent(quote);
	const isPositive = changePercent >= 0;
	const changeColor = isPositive ? "text-t-green" : "text-t-red";
	const accentTone =
		tone === "local"
			? "from-t-amber/20 to-transparent"
			: tone === "apac"
				? "from-cyan-400/20 to-transparent"
				: tone === "macro"
					? "from-t-green/20 to-transparent"
					: "from-t-blue/20 to-transparent";

	return (
		<Link
			to={`/stock/${quote.symbol}`}
			className="group grid grid-cols-[minmax(0,1fr)_auto] gap-4 overflow-hidden rounded-2xl border border-white/6 bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-3 transition-transform hover:-translate-y-0.5 hover:border-white/12"
		>
			<div className={`min-w-0 rounded-xl bg-gradient-to-r ${accentTone} p-2`}>
				<div className="flex min-w-0 items-center gap-2">
					<span className="font-mono text-sm font-semibold tracking-wide text-white">
						{quote.symbol}
					</span>
					<span className="truncate text-sm text-t-text-secondary">{quote.name}</span>
				</div>
				<div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-t-text-muted">
					{quote.exchange && <span>{quote.exchange}</span>}
					{quote.volume != null && quote.volume > 0 && (
						<span>Vol {formatVolume(quote.volume)}</span>
					)}
					{quote.currency && <span>{quote.currency}</span>}
				</div>
			</div>
			<div className="flex min-w-[96px] max-w-[120px] flex-col items-end justify-center font-mono">
				<div className="break-words text-right text-sm text-white">
					{formatPrice(quote.price, quote.currency)}
				</div>
				<div className={`break-words text-right text-sm ${changeColor}`}>
					{formatPercent(changePercent)}
				</div>
			</div>
		</Link>
	);
}

function FocusCard({
	kicker,
	note,
	quote,
	tone,
}: {
	kicker: string;
	note: string;
	quote: Quote;
	tone: QuoteTone;
}) {
	const changePercent = getChangePercent(quote);
	const isPositive = changePercent >= 0;
	const accent =
		tone === "local"
			? "border-t-amber/25 bg-t-amber/10"
			: tone === "apac"
				? "border-cyan-400/20 bg-cyan-400/10"
				: tone === "global"
					? "border-t-blue/25 bg-t-blue/10"
					: isPositive
						? "border-t-green/25 bg-t-green/10"
						: "border-t-red/25 bg-t-red/10";

	return (
		<Link
			to={`/stock/${quote.symbol}`}
			className={`min-w-0 rounded-[24px] border ${accent} p-4 transition-transform hover:-translate-y-0.5`}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="font-mono text-[11px] uppercase tracking-[0.24em] text-t-text-muted">
						{kicker}
					</div>
					<div className="mt-2 break-words font-mono text-xl font-semibold text-white">
						{quote.symbol}
					</div>
					<div className="mt-1 break-words text-sm text-t-text-secondary">{quote.name}</div>
				</div>
				<div className="rounded-full border border-white/10 bg-black/20 px-2 py-1 font-mono text-[11px] text-t-text-secondary">
					{formatPercent(changePercent)}
				</div>
			</div>
			<div className="mt-5 flex items-end justify-between gap-4">
				<div className="break-words font-mono text-2xl font-semibold text-white">
					{formatPrice(quote.price, quote.currency)}
				</div>
			</div>
			<div className="mt-3 break-words text-xs leading-5 text-t-text-secondary">{note}</div>
		</Link>
	);
}

function HeroMetric({
	icon,
	label,
	secondary,
	value,
}: {
	icon: ReactNode;
	label: string;
	secondary: string;
	value: string;
}) {
	return (
		<div className="min-w-0 rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
			<div className="mb-3 flex min-w-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-t-text-muted">
				<span className="text-t-amber">{icon}</span>
				{label}
			</div>
			<div className="break-words text-sm font-medium leading-6 text-white">{value}</div>
			<div className="mt-2 break-words text-sm leading-6 text-t-text-secondary">{secondary}</div>
		</div>
	);
}

function SignalTile({ label, note, value }: { label: string; note: string; value: string }) {
	return (
		<div className="min-w-0 rounded-2xl border border-white/6 bg-white/[0.04] p-3">
			<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-t-text-muted">
				{label}
			</div>
			<div className="mt-1 break-words text-sm font-semibold text-white">{value}</div>
			<div className="mt-1 break-words text-xs leading-5 text-t-text-secondary">{note}</div>
		</div>
	);
}

function SignalLine({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col items-start gap-1 font-mono text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-6">
			<span className="uppercase tracking-[0.22em] text-t-text-muted">{label}</span>
			<span className="break-words text-white sm:text-right">{value}</span>
		</div>
	);
}

function Badge({ children, tone }: { children: ReactNode; tone: BadgeTone }) {
	const classes =
		tone === "amber"
			? "border-t-amber/30 bg-t-amber/10 text-t-amber"
			: tone === "green"
				? "border-t-green/30 bg-t-green/10 text-t-green"
				: tone === "red"
					? "border-t-red/30 bg-t-red/10 text-t-red"
					: "border-white/10 bg-white/[0.05] text-t-text-secondary";

	return (
		<span
			className={`max-w-full break-words rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.22em] ${classes}`}
		>
			{children}
		</span>
	);
}

function BreadthCard({ summary }: { summary: BreadthSummary }) {
	const balance =
		summary.advancers === summary.decliners
			? "Balanced"
			: summary.advancers > summary.decliners
				? "Positive breadth"
				: "Negative breadth";
	const balanceTone =
		summary.advancers === summary.decliners
			? "text-t-text-secondary"
			: summary.advancers > summary.decliners
				? "text-t-green"
				: "text-t-red";

	return (
		<div className="min-w-0 rounded-2xl border border-white/6 bg-white/[0.04] p-3">
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-t-text-muted">
						{summary.label}
					</div>
					<div className={`mt-1 break-words text-sm font-semibold ${balanceTone}`}>{balance}</div>
				</div>
				<div className="font-mono text-xs text-t-text-secondary">
					{summary.quotes.length} instrument{summary.quotes.length === 1 ? "" : "s"}
				</div>
			</div>
			<div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono text-xs">
				<MiniStat label="Up" value={summary.advancers.toString()} valueClass="text-t-green" />
				<MiniStat label="Down" value={summary.decliners.toString()} valueClass="text-t-red" />
				<MiniStat label="Flat" value={summary.unchanged.toString()} />
			</div>
			<div className="mt-3 break-words text-xs text-t-text-secondary">
				Average move {formatPercent(summary.avgMove)}.
				{summary.leader
					? ` Lead: ${summary.leader.symbol} ${formatPercent(getChangePercent(summary.leader))}.`
					: " Lead: awaiting quotes."}
			</div>
		</div>
	);
}

function MiniStat({
	label,
	value,
	valueClass = "text-white",
}: {
	label: string;
	value: string;
	valueClass?: string;
}) {
	return (
		<div className="rounded-xl border border-white/6 bg-black/15 px-2 py-2">
			<div className="text-[10px] uppercase tracking-[0.18em] text-t-text-muted">{label}</div>
			<div className={`mt-1 text-sm font-semibold ${valueClass}`}>{value}</div>
		</div>
	);
}

function InsightCard({ body, title, tone }: InsightItem) {
	const toneClass =
		tone === "positive"
			? "border-t-green/20 bg-t-green/10"
			: tone === "warning"
				? "border-t-amber/20 bg-t-amber/10"
				: "border-white/6 bg-white/[0.04]";

	return (
		<div className={`min-w-0 rounded-2xl border p-3 ${toneClass}`}>
			<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-t-text-muted">
				{title}
			</div>
			<p className="mt-1 break-words text-sm leading-6 text-t-text-secondary">{body}</p>
		</div>
	);
}

function CoverageCard({ label, note, value }: CoverageCardData) {
	return (
		<div className="min-w-0 rounded-2xl border border-white/6 bg-white/[0.04] p-3">
			<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-t-text-muted">
				{label}
			</div>
			<div className="mt-1 break-words text-lg font-semibold text-white">{value}</div>
			<div className="mt-1 break-words text-xs leading-5 text-t-text-secondary">{note}</div>
		</div>
	);
}

function buildHeroNarrative({
	apacBoard,
	commoditiesBoard,
	forexBoard,
	freshness,
	indonesiaBoard,
	session,
	usBoard,
}: {
	apacBoard: Quote[];
	commoditiesBoard: Quote[];
	forexBoard: Quote[];
	freshness: FreshnessState;
	indonesiaBoard: Quote[];
	session: ReturnType<typeof getJakartaSession>;
	usBoard: Quote[];
}) {
	const local = indonesiaBoard[0] ?? null;
	const apacLead = sortByMagnitude(apacBoard)[0] ?? null;
	const macroLead =
		sortByMagnitude(commoditiesBoard)[0] ?? findQuote(forexBoard, ["usd/idr", "usdidr", "idr"]);
	const usLead = sortByMagnitude(usBoard)[0] ?? null;

	const localText = local
		? `${local.symbol} ${formatPercent(getChangePercent(local))}`
		: "Indonesia is awaiting the first local print";
	const apacText = apacLead
		? `${apacLead.symbol} ${formatPercent(getChangePercent(apacLead))}`
		: "APAC is still loading";
	const macroText = macroLead
		? `${macroLead.symbol} ${formatPercent(getChangePercent(macroLead))}`
		: "macro drivers are pending";

	return {
		headline: `${session.headline}: ${localText}, ${apacText}, ${macroText}.`,
		summary: usLead
			? `${local?.name ?? "Indonesia"}, ${apacLead?.name ?? "APAC"}, and ${usLead.name} are in view. Feed status: ${freshness.detail.toLowerCase()}.`
			: `${local?.name ?? "Indonesia"}, APAC, and macro signals are in view. Feed status: ${freshness.detail.toLowerCase()}.`,
	};
}

function buildHeroMetrics({
	apacBoard,
	forexBoard,
	indonesiaBoard,
	session,
}: {
	apacBoard: Quote[];
	cryptoBoard: Quote[];
	forexBoard: Quote[];
	indonesiaBoard: Quote[];
	session: ReturnType<typeof getJakartaSession>;
}) {
	const local = indonesiaBoard[0];
	const rupiah = findQuote(forexBoard, ["usd/idr", "usdidr", "idr"]) ?? forexBoard[0] ?? null;
	const apacLead = sortByMagnitude(apacBoard)[0] ?? null;

	return [
		{
			icon: <Landmark className="h-4 w-4" />,
			label: "Local Lead",
			value: local
				? `${local.symbol} ${formatPercent(getChangePercent(local))}`
				: "Awaiting Indonesia",
			secondary: local
				? `${local.name} at ${formatPrice(local.price, local.currency)}`
				: "Domestic benchmark loads here first",
		},
		{
			icon: <TrendingUp className="h-4 w-4" />,
			label: "Rupiah Watch",
			value: rupiah
				? `${rupiah.symbol} ${formatPrice(rupiah.price, rupiah.currency)}`
				: "Awaiting FX",
			secondary: rupiah
				? `${formatPercent(getChangePercent(rupiah))} on the currency board`
				: "USD/IDR becomes the primary FX proxy here",
		},
		{
			icon: <Globe2 className="h-4 w-4" />,
			label: "APAC Lead",
			value: apacLead
				? `${apacLead.symbol} ${formatPercent(getChangePercent(apacLead))}`
				: "Awaiting APAC",
			secondary: apacLead
				? `${apacLead.name} is the strongest regional move`
				: "Regional breadth will populate this slot",
		},
		{
			icon: <Activity className="h-4 w-4" />,
			label: "Session Mode",
			value: session.detail,
			secondary: session.subtext,
		},
	];
}

function buildHeroSpotlights({
	apacBoard,
	commoditiesBoard,
	forexBoard,
	indonesiaBoard,
	usBoard,
}: {
	apacBoard: Quote[];
	commoditiesBoard: Quote[];
	forexBoard: Quote[];
	indonesiaBoard: Quote[];
	usBoard: Quote[];
}) {
	const items: SpotlightItem[] = [];

	const local = indonesiaBoard[0];
	if (local) {
		items.push({
			kicker: "Indonesia",
			note: "Primary local benchmark.",
			quote: local,
			tone: "local",
		});
	}

	const rupiah = findQuote(forexBoard, ["usd/idr", "usdidr", "idr"]) ?? forexBoard[0];
	if (rupiah) {
		items.push({
			kicker: "Currency",
			note: "Primary FX proxy.",
			quote: rupiah,
			tone: "macro",
		});
	}

	const apacLead = sortByMagnitude(apacBoard)[0];
	if (apacLead) {
		items.push({
			kicker: "Asia-Pacific",
			note: "Largest regional move.",
			quote: apacLead,
			tone: "apac",
		});
	}

	const macroLead = sortByMagnitude(commoditiesBoard)[0] ?? sortByMagnitude(usBoard)[0];
	if (macroLead) {
		items.push({
			kicker: "Macro",
			note: "Largest cross-asset move.",
			quote: macroLead,
			tone: "global",
		});
	}

	return items.slice(0, 4);
}

function buildDeskInsights({
	apacBoard,
	commoditiesBoard,
	forexBoard,
	freshness,
	indonesiaBoard,
	session,
	usBoard,
}: {
	apacBoard: Quote[];
	commoditiesBoard: Quote[];
	forexBoard: Quote[];
	freshness: FreshnessState;
	indonesiaBoard: Quote[];
	session: ReturnType<typeof getJakartaSession>;
	usBoard: Quote[];
}): InsightItem[] {
	const indonesiaLead = sortByMagnitude(indonesiaBoard)[0] ?? null;
	const apacLead = sortByMagnitude(apacBoard)[0] ?? null;
	const commodityLead = sortByMagnitude(commoditiesBoard)[0] ?? null;
	const rupiah = findQuote(forexBoard, ["usd/idr", "usdidr", "idr"]) ?? null;
	const westernLead = sortByMagnitude(usBoard)[0] ?? null;

	return [
		{
			title: "Local Setup",
			body: indonesiaLead
				? `${indonesiaLead.name} ${formatPercent(getChangePercent(indonesiaLead))} during ${session.label.toLowerCase()}.`
				: "Local benchmarks are loading.",
			tone: indonesiaLead && getChangePercent(indonesiaLead) < 0 ? "warning" : "neutral",
		},
		{
			title: "Regional Tone",
			body: apacLead
				? `${apacLead.name} ${formatPercent(getChangePercent(apacLead))}.`
				: "APAC quotes are loading.",
			tone: "neutral",
		},
		{
			title: "Cross-Asset Pressure",
			body:
				commodityLead && rupiah
					? `${commodityLead.name} ${formatPercent(getChangePercent(commodityLead))}; ${rupiah.name} ${formatPrice(rupiah.price, rupiah.currency)}. ${freshness.detail}.`
					: westernLead
						? `${westernLead.name} ${formatPercent(getChangePercent(westernLead))}.`
						: "Cross-asset signals are loading.",
			tone: freshness.stale ? "warning" : "positive",
		},
	];
}

function buildMacroCards({
	commoditiesBoard,
	cryptoBoard,
	forexBoard,
	usBoard,
}: {
	commoditiesBoard: Quote[];
	cryptoBoard: Quote[];
	forexBoard: Quote[];
	usBoard: Quote[];
}) {
	const rupiah = findQuote(forexBoard, ["usd/idr", "usdidr", "idr"]) ?? forexBoard[0] ?? null;
	const topCommodity = sortByMagnitude(commoditiesBoard)[0] ?? null;
	const vix = findQuote(usBoard, ["vix", "volatility"]) ?? null;
	const cryptoLead = sortByMagnitude(cryptoBoard)[0] ?? null;

	return [
		rupiah
			? {
					label: "Rupiah",
					value: `${rupiah.symbol} ${formatPrice(rupiah.price, rupiah.currency)}`,
					note: `${formatPercent(getChangePercent(rupiah))} on the FX board`,
				}
			: {
					label: "Rupiah",
					value: "Awaiting FX feed",
					note: "USD/IDR populates here as soon as the FX board is available",
				},
		topCommodity
			? {
					label: "Top Commodity",
					value: `${topCommodity.symbol} ${formatPercent(getChangePercent(topCommodity))}`,
					note: `${topCommodity.name} trades at ${formatPrice(topCommodity.price, topCommodity.currency)}`,
				}
			: {
					label: "Top Commodity",
					value: "Awaiting commodities",
					note: "Energy and metals will populate this slot from the shared overview payload",
				},
		vix
			? {
					label: "Volatility",
					value: `${vix.symbol} ${formatPrice(vix.price, vix.currency)}`,
					note: `${formatPercent(getChangePercent(vix))} keeps Western risk context visible`,
				}
			: {
					label: "Volatility",
					value: "Awaiting VIX",
					note: "US risk proxy will load here when available",
				},
		cryptoLead
			? {
					label: "Crypto Lead",
					value: `${cryptoLead.symbol} ${formatPercent(getChangePercent(cryptoLead))}`,
					note: `${cryptoLead.name}`,
				}
			: {
					label: "Crypto Lead",
					value: "Awaiting crypto",
					note: "Higher-beta sentiment will populate here once the board is loaded",
				},
	];
}

function buildCoverageCards({
	apacBoard,
	commoditiesBoard,
	connectionStatus,
	cryptoBoard,
	forexBoard,
	freshness,
	indonesiaBoard,
	westernBoard,
}: {
	apacBoard: Quote[];
	commoditiesBoard: Quote[];
	connectionStatus: ConnectionStatus;
	cryptoBoard: Quote[];
	forexBoard: Quote[];
	freshness: FreshnessState;
	indonesiaBoard: Quote[];
	westernBoard: Quote[];
}) {
	return [
		{
			label: "Overview Coverage",
			value: `${countQuotes([
				...indonesiaBoard,
				...apacBoard,
				...westernBoard,
				...commoditiesBoard,
				...forexBoard,
				...cryptoBoard,
			])}`,
			note: "Visible instruments",
		},
		{
			label: "Regional Split",
			value: `${countQuotes([...indonesiaBoard, ...apacBoard])} APAC / ${countQuotes(westernBoard)} West`,
			note: "Local and regional markets remain weighted ahead of Western context",
		},
		{
			label: "Feed Freshness",
			value: freshness.label,
			note: freshness.detail,
		},
		{
			label: "Realtime Status",
			value: formatConnectionStatus(connectionStatus),
			note: "Websocket overlay drives in-place price updates when connected",
		},
	];
}

function buildBreadthSummary(label: string, quotes: Quote[]): BreadthSummary {
	const advancers = quotes.filter((quote) => getChangePercent(quote) > 0).length;
	const decliners = quotes.filter((quote) => getChangePercent(quote) < 0).length;
	const unchanged = quotes.length - advancers - decliners;
	const avgMove =
		quotes.length > 0
			? quotes.reduce((sum, quote) => sum + getChangePercent(quote), 0) / quotes.length
			: 0;

	return {
		advancers,
		avgMove,
		decliners,
		label,
		leader: sortByMagnitude(quotes)[0] ?? null,
		quotes,
		unchanged,
	};
}

function sortByMagnitude(quotes: Quote[]) {
	return [...quotes].sort((a, b) => Math.abs(getChangePercent(b)) - Math.abs(getChangePercent(a)));
}

function findQuote(quotes: Quote[], patterns: string[]) {
	return quotes.find((quote) => {
		const haystack = `${quote.symbol} ${quote.name}`.toLowerCase();
		return patterns.some((pattern) => haystack.includes(pattern));
	});
}

function getChangePercent(quote: Quote) {
	return Number.isFinite(quote.change_percent) ? quote.change_percent : 0;
}

function countQuotes(quotes: Quote[]) {
	return quotes.length;
}

function formatConnectionStatus(status: ConnectionStatus) {
	return status === "connected"
		? "Connected"
		: status === "connecting"
			? "Connecting"
			: "Disconnected";
}

function getFeedFreshness(updatedAt: string): FreshnessState {
	const timestamp = new Date(updatedAt);
	const ageMs = Number.isNaN(timestamp.getTime()) ? null : Date.now() - timestamp.getTime();
	const ageMinutes = ageMs == null ? null : Math.max(0, Math.round(ageMs / 60_000));

	if (ageMinutes == null) {
		return {
			ageMinutes: null,
			detail: "Update time unavailable",
			label: "Unknown freshness",
			stale: true,
			tone: "red",
		};
	}

	if (ageMinutes <= 5) {
		return {
			ageMinutes,
			detail: ageMinutes === 0 ? "Updated within the last minute" : `Updated ${ageMinutes} min ago`,
			label: "Live feed",
			stale: false,
			tone: "green",
		};
	}

	if (ageMinutes <= 20) {
		return {
			ageMinutes,
			detail: `Updated ${ageMinutes} min ago`,
			label: "Slight delay",
			stale: false,
			tone: "amber",
		};
	}

	return {
		ageMinutes,
		detail: `Updated ${ageMinutes} min ago`,
		label: "Stale feed",
		stale: true,
		tone: "red",
	};
}

function formatJakartaNow() {
	const now = new Date();
	return {
		time: new Intl.DateTimeFormat("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
			timeZone: JAKARTA_TIME_ZONE,
		}).format(now),
		date: new Intl.DateTimeFormat("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			timeZone: JAKARTA_TIME_ZONE,
		}).format(now),
	};
}

function getJakartaSession() {
	const now = new Date();
	const parts = new Intl.DateTimeFormat("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		weekday: "short",
		hour12: false,
		timeZone: JAKARTA_TIME_ZONE,
	}).formatToParts(now);
	const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
	const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
	const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
	const totalMinutes = hour * 60 + minute;

	if (weekday === "Sat" || weekday === "Sun") {
		return {
			headline: "Weekend market read",
			label: "Weekend",
			detail: "Market closed",
			subtext: "Use the board for recap, watchlists, and next-week setup",
			tone: "red" as const,
		};
	}

	if (totalMinutes < 525) {
		return {
			headline: "Pre-open setup",
			label: "Pre-open",
			detail: "Preparing for Jakarta open",
			subtext: "Overnight handoff, watchlist review, and macro context matter most here",
			tone: "amber" as const,
		};
	}

	if (totalMinutes < 690) {
		return {
			headline: "Live Jakarta session",
			label: "Session I",
			detail: "Indonesia cash market is live",
			subtext: "Local board, rupiah, and commodity drivers should dominate the first screen",
			tone: "green" as const,
		};
	}

	if (totalMinutes < 810) {
		return {
			headline: "Midday market read",
			label: "Lunch break",
			detail: "Midday reset",
			subtext: "Breadth, macro, and regional follow-through should be easiest to scan now",
			tone: "amber" as const,
		};
	}

	if (totalMinutes < 950) {
		return {
			headline: "Afternoon session",
			label: "Session II",
			detail: "Back into the afternoon session",
			subtext: "The homepage should hold up as a live desk, not just a morning landing page",
			tone: "green" as const,
		};
	}

	if (totalMinutes < 975) {
		return {
			headline: "Closing auction",
			label: "Closing auction",
			detail: "Into the close",
			subtext: "Closing context, leaders, and laggards need to be obvious during the final stretch",
			tone: "amber" as const,
		};
	}

	return {
		headline: "Post-close read",
		label: "After close",
		detail: "Market closed for the day",
		subtext: "The board shifts toward recap, standout moves, and tomorrow's setup",
		tone: "red" as const,
	};
}
