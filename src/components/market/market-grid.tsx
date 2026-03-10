import {
	ArrowRight,
	CandlestickChart,
	ChartColumnIncreasing,
	Globe2,
	Landmark,
	ScanSearch,
} from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { Link } from "react-router";
import { useMarkets } from "../../hooks/use-markets";
import { useRealtimeSubscription } from "../../hooks/use-realtime";
import { formatPercent, formatPrice, formatTime, formatVolume } from "../../lib/format";
import { useRealtimeStore } from "../../stores/realtime-store";
import type { MarketOverview, Quote } from "../../types/market";
import { MarketGridSkeleton } from "../ui/loading";

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

export function MarketGrid() {
	const { data, isLoading, error, refetch } = useMarkets();

	// Hooks must be called unconditionally before any early returns
	const allSymbols = useMemo(() => {
		if (!data) return [];
		const syms = [
			...data.indices.indonesia,
			...data.indices.asia_pacific,
			...data.indices.us,
			...data.indices.europe,
			...data.commodities,
			...data.forex,
			...data.crypto,
		].map((q) => q.symbol);
		return [...new Set(syms)];
	}, [data]);

	useRealtimeSubscription(allSymbols);
	const realtimePrices = useRealtimeStore((s) => s.prices);

	if (isLoading) return <MarketGridSkeleton />;

	if (error) {
		const is503 = error.message.includes("503");
		return (
			<div className="flex min-h-full flex-col items-center justify-center gap-3 p-12 text-center">
				<p className="font-mono text-sm text-t-text-secondary">
					{is503 ? "Market data loading, please wait..." : "Markets unavailable"}
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

	// Apply realtime overlay to a list of quotes
	const withRealtime = (quotes: Quote[]): Quote[] =>
		quotes.map((q) => {
			const rt = realtimePrices[q.symbol];
			if (!rt) return q;
			return {
				...q,
				price: rt.price,
				change: rt.change,
				change_percent: rt.changePercent,
				volume: rt.volume || q.volume,
			};
		});

	const jakarta = formatJakartaNow();
	const session = getJakartaSession();
	const indonesiaBoard = withRealtime(data.indices.indonesia);
	const apacBoard = withRealtime(data.indices.asia_pacific);
	const westernBoard = withRealtime([...data.indices.us, ...data.indices.europe]);
	const localLeaders = sortByMagnitude(indonesiaBoard).slice(0, 3);
	const apacLeaders = sortByMagnitude(apacBoard).slice(0, 6);
	const westernLeaders = sortByMagnitude(westernBoard).slice(0, 6);
	const macroQuotes = buildMacroQuotes({
		...data,
		indices: {
			...data.indices,
			indonesia: indonesiaBoard,
			asia_pacific: apacBoard,
			us: withRealtime(data.indices.us),
			europe: withRealtime(data.indices.europe),
		},
		commodities: withRealtime(data.commodities),
		forex: withRealtime(data.forex),
		crypto: withRealtime(data.crypto),
	});
	const agendaItems = buildAgendaItems({
		...data,
		indices: {
			...data.indices,
			indonesia: indonesiaBoard,
			asia_pacific: apacBoard,
		},
		commodities: withRealtime(data.commodities),
	});

	return (
		<div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(255,187,0,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_28%)]">
			<div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 pb-6">
				<section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
					<div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(9,24,20,0.98),rgba(7,12,12,0.94))] shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
						<div className="flex flex-col gap-5 p-5 sm:p-6">
							<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
								<div className="max-w-3xl">
									<div className="mb-3 flex flex-wrap items-center gap-2">
										<Badge tone="amber">IDX FIRST</Badge>
										<Badge tone={session.tone}>{session.label}</Badge>
										<Badge tone="neutral">Updated {formatTime(data.updated_at)} UTC</Badge>
									</div>
									<h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-[2.5rem]">
										Jakarta market desk with a sharper morning read.
									</h2>
									<p className="mt-2 max-w-2xl text-sm leading-6 text-t-text-secondary sm:text-[15px]">
										The homepage now leads with Indonesia, frames global markets as context, and
										gives users a better reason to return before open, at lunch, and into the close.
									</p>
								</div>
								<div className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-t-text-secondary">
									<SignalLine label="Jakarta" value={`${jakarta.time} WIB`} />
									<SignalLine label="Date" value={jakarta.date} />
									<SignalLine label="Desk" value="Indonesia / IDX / Rupiah" />
								</div>
							</div>
							<div className="grid gap-3 sm:grid-cols-3">
								<HeroMetric
									icon={<Landmark className="h-4 w-4" />}
									label="Session"
									value={session.detail}
									secondary={session.subtext}
								/>
								<HeroMetric
									icon={<ChartColumnIncreasing className="h-4 w-4" />}
									label="Indonesia Board"
									value={`${indonesiaBoard.length} tracked benchmarks`}
									secondary="Local board is elevated above all other regions"
								/>
								<HeroMetric
									icon={<Globe2 className="h-4 w-4" />}
									label="APAC Context"
									value={
										apacLeaders[0]
											? `${apacLeaders[0].symbol} ${formatPercent(apacLeaders[0].change_percent)}`
											: "Awaiting APAC board"
									}
									secondary="Regional handoff stays explicit because Indonesian users track Asia closely"
								/>
								<HeroMetric
									icon={<ScanSearch className="h-4 w-4" />}
									label="Daily Setup"
									value="Open watchlist, charts, Indonesia, and APAC in one screen"
									secondary="Designed to feel like a desk, not a brochure"
								/>
							</div>
							<div className="grid gap-3 lg:grid-cols-3">
								{localLeaders.map((quote) => (
									<FocusCard key={quote.symbol} quote={quote} />
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
							icon={<Landmark className="h-4 w-4" />}
							title="Jakarta Pulse"
							description="The information cluster users should scan in the first ten seconds."
						>
							<div className="grid gap-2 sm:grid-cols-2">
								<SignalTile label="Session" value={session.label} note={session.subtext} />
								<SignalTile
									label="Rupiah Lens"
									value={macroQuotes[0]?.value ?? "Awaiting FX feed"}
									note={macroQuotes[0]?.note ?? "Macro board updates with incoming data"}
								/>
								<SignalTile
									label="Most Active Local Move"
									value={localLeaders[0]?.symbol ?? "Awaiting local print"}
									note={
										localLeaders[0]
											? `${formatPercent(localLeaders[0].change_percent)} today`
											: "No Indonesia quote loaded yet"
									}
								/>
								<SignalTile
									label="APAC Lead"
									value={apacLeaders[0]?.symbol ?? "Awaiting APAC board"}
									note={
										apacLeaders[0]
											? `${formatPercent(apacLeaders[0].change_percent)} sets the regional tone`
											: "Regional indices load here"
									}
								/>
							</div>
						</SectionPanel>
						<SectionPanel
							icon={<Globe2 className="h-4 w-4" />}
							title="Why Users Return"
							description="A homepage with rhythm: morning setup, intraday context, closing handoff."
						>
							<div className="space-y-2">
								{agendaItems.map((item) => (
									<div
										key={item.title}
										className="rounded-2xl border border-white/6 bg-white/[0.04] p-3"
									>
										<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-t-amber">
											{item.title}
										</div>
										<p className="mt-1 text-sm leading-6 text-t-text-secondary">{item.body}</p>
									</div>
								))}
							</div>
						</SectionPanel>
					</div>
				</section>

				<section className="grid gap-4 xl:grid-cols-[1.05fr_1fr_0.9fr_0.9fr]">
					<SectionPanel
						icon={<Landmark className="h-4 w-4" />}
						title="Indonesia Board"
						description="Local benchmarks come first. Global markets are supporting context, not the main stage."
					>
						<QuoteList quotes={indonesiaBoard} maxItems={8} tone="local" />
					</SectionPanel>
					<SectionPanel
						icon={<Globe2 className="h-4 w-4" />}
						title="APAC Pulse"
						description="Regional sentiment matters to Indonesia, so Asia-Pacific gets its own permanent lane."
					>
						<QuoteList quotes={apacLeaders} maxItems={6} tone="apac" />
					</SectionPanel>
					<SectionPanel
						icon={<CandlestickChart className="h-4 w-4" />}
						title="Commodity Drivers"
						description="Keep the drivers that matter to Indonesian sentiment and cyclicals in view."
					>
						<QuoteList quotes={withRealtime(data.commodities)} maxItems={6} tone="macro" />
					</SectionPanel>
					<SectionPanel
						icon={<Globe2 className="h-4 w-4" />}
						title="Currency Watch"
						description="Rupiah context should be visible on the homepage, not buried behind search."
					>
						<QuoteList quotes={withRealtime(data.forex)} maxItems={6} tone="macro" />
					</SectionPanel>
				</section>

				<section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
					<SectionPanel
						icon={<ChartColumnIncreasing className="h-4 w-4" />}
						title="US / Europe Handoff"
						description="Keep Western markets visible, but separate them from APAC so regional context stays clear."
					>
						<QuoteList quotes={westernLeaders} maxItems={6} tone="global" />
					</SectionPanel>
					<SectionPanel
						icon={<ScanSearch className="h-4 w-4" />}
						title="Macro Board"
						description="Turn the generic homepage into a trader’s prep sheet."
					>
						<div className="grid gap-2">
							{macroQuotes.map((quote) => (
								<div
									key={quote.label}
									className="rounded-2xl border border-white/6 bg-white/[0.04] p-3"
								>
									<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-t-text-muted">
										{quote.label}
									</div>
									<div className="mt-1 text-lg font-semibold text-white">{quote.value}</div>
									<div className="mt-1 text-xs text-t-text-secondary">{quote.note}</div>
								</div>
							))}
						</div>
					</SectionPanel>
					<SectionPanel
						icon={<CandlestickChart className="h-4 w-4" />}
						title="Desk Notes"
						description="Small retention hooks matter when the data model is still growing."
					>
						<ul className="space-y-3 text-sm leading-6 text-t-text-secondary">
							<li className="rounded-2xl border border-white/6 bg-white/[0.04] p-3">
								Add an autogenerated morning brief above the fold once the backend exposes local
								news or corporate actions.
							</li>
							<li className="rounded-2xl border border-white/6 bg-white/[0.04] p-3">
								Pin user modules next: dividend radar, broker flow, and a persistent watchlist
								stack.
							</li>
							<li className="rounded-2xl border border-white/6 bg-white/[0.04] p-3">
								Use this layout as the base for future heatmaps, sector rotation, and foreign flow
								cards.
							</li>
						</ul>
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
				<div>
					<div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-t-amber">
						<span className="text-t-green">{icon}</span>
						{title}
					</div>
					<p className="max-w-2xl text-sm leading-6 text-t-text-secondary">{description}</p>
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
	tone: "apac" | "global" | "local" | "macro";
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

function QuoteRow({ quote, tone }: { quote: Quote; tone: "apac" | "global" | "local" | "macro" }) {
	const isPositive = quote.change >= 0;
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
			className={`group grid grid-cols-[minmax(0,1fr)_auto] gap-4 overflow-hidden rounded-2xl border border-white/6 bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-3 transition-transform hover:-translate-y-0.5 hover:border-white/12`}
		>
			<div className={`rounded-xl bg-gradient-to-r ${accentTone} p-2`}>
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
			<div className="flex min-w-[112px] flex-col items-end justify-center font-mono">
				<div className="text-sm text-white">{formatPrice(quote.price, quote.currency)}</div>
				<div className={`mt-1 text-sm ${changeColor}`}>{formatPercent(quote.change_percent)}</div>
			</div>
		</Link>
	);
}

function FocusCard({ quote }: { quote: Quote }) {
	const isPositive = quote.change >= 0;
	const tone = isPositive ? "border-t-green/25 bg-t-green/10" : "border-t-red/25 bg-t-red/10";

	return (
		<Link
			to={`/stock/${quote.symbol}`}
			className={`rounded-[24px] border ${tone} p-4 transition-transform hover:-translate-y-0.5`}
		>
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="font-mono text-[11px] uppercase tracking-[0.24em] text-t-text-muted">
						Indonesia focus
					</div>
					<div className="mt-2 font-mono text-xl font-semibold text-white">{quote.symbol}</div>
					<div className="mt-1 text-sm text-t-text-secondary">{quote.name}</div>
				</div>
				<div className="rounded-full border border-white/10 bg-black/20 px-2 py-1 font-mono text-[11px] text-t-text-secondary">
					{quote.exchange}
				</div>
			</div>
			<div className="mt-5 flex items-end justify-between gap-4">
				<div className="font-mono text-2xl font-semibold text-white">
					{formatPrice(quote.price, quote.currency)}
				</div>
				<div className={`font-mono text-sm ${isPositive ? "text-t-green" : "text-t-red"}`}>
					{formatPercent(quote.change_percent)}
				</div>
			</div>
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
		<div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
			<div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-t-text-muted">
				<span className="text-t-amber">{icon}</span>
				{label}
			</div>
			<div className="text-sm font-medium leading-6 text-white">{value}</div>
			<div className="mt-2 text-sm leading-6 text-t-text-secondary">{secondary}</div>
		</div>
	);
}

function SignalTile({ label, note, value }: { label: string; note: string; value: string }) {
	return (
		<div className="rounded-2xl border border-white/6 bg-white/[0.04] p-3">
			<div className="font-mono text-[11px] uppercase tracking-[0.22em] text-t-text-muted">
				{label}
			</div>
			<div className="mt-1 text-sm font-semibold text-white">{value}</div>
			<div className="mt-1 text-xs leading-5 text-t-text-secondary">{note}</div>
		</div>
	);
}

function SignalLine({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-6 font-mono text-xs">
			<span className="uppercase tracking-[0.22em] text-t-text-muted">{label}</span>
			<span className="text-white">{value}</span>
		</div>
	);
}

function Badge({
	children,
	tone,
}: {
	children: ReactNode;
	tone: "amber" | "green" | "neutral" | "red";
}) {
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
			className={`rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.22em] ${classes}`}
		>
			{children}
		</span>
	);
}

function buildMacroQuotes(data: MarketOverview) {
	const rupiah =
		findQuote(data.forex, ["idr", "rupiah", "usd/idr", "usdidr"]) ?? data.forex[0] ?? null;
	const topCommodity = sortByMagnitude(data.commodities)[0] ?? null;
	const topCrypto = sortByMagnitude(data.crypto)[0] ?? null;
	const usLead = sortByMagnitude(data.indices.us)[0] ?? null;

	return [
		rupiah
			? {
					label: "Rupiah Watch",
					value: `${rupiah.symbol} ${formatPrice(rupiah.price, rupiah.currency)}`,
					note: `${formatPercent(rupiah.change_percent)} on the FX board`,
				}
			: {
					label: "Rupiah Watch",
					value: "Awaiting FX feed",
					note: "Place USD/IDR here when the quote arrives",
				},
		topCommodity
			? {
					label: "Commodity Driver",
					value: `${topCommodity.symbol} ${formatPercent(topCommodity.change_percent)}`,
					note: `${topCommodity.name} prints ${formatPrice(topCommodity.price, topCommodity.currency)}`,
				}
			: {
					label: "Commodity Driver",
					value: "Awaiting commodities",
					note: "Energy and metals should live here",
				},
		usLead
			? {
					label: "US Lead",
					value: `${usLead.symbol} ${formatPercent(usLead.change_percent)}`,
					note: `${usLead.name} shapes the next Asia open`,
				}
			: {
					label: "US Lead",
					value: "Awaiting global close",
					note: "Add Wall Street handoff here",
				},
		topCrypto
			? {
					label: "Risk Proxy",
					value: `${topCrypto.symbol} ${formatPercent(topCrypto.change_percent)}`,
					note: `${topCrypto.name} stays visible for higher-beta users`,
				}
			: {
					label: "Risk Proxy",
					value: "Awaiting crypto",
					note: "Optional but useful for momentum traders",
				},
	];
}

function buildAgendaItems(data: MarketOverview) {
	const indonesiaLead = sortByMagnitude(data.indices.indonesia)[0];
	const apacLead = sortByMagnitude(data.indices.asia_pacific)[0];
	const commodityLead = sortByMagnitude(data.commodities)[0];

	return [
		{
			title: "Before Open",
			body: indonesiaLead
				? `${indonesiaLead.symbol} is the headline local board move at ${formatPercent(indonesiaLead.change_percent)}. A serious homepage should surface that immediately.`
				: "Use this slot for pre-open signals, overnight handoff, and the local briefing.",
		},
		{
			title: "Midday",
			body: commodityLead
				? `${commodityLead.name} is the strongest macro driver on the page right now. This type of signal should stay visible through the lunch break and second session.`
				: "Use this slot for sector rotation, broker flow, and unusual volume once those feeds exist.",
		},
		{
			title: "Into Close",
			body: apacLead
				? `${apacLead.symbol} is the strongest APAC mover on the board. Keep that regional handoff visible because Indonesia traders watch Asia before they watch the West.`
				: "Use this slot for closing auction context, recap, and tomorrow’s setup.",
		},
	];
}

function sortByMagnitude(quotes: Quote[]) {
	return [...quotes].sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent));
}

