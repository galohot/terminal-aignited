import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ChartToolbar } from "../components/charts/chart-toolbar";
import { PriceChart } from "../components/charts/price-chart";
import { StockNewsSection } from "../components/market/news-panel";
import { FundamentalsPanel } from "../components/quote/fundamentals";
import { KeyStats } from "../components/quote/key-stats";
import { QuoteHeader } from "../components/quote/quote-header";
import { Skeleton } from "../components/ui/loading";
import { WatchlistButton } from "../components/watchlist/watchlist-button";
import { useFundamentals } from "../hooks/use-fundamentals";
import { useHistory } from "../hooks/use-history";
import { useKeyboardShortcut } from "../hooks/use-keyboard";
import { useQuote } from "../hooks/use-quote";
import { useRealtimeSubscription } from "../hooks/use-realtime";
import { DEFAULT_PERIOD_INDEX, PERIOD_OPTIONS } from "../lib/constants";
import { useRealtimeStore } from "../stores/realtime-store";
import { useWatchlistStore } from "../stores/watchlist-store";

export function StockPage() {
	const { symbol = "" } = useParams<{ symbol: string }>();
	const navigate = useNavigate();
	const [periodIndex, setPeriodIndex] = useState(DEFAULT_PERIOD_INDEX);
	const selected = PERIOD_OPTIONS[periodIndex];

	const quote = useQuote(symbol);
	const history = useHistory(symbol, selected.period, selected.interval);
	const fundamentals = useFundamentals(symbol);
	const hasSymbol = useWatchlistStore((s) => s.hasSymbol(symbol));
	const addSymbol = useWatchlistStore((s) => s.addSymbol);
	const removeSymbol = useWatchlistStore((s) => s.removeSymbol);

	// Subscribe to realtime updates for this symbol
	const symbolList = useMemo(() => [symbol], [symbol]);
	useRealtimeSubscription(symbolList);
	const realtimePrice = useRealtimeStore((s) => s.prices[symbol]);

	const isJK = symbol.endsWith(".JK");
	const idxKode = isJK ? symbol.replace(".JK", "") : "";

	// Keyboard shortcuts: F=financials, W=watchlist toggle, I=IDX profile, 3-9=chart period
	useKeyboardShortcut("f", () => navigate(`/stock/${symbol}/financials`), [navigate, symbol]);
	useKeyboardShortcut("i", () => {
		if (isJK) navigate(`/idx/${idxKode}`);
	}, [navigate, isJK, idxKode]);
	useKeyboardShortcut("w", () => (hasSymbol ? removeSymbol(symbol) : addSymbol(symbol)), [
		hasSymbol,
		symbol,
		addSymbol,
		removeSymbol,
	]);
	useKeyboardShortcut("3", () => setPeriodIndex(2), []);
	useKeyboardShortcut("4", () => setPeriodIndex(3), []);
	useKeyboardShortcut("5", () => setPeriodIndex(4), []);
	useKeyboardShortcut("6", () => setPeriodIndex(5), []);
	useKeyboardShortcut("7", () => setPeriodIndex(6), []);
	useKeyboardShortcut("8", () => setPeriodIndex(7), []);
	useKeyboardShortcut("9", () => setPeriodIndex(8), []);
	useKeyboardShortcut("n", () => {
		document.getElementById("news-section")?.scrollIntoView({ behavior: "smooth" });
	}, []);

	if (quote.isLoading) {
		return (
			<div className="p-4">
				<Skeleton className="mb-4 h-16 w-full" />
				<Skeleton className="h-[400px] w-full" />
			</div>
		);
	}

	if (quote.error || !quote.data) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
				<p className="font-mono text-sm text-t-text-secondary">
					{quote.error?.message.includes("404")
						? `Symbol "${symbol}" not found`
						: "Failed to load quote"}
				</p>
				<Link
					to="/"
					className="rounded border border-t-border bg-t-surface px-3 py-1 font-mono text-xs text-t-text-secondary transition-colors hover:bg-t-hover"
				>
					Back to Dashboard
				</Link>
			</div>
		);
	}

	// Merge realtime data over REST quote when available
	const liveQuote = realtimePrice
		? {
				...quote.data,
				price: realtimePrice.price,
				change: realtimePrice.change,
				change_percent: realtimePrice.changePercent,
				volume: realtimePrice.volume || quote.data.volume,
			}
		: quote.data;

	return (
		<div>
			<QuoteHeader quote={liveQuote} />
			<div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[1fr_280px]">
				<div>
					<ChartToolbar selectedIndex={periodIndex} onSelect={setPeriodIndex} />
					{history.isLoading ? (
						<Skeleton className="h-[400px] w-full" />
					) : history.data ? (
						<PriceChart data={history.data.data} realtimePrice={realtimePrice} />
					) : null}
					{fundamentals.data && (
						<div className="mt-4">
							<FundamentalsPanel data={fundamentals.data} />
						</div>
					)}
					<div className="mt-4">
						<StockNewsSection ticker={symbol} />
					</div>
				</div>
				<div className="flex flex-col gap-4">
					<KeyStats quote={liveQuote} fundamentals={fundamentals.data} />
					<div className="flex flex-wrap gap-2">
						<Link
							to={`/stock/${symbol}/financials`}
							className="flex-1 rounded border border-t-border bg-t-surface px-3 py-1.5 text-center font-mono text-xs text-t-text-secondary transition-colors hover:bg-t-hover"
						>
							Financials →
						</Link>
						{isJK && (
							<Link
								to={`/idx/${idxKode}`}
								className="flex-1 rounded border border-t-border bg-t-surface px-3 py-1.5 text-center font-mono text-xs text-t-text-secondary transition-colors hover:bg-t-hover"
							>
								IDX Profile →
							</Link>
						)}
						<WatchlistButton symbol={symbol} />
					</div>
				</div>
			</div>
		</div>
	);
}
