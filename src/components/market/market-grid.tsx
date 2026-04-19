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
import { useDashboard } from "../../hooks/use-dashboard";
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

type ChipTone = "ember" | "spark" | "pos" | "neg" | "cy" | "neutral";
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
	tone: ChipTone;
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
	const { data: dashData, isLoading, error, refetch } = useDashboard();
	const data = dashData?.markets ?? null;

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
				<p className="font-mono text-ink-2 text-sm">
					{is503
						? "Market data is warming up. Try again in a moment."
						: "Markets are unavailable right now."}
				</p>
				{!is503 && (
					<button type="button" onClick={() => refetch()} className="aig-btn aig-btn-ghost">
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
		<div className="min-h-full">
			<div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[14px] px-5 py-4 pb-7">
				{/* ===================== HERO ===================== */}
				<section className="aig-hero">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="min-w-0 max-w-3xl">
							<div className="mb-3.5 flex flex-wrap items-center gap-2">
								<Chip tone="ember">
									<ChipDot /> Jakarta-First
								</Chip>
								<Chip tone={session.tone}>
									<ChipDot /> {session.label}
								</Chip>
								<Chip tone={freshness.tone}>
									<ChipDot /> {freshness.label}
								</Chip>
								<Chip tone="neutral">Updated {formatTime(data.updated_at)} UTC</Chip>
							</div>
							<h1 className="aig-headline max-w-[880px] break-words">
								{heroNarrative.headline}
							</h1>
							<p className="max-w-[820px] break-words font-sans text-[15px] text-ink-3 leading-[1.55]">
								{heroNarrative.summary}
							</p>
						</div>

						<div className="min-w-0 rounded-[18px] border border-rule bg-card p-4 shadow-[0_1px_2px_rgba(20,23,53,0.04)] md:min-w-[280px]">
							<h4 className="mb-2 font-mono font-semibold text-[10px] text-ember-600 tracking-[0.26em] uppercase">
								Desk Signals
							</h4>
							<SignalLine label="Jakarta" value={`${jakarta.time} WIB`} />
							<SignalLine label="Date" value={jakarta.date} />
							<SignalLine label="Feed" value={freshness.detail} />
							<SignalLine
								label="Connector"
								value={formatConnectionStatus(connectionStatus)}
								valueClass={connectionColor(connectionStatus)}
							/>
							<HeroSparkBar />
						</div>
					</div>

					{freshness.stale && (
						<div className="mt-4 rounded-[18px] border border-ember-200 bg-ember-100/60 p-4">
							<div className="flex items-start gap-3">
								<TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-ember-600" />
								<div>
									<div className="font-mono text-[11px] text-ember-700 tracking-[0.24em] uppercase">
										Feed notice
									</div>
									<p className="mt-1 text-ink-2 text-sm leading-6">
										Quotes are delayed. Check feed freshness before using this overview as a live
										board.
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Metric row */}
					<div className="mt-[18px] grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
						{heroMetrics.map((metric) => (
							<MetricCard
								key={metric.label}
								icon={metric.icon}
								label={metric.label}
								secondary={metric.secondary}
								value={metric.value}
								direction={metric.direction}
							/>
						))}
					</div>

					{/* Spotlights */}
					<div className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
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

					{/* CTA row */}
					<div className="mt-3.5 flex flex-wrap items-center gap-2.5">
						<Link to="/watchlist" className="aig-btn aig-btn-ember">
							Open Watchlist <ArrowRight className="h-3.5 w-3.5" />
						</Link>
						<Link to="/charts" className="aig-btn aig-btn-primary">
							Launch Charts
						</Link>
						<Link to="/idx/entities" className="aig-btn aig-btn-ghost">
							Power Map
						</Link>
						<Link to="/idx/screener" className="aig-btn aig-btn-ghost">
							Run Screener
						</Link>
					</div>
				</section>

				{/* ===================== DESK STATE + READ ===================== */}
				<section className="grid gap-[14px] xl:grid-cols-[1.3fr_1fr]">
					<AigSection
						icon={<ShieldCheck className="h-3.5 w-3.5" />}
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
								note="Overview covers IDX, APAC, US/EU, commodities, FX, crypto"
							/>
							<SignalTile
								label="Realtime Overlay"
								value={formatConnectionStatus(connectionStatus)}
								note="Websocket drives in-place price updates when connected"
							/>
						</div>
					</AigSection>

					<AigSection
						icon={<Activity className="h-3.5 w-3.5" />}
						title="Desk Read"
						description="Key moves across local, regional, and cross-asset boards."
					>
						<div className="flex flex-col gap-2.5">
							{deskInsights.map((item) => (
								<InsightCard
									key={item.title}
									body={item.body}
									title={item.title}
									tone={item.tone}
								/>
							))}
						</div>
					</AigSection>
				</section>

				{/* ===================== NEWS ===================== */}
				<section>
					<NewsPanel />
				</section>

				{/* ===================== IDX INDICES ===================== */}
				<section>
					<AigSection
						icon={<Landmark className="h-3.5 w-3.5" />}
						title="IDX Indices"
						description="All IDX indices with daily performance. Color intensity reflects magnitude of change."
						tools={["1D", "1W", "1M", "YTD"]}
					>
						<IdxIndicesGrid />
					</AigSection>
				</section>

				{/* ===================== APAC SESSIONS ===================== */}
				<section>
					<AigSection
						icon={<Globe2 className="h-3.5 w-3.5" />}
						title="APAC Sessions"
						description="Regional market session status and sentiment overview."
					>
						<ApacSessionBar apacQuotes={apacBoard} />
					</AigSection>
				</section>

				{/* ===================== BOARDS ROW ===================== */}
				<section className="grid gap-[14px] xl:grid-cols-[1.1fr_1fr_0.95fr_0.95fr]">
					<AigSection
						icon={<Landmark className="h-3.5 w-3.5" />}
						title="Indonesia"
						description="Local benchmarks."
					>
						<QuoteList quotes={indonesiaBoard} maxItems={8} tone="local" />
					</AigSection>
					<AigSection
						icon={<Globe2 className="h-3.5 w-3.5" />}
						title="APAC Pulse"
						description="Regional indices."
					>
						<QuoteList quotes={sortByMagnitude(apacBoard)} maxItems={6} tone="apac" />
					</AigSection>
					<AigSection
						icon={<CandlestickChart className="h-3.5 w-3.5" />}
						title="Commodity Drivers"
						description="Commodities."
					>
						<QuoteList quotes={sortByMagnitude(commoditiesBoard)} maxItems={6} tone="macro" />
					</AigSection>
					<AigSection
						icon={<TrendingUp className="h-3.5 w-3.5" />}
						title="Currency Watch"
						description="Foreign exchange."
					>
						<QuoteList quotes={sortByMagnitude(forexBoard)} maxItems={6} tone="macro" />
					</AigSection>
				</section>

				{/* ===================== BREADTH + CROSS + COVERAGE ===================== */}
				<section className="grid gap-[14px] xl:grid-cols-3">
					<AigSection
						icon={<ChartColumnIncreasing className="h-3.5 w-3.5" />}
						title="Breadth Snapshot"
						description="Advancers, decliners, and average move."
					>
						<div className="flex flex-col gap-2.5">
							{breadthCards.map((card) => (
								<BreadthCard key={card.label} summary={card} />
							))}
						</div>
					</AigSection>

					<AigSection
						icon={<RefreshCw className="h-3.5 w-3.5" />}
						title="Cross-Asset Board"
						description="FX, commodities, volatility, and crypto."
					>
						<div className="flex flex-col gap-2.5">
							{macroCards.map((card) => (
								<CoverageCard
									key={card.label}
									label={card.label}
									value={card.value}
									note={card.note}
								/>
							))}
						</div>
					</AigSection>

					<AigSection
						icon={<Clock3 className="h-3.5 w-3.5" />}
						title="Coverage & Feed Health"
						description="Coverage, freshness, and realtime status."
					>
						<div className="flex flex-col gap-2.5">
							{coverageCards.map((card) => (
								<CoverageCard key={card.label} {...card} />
							))}
						</div>
					</AigSection>
				</section>

				{/* ===================== US/EU + CRYPTO ===================== */}
				<section className="grid gap-[14px] xl:grid-cols-[1.1fr_0.9fr]">
					<AigSection
						icon={<Globe2 className="h-3.5 w-3.5" />}
						title="US / Europe Handoff"
						description="US and Europe."
					>
						<QuoteList quotes={sortByMagnitude(westernBoard)} maxItems={8} tone="global" />
					</AigSection>
					<AigSection
						icon={<CandlestickChart className="h-3.5 w-3.5" />}
						title="Crypto Risk Board"
						description="Crypto."
					>
						<QuoteList quotes={sortByMagnitude(cryptoBoard)} maxItems={8} tone="macro" />
					</AigSection>
				</section>
			</div>
		</div>
	);
}

// =====================================================================
// Shared components
// =====================================================================

function AigSection({
	children,
	description,
	icon,
	title,
	tools,
}: {
	children: ReactNode;
	description: string;
	icon: ReactNode;
	title: string;
	tools?: string[];
}) {
	return (
		<div className="aig-section">
			<div className="mb-3.5 flex items-start justify-between gap-4">
				<div className="min-w-0">
					<div className="flex items-center gap-2.5">
						<span className="grid h-[22px] w-[22px] place-items-center rounded-[7px] border border-ember-200 bg-ember-100/60 text-ember-600">
							{icon}
						</span>
						<span className="font-mono font-semibold text-[11px] text-ember-600 tracking-[0.24em] uppercase">
							{title}
						</span>
					</div>
					<p className="mt-2 max-w-[560px] break-words text-[13px] text-ink-3 leading-[1.5]">
						{description}
					</p>
				</div>
				{tools && tools.length > 0 && (
					<div className="aig-tool-track shrink-0">
						{tools.map((t, i) => (
							<button
								type="button"
								// biome-ignore lint/suspicious/noArrayIndexKey: static preset list
								key={`${t}-${i}`}
								className={i === 0 ? "aig-tool aig-tool-active" : "aig-tool"}
							>
								{t}
							</button>
						))}
					</div>
				)}
			</div>
			{children}
		</div>
	);
}

function Chip({ children, tone }: { children: ReactNode; tone: ChipTone }) {
	const cls =
		tone === "ember"
			? "aig-chip aig-chip-ember"
			: tone === "spark"
				? "aig-chip aig-chip-spark"
				: tone === "pos"
					? "aig-chip aig-chip-pos"
					: tone === "neg"
						? "aig-chip aig-chip-neg"
						: tone === "cy"
							? "aig-chip aig-chip-cy"
							: "aig-chip";
	return <span className={cls}>{children}</span>;
}

function ChipDot() {
	return <span className="aig-chip-dot" />;
}

function SignalLine({
	label,
	value,
	valueClass = "text-ink",
}: {
	label: string;
	value: string;
	valueClass?: string;
}) {
	return (
		<div className="flex items-center justify-between gap-4 border-rule border-t py-2 font-mono first:border-t-0 first:pt-1 last:pb-1">
			<span className="font-mono text-[10px] text-ink-4 tracking-[0.2em] uppercase">
				{label}
			</span>
			<span className={`break-words text-right text-[12px] ${valueClass}`}>{value}</span>
		</div>
	);
}

function HeroSparkBar() {
	const bars = useMemo(() => {
		return Array.from({ length: 22 }, (_, i) =>
			Math.round(10 + Math.abs(Math.sin(i * 0.6)) * 28 + (i % 3) * 3),
		);
	}, []);
	return (
		<div className="mt-2.5 flex h-[38px] items-end gap-[3px]">
			{bars.map((h, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: decorative bar index is stable
					key={i}
					className="block w-[6px] rounded-[2px]"
					style={{
						height: `${h}px`,
						background:
							"linear-gradient(180deg, var(--color-ember-400), var(--color-ember-700))",
					}}
				/>
			))}
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
			<div className="rounded-2xl border border-rule border-dashed p-4 text-ink-4 text-sm">
				Awaiting market feed.
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-2">
			{quotes.slice(0, maxItems).map((quote) => (
				<QuoteRow key={quote.symbol} quote={quote} tone={tone} />
			))}
		</div>
	);
}

function QuoteRow({ quote, tone }: { quote: Quote; tone: QuoteTone }) {
	const changePercent = getChangePercent(quote);
	const isPositive = changePercent >= 0;

	return (
		<Link to={`/stock/${quote.symbol}`} className={`aig-quote-card group tone-${tone}`}>
			<div className="flex min-w-0 items-center gap-2.5">
				<div className="aig-qc-accent" />
				<div className="min-w-0">
					<div className="flex min-w-0 items-baseline gap-2">
						<span className="font-mono font-bold text-[13px] tracking-[0.04em] text-ink">
							{quote.symbol}
						</span>
						<span className="truncate text-[12px] text-ink-3">{quote.name}</span>
					</div>
					<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-ink-4 tracking-[0.2em] uppercase">
						{quote.exchange && <span>{quote.exchange}</span>}
						{quote.volume != null && quote.volume > 0 && (
							<span>Vol {formatVolume(quote.volume)}</span>
						)}
						{quote.currency && <span>{quote.currency}</span>}
					</div>
				</div>
			</div>
			<div className="flex min-w-[96px] max-w-[140px] flex-col items-end justify-center gap-[2px] font-mono">
				<div className="text-right font-semibold text-[13px] text-ink">
					{formatPrice(quote.price, quote.currency)}
				</div>
				<div className={`text-right text-[12px] ${isPositive ? "text-pos" : "text-neg"}`}>
					{formatPercent(changePercent)}
				</div>
				<MiniSpark up={isPositive} />
			</div>
		</Link>
	);
}

function MiniSpark({ up }: { up: boolean }) {
	// Stable zigzag based on a fixed seed so the SVG doesn't jitter on every render.
	const points = useMemo(() => {
		const w = 70;
		const h = 18;
		const pts: Array<[number, number]> = [];
		const n = 10;
		let v = 50;
		for (let i = 0; i < n; i++) {
			v += Math.sin(i * 1.3 + (up ? 1 : 0)) * 4 + (up ? 1.5 : -1.5);
			pts.push([i, v]);
		}
		const min = Math.min(...pts.map((p) => p[1]));
		const max = Math.max(...pts.map((p) => p[1]));
		return pts
			.map(([i, v2], idx) => {
				const x = (i / (n - 1)) * w;
				const y = h - ((v2 - min) / (max - min || 1)) * h;
				return `${idx ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(" ");
	}, [up]);
	return (
		<svg
			className="mt-0.5"
			width="70"
			height="18"
			viewBox="0 0 70 18"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<path
				d={points}
				fill="none"
				stroke={up ? "var(--color-pos)" : "var(--color-neg)"}
				strokeWidth="1.4"
			/>
		</svg>
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
	const barGrad =
		tone === "local"
			? "linear-gradient(180deg,#ff8a2a,#b53b00)"
			: tone === "apac"
				? "linear-gradient(180deg,#7cb7ff,#0e3f90)"
				: tone === "global"
					? "linear-gradient(180deg,#7a5cff,#141735)"
					: "linear-gradient(180deg,#ffb020,#e84e00)";

	return (
		<Link
			to={`/stock/${quote.symbol}`}
			className="relative min-w-0 overflow-hidden rounded-[20px] border border-rule bg-card p-4 shadow-[0_1px_2px_rgba(20,23,53,0.04)] transition-all hover:-translate-y-0.5 hover:bg-card-2 hover:shadow-[0_10px_30px_rgba(20,23,53,0.06)]"
		>
			<span
				className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-full"
				style={{ background: barGrad }}
			/>
			<div className="relative pl-3">
				<div className="font-mono text-[10px] text-ember-600 tracking-[0.24em] uppercase">
					{kicker}
				</div>
				<div
					className="mt-2.5 break-words font-mono font-bold text-[22px] text-ink tracking-[0.01em]"
				>
					{quote.symbol}
				</div>
				<div className="mt-0.5 break-words text-[12px] text-ink-3">{quote.name}</div>

				<div className="mt-3 flex items-end justify-between gap-2">
					<div className="break-words font-mono font-semibold text-[20px] text-ink">
						{formatPrice(quote.price, quote.currency)}
					</div>
					<div
						className={`rounded-full border px-2 py-1 font-mono text-[11px] ${
							isPositive
								? "border-[rgba(23,165,104,0.28)] bg-[rgba(23,165,104,0.1)] text-pos"
								: "border-[rgba(210,52,74,0.28)] bg-[rgba(210,52,74,0.08)] text-neg"
						}`}
					>
						{formatPercent(changePercent)}
					</div>
				</div>
				<div className="mt-2 break-words text-[12px] text-ink-3 leading-5">{note}</div>
			</div>
		</Link>
	);
}

function MetricCard({
	icon,
	label,
	secondary,
	value,
	direction,
}: {
	icon: ReactNode;
	label: string;
	secondary: string;
	value: string;
	direction: "up" | "down" | "flat";
}) {
	return (
		<div className="relative overflow-hidden rounded-[18px] border border-rule bg-card p-4 shadow-[0_1px_2px_rgba(20,23,53,0.04)]">
			<div className="flex items-center gap-2 font-mono text-[10px] text-ink-4 tracking-[0.24em] uppercase">
				<span className="text-ember-600">{icon}</span>
				{label}
			</div>
			<div className="mt-2.5 break-words font-mono font-semibold text-[22px] text-ink leading-[1.2] tracking-[0.01em]">
				{value}
			</div>
			<div className="mt-1.5 break-words text-[12px] text-ink-3 leading-[1.4]">
				{secondary}
			</div>
			<svg
				className="absolute top-3 right-3 h-7 w-20 opacity-95"
				viewBox="0 0 80 28"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<polyline
					fill="none"
					stroke={
						direction === "up"
							? "var(--color-pos)"
							: direction === "down"
								? "var(--color-neg)"
								: "var(--color-ember-500)"
					}
					strokeWidth="1.6"
					points={
						direction === "up"
							? "0,22 8,20 16,21 24,18 32,17 40,14 48,13 56,10 64,12 72,7 80,6"
							: direction === "down"
								? "0,8 8,9 16,7 24,10 32,12 40,14 48,13 56,16 64,17 72,18 80,20"
								: "0,18 10,16 20,18 30,14 40,12 50,10 60,12 70,8 80,6"
					}
				/>
			</svg>
		</div>
	);
}

function BreadthCard({ summary }: { summary: BreadthSummary }) {
	const tot = Math.max(summary.advancers + summary.decliners + summary.unchanged, 1);
	const upP = (summary.advancers / tot) * 100;
	const flP = (summary.unchanged / tot) * 100;
	const dnP = (summary.decliners / tot) * 100;

	const balance =
		summary.advancers === summary.decliners
			? "Balanced"
			: summary.advancers > summary.decliners
				? "Positive breadth"
				: "Negative breadth";
	const balanceClass =
		summary.advancers === summary.decliners
			? "text-ink-2"
			: summary.advancers > summary.decliners
				? "text-pos"
				: "text-neg";

	return (
		<div className="min-w-0 rounded-[14px] border border-rule bg-paper-2/60 p-3.5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="font-mono text-[10px] text-ink-4 tracking-[0.24em] uppercase">
						{summary.label}
					</div>
					<div className={`mt-0.5 break-words font-bold text-sm ${balanceClass}`}>{balance}</div>
				</div>
				<div className="font-mono text-[11px] text-ink-4">
					{summary.quotes.length} instrument{summary.quotes.length === 1 ? "" : "s"}
				</div>
			</div>
			<div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full border border-rule bg-paper">
				<div
					className="h-full"
					style={{
						flex: upP,
						background: "linear-gradient(90deg, var(--color-pos), #66d8a8)",
					}}
				/>
				<div className="h-full bg-[rgba(20,23,53,0.08)]" style={{ flex: flP }} />
				<div
					className="h-full"
					style={{
						flex: dnP,
						background: "linear-gradient(90deg, var(--color-neg), #e97a8b)",
					}}
				/>
			</div>
			<div className="mt-2.5 grid grid-cols-3 gap-2 text-center font-mono text-xs">
				<MiniStat label="Up" value={summary.advancers.toString()} valueClass="text-pos" />
				<MiniStat label="Down" value={summary.decliners.toString()} valueClass="text-neg" />
				<MiniStat label="Flat" value={summary.unchanged.toString()} />
			</div>
			<div className="mt-2.5 break-words text-[12px] text-ink-3 leading-[1.5]">
				Average move <b className="text-ink">{formatPercent(summary.avgMove)}</b>.{" "}
				{summary.leader
					? `Lead: ${summary.leader.symbol} ${formatPercent(getChangePercent(summary.leader))}.`
					: "Lead: awaiting quotes."}
			</div>
		</div>
	);
}

function MiniStat({
	label,
	value,
	valueClass = "text-ink",
}: {
	label: string;
	value: string;
	valueClass?: string;
}) {
	return (
		<div className="rounded-[10px] border border-rule bg-card px-2 py-2">
			<div className="font-mono text-[10px] text-ink-4 tracking-[0.2em] uppercase">
				{label}
			</div>
			<div className={`mt-1 font-bold text-sm ${valueClass}`}>{value}</div>
		</div>
	);
}

function InsightCard({ body, title, tone }: InsightItem) {
	const borderLeft =
		tone === "positive"
			? "var(--color-pos)"
			: tone === "warning"
				? "var(--color-ember-500)"
				: "var(--color-cyan-500)";

	return (
		<div
			className="min-w-0 rounded-[14px] border border-rule bg-paper-2/60 p-3"
			style={{ borderLeft: `3px solid ${borderLeft}` }}
		>
			<div className="font-mono text-[10px] text-ink-4 tracking-[0.22em] uppercase">
				{title}
			</div>
			<p className="mt-1.5 break-words text-[13px] text-ink-2 leading-6">{body}</p>
		</div>
	);
}

function SignalTile({ label, note, value }: { label: string; note: string; value: string }) {
	return (
		<div className="min-w-0 rounded-[14px] border border-rule bg-paper-2/60 p-3">
			<div className="font-mono text-[10px] text-ink-4 tracking-[0.22em] uppercase">
				{label}
			</div>
			<div className="mt-1 break-words font-semibold text-ink text-sm">{value}</div>
			<div className="mt-1 break-words text-[12px] text-ink-3 leading-5">{note}</div>
		</div>
	);
}

function CoverageCard({ label, note, value }: CoverageCardData) {
	return (
		<div className="min-w-0 rounded-[14px] border border-rule bg-paper-2/60 p-3">
			<div className="font-mono text-[10px] text-ink-4 tracking-[0.22em] uppercase">
				{label}
			</div>
			<div className="mt-1 break-words font-mono font-bold text-[18px] text-ink tracking-[0.01em]">
				{value}
			</div>
			<div className="mt-1 break-words text-[12px] text-ink-3 leading-5">{note}</div>
		</div>
	);
}

// =====================================================================
// Builders (pure logic)
// =====================================================================

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

	// Ember-gradient the mid-clause for brand-moment emphasis.
	return {
		headline: (
			<>
				{`${session.headline}: ${localText}, `}
				<em>{apacText}</em>
				{`, ${macroText}.`}
			</>
		),
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
}): Array<{
	icon: ReactNode;
	label: string;
	value: string;
	secondary: string;
	direction: "up" | "down" | "flat";
}> {
	const local = indonesiaBoard[0];
	const rupiah = findQuote(forexBoard, ["usd/idr", "usdidr", "idr"]) ?? forexBoard[0] ?? null;
	const apacLead = sortByMagnitude(apacBoard)[0] ?? null;

	return [
		{
			icon: <Landmark className="h-[13px] w-[13px]" />,
			label: "Local Lead",
			value: local
				? `${local.symbol} ${formatPercent(getChangePercent(local))}`
				: "Awaiting Indonesia",
			secondary: local
				? `${local.name} at ${formatPrice(local.price, local.currency)}`
				: "Domestic benchmark loads here first",
			direction: local ? direction(getChangePercent(local)) : "flat",
		},
		{
			icon: <TrendingUp className="h-[13px] w-[13px]" />,
			label: "Rupiah Watch",
			value: rupiah
				? `${rupiah.symbol} ${formatPrice(rupiah.price, rupiah.currency)}`
				: "Awaiting FX",
			secondary: rupiah
				? `${formatPercent(getChangePercent(rupiah))} on the currency board`
				: "USD/IDR becomes the primary FX proxy here",
			direction: rupiah ? direction(getChangePercent(rupiah)) : "flat",
		},
		{
			icon: <Globe2 className="h-[13px] w-[13px]" />,
			label: "APAC Lead",
			value: apacLead
				? `${apacLead.symbol} ${formatPercent(getChangePercent(apacLead))}`
				: "Awaiting APAC",
			secondary: apacLead
				? `${apacLead.name} is the strongest regional move`
				: "Regional breadth will populate this slot",
			direction: apacLead ? direction(getChangePercent(apacLead)) : "flat",
		},
		{
			icon: <Activity className="h-[13px] w-[13px]" />,
			label: "Session Mode",
			value: session.detail,
			secondary: session.subtext,
			direction: "flat",
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
			kicker: "Indonesia · Primary",
			note: "Primary local benchmark.",
			quote: local,
			tone: "local",
		});
	}

	const rupiah = findQuote(forexBoard, ["usd/idr", "usdidr", "idr"]) ?? forexBoard[0];
	if (rupiah) {
		items.push({
			kicker: "Currency · FX Proxy",
			note: "Primary FX proxy.",
			quote: rupiah,
			tone: "macro",
		});
	}

	const apacLead = sortByMagnitude(apacBoard)[0];
	if (apacLead) {
		items.push({
			kicker: "APAC · Biggest Move",
			note: "Largest regional move.",
			quote: apacLead,
			tone: "apac",
		});
	}

	const macroLead = sortByMagnitude(commoditiesBoard)[0] ?? sortByMagnitude(usBoard)[0];
	if (macroLead) {
		items.push({
			kicker: "Macro · Driver",
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

function direction(pct: number): "up" | "down" | "flat" {
	if (pct > 0.05) return "up";
	if (pct < -0.05) return "down";
	return "flat";
}

function formatConnectionStatus(status: ConnectionStatus) {
	return status === "connected"
		? "● WS Connected"
		: status === "connecting"
			? "● Connecting"
			: "● Disconnected";
}

function connectionColor(status: ConnectionStatus) {
	if (status === "connected") return "text-pos";
	if (status === "connecting") return "text-spark";
	return "text-neg";
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
			tone: "neg",
		};
	}

	if (ageMinutes <= 5) {
		return {
			ageMinutes,
			detail: ageMinutes === 0 ? "Updated within the last minute" : `Updated ${ageMinutes} min ago`,
			label: "Live feed",
			stale: false,
			tone: "pos",
		};
	}

	if (ageMinutes <= 20) {
		return {
			ageMinutes,
			detail: `Updated ${ageMinutes} min ago`,
			label: "Slight delay",
			stale: false,
			tone: "spark",
		};
	}

	return {
		ageMinutes,
		detail: `Updated ${ageMinutes} min ago`,
		label: "Stale feed",
		stale: true,
		tone: "neg",
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
			tone: "neg" as ChipTone,
		};
	}

	if (totalMinutes < 525) {
		return {
			headline: "Pre-open setup",
			label: "Pre-open",
			detail: "Preparing for Jakarta open",
			subtext: "Overnight handoff, watchlist review, and macro context matter most here",
			tone: "spark" as ChipTone,
		};
	}

	if (totalMinutes < 690) {
		return {
			headline: "Live Jakarta session",
			label: "Session I · Live",
			detail: "Indonesia cash market is live",
			subtext: "Local board, rupiah, and commodity drivers should dominate the first screen",
			tone: "pos" as ChipTone,
		};
	}

	if (totalMinutes < 810) {
		return {
			headline: "Midday market read",
			label: "Lunch break",
			detail: "Midday reset",
			subtext: "Breadth, macro, and regional follow-through should be easiest to scan now",
			tone: "spark" as ChipTone,
		};
	}

	if (totalMinutes < 950) {
		return {
			headline: "Afternoon session",
			label: "Session II",
			detail: "Back into the afternoon session",
			subtext: "The homepage should hold up as a live desk, not just a morning landing page",
			tone: "pos" as ChipTone,
		};
	}

	if (totalMinutes < 975) {
		return {
			headline: "Closing auction",
			label: "Closing auction",
			detail: "Into the close",
			subtext: "Closing context, leaders, and laggards need to be obvious during the final stretch",
			tone: "spark" as ChipTone,
		};
	}

	return {
		headline: "Post-close read",
		label: "After close",
		detail: "Market closed for the day",
		subtext: "The board shifts toward recap, standout moves, and tomorrow's setup",
		tone: "neg" as ChipTone,
	};
}