function findQuote(quotes: Quote[], patterns: string[]) {
	return quotes.find((quote) => {
		const haystack = `${quote.symbol} ${quote.name}`.toLowerCase();
		return patterns.some((pattern) => haystack.includes(pattern));
	});
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
			label: "Weekend",
			detail: "Market closed",
			subtext: "Use the homepage for recap, watchlists, and next-week setup",
			tone: "red" as const,
		};
	}

	if (totalMinutes < 525) {
		return {
			label: "Pre-open",
			detail: "Preparing for Jakarta open",
			subtext: "Best time for overnight handoff, watchlist review, and local brief",
			tone: "amber" as const,
		};
	}

	if (totalMinutes < 690) {
		return {
			label: "Session I",
			detail: "Indonesia cash market is live",
			subtext: "Keep the local board and macro drivers visible",
			tone: "green" as const,
		};
	}

	if (totalMinutes < 810) {
		return {
			label: "Lunch break",
			detail: "Midday reset",
			subtext: "Use the pause for sector rotation, macro, and corporate-event context",
			tone: "amber" as const,
		};
	}

	if (totalMinutes < 950) {
		return {
			label: "Session II",
			detail: "Back into the afternoon session",
			subtext: "This is where a live homepage starts to earn repeat visits",
			tone: "green" as const,
		};
	}

	if (totalMinutes < 975) {
		return {
			label: "Closing auction",
			detail: "Into the close",
			subtext: "Closing context, movers, and recap should be elevated now",
			tone: "amber" as const,
		};
	}

	return {
		label: "After close",
		detail: "Market closed for the day",
		subtext: "Shift the desk toward recap, winners, laggards, and tomorrow’s setup",
		tone: "red" as const,
	};
}
