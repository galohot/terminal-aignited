import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { TierGate } from "../components/auth/tier-gate";
import { type ApiError, api } from "../lib/api";
import type { PaperFill, PaperPnl } from "../types/paper";

const TRADING_DAYS = 252;
const RISK_FREE_ANNUAL = 0.05; // BI-Rate-ish placeholder, 5% nominal IDR.

export function PortfolioAnalyticsPage() {
	return (
		<TierGate minTier="starter" featureName="Performance Analytics">
			<PortfolioAnalytics />
		</TierGate>
	);
}

function PortfolioAnalytics() {
	const pnlQ = useQuery<PaperPnl, ApiError>({
		queryKey: ["paper", "pnl", "all"],
		queryFn: () => api.paperPnl("all"),
		retry: false,
	});
	const fillsQ = useQuery<PaperFill[], ApiError>({
		queryKey: ["paper", "fills", "all"],
		queryFn: () => api.paperFills(500),
		retry: false,
	});

	const stats = useMemo(() => {
		if (!pnlQ.data || !fillsQ.data) return null;
		return computeStats(pnlQ.data, fillsQ.data);
	}, [pnlQ.data, fillsQ.data]);

	if (pnlQ.isLoading || fillsQ.isLoading) {
		return (
			<div className="mx-auto max-w-5xl px-4 py-8 font-mono text-sm text-ink-4">Loading…</div>
		);
	}

	if (pnlQ.isError) {
		return (
			<div className="mx-auto max-w-5xl px-4 py-8">
				<div className="rounded-[12px] border border-neg/30 bg-neg/10 p-4 font-mono text-xs text-neg">
					{pnlQ.error?.message ?? "Could not load P&L"}
				</div>
			</div>
		);
	}

	if (!pnlQ.data || !stats) {
		return (
			<div className="mx-auto max-w-5xl px-4 py-8 font-mono text-sm text-ink-4">
				No data yet. Place some paper trades first.
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
			<header>
				<div className="flex items-center gap-3">
					<span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ember-600">
						Performance
					</span>
					<span className="h-px w-12 bg-ember-400/40" />
				</div>
				<h1
					className="mt-1 text-2xl leading-tight text-ink"
					style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
				>
					Paper portfolio <em className="text-ember-600">analytics</em>
				</h1>
				<p className="mt-2 font-mono text-[11px] text-ink-4">
					Stats computed from daily equity curve (P&L series) and completed fills. Risk-free rate
					assumed {Math.round(RISK_FREE_ANNUAL * 100)}% (IDR nominal).
				</p>
			</header>

			<section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
				<Stat label="Total return" value={fmtPct(stats.totalReturnPct)} tone={tone(stats.totalReturnPct)} />
				<Stat label="CAGR" value={stats.days >= 30 ? fmtPct(stats.cagr * 100) : "—"} />
				<Stat label="Sharpe (ann.)" value={stats.sharpe != null ? stats.sharpe.toFixed(2) : "—"} />
				<Stat label="Max drawdown" value={fmtPct(stats.maxDrawdownPct)} tone="neg" />
				<Stat label="Win rate" value={`${(stats.winRatePct).toFixed(1)}%`} />
				<Stat label="Avg win" value={fmtPct(stats.avgWinPct)} tone="pos" />
				<Stat label="Avg loss" value={fmtPct(stats.avgLossPct)} tone="neg" />
				<Stat
					label="Profit factor"
					value={stats.profitFactor != null ? stats.profitFactor.toFixed(2) : "∞"}
				/>
			</section>

			<section className="rounded-[14px] border border-rule bg-card p-4">
				<div className="mb-3 flex items-baseline justify-between">
					<h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ember-600">
						Equity curve
					</h2>
					<span className="font-mono text-[10px] text-ink-4">
						{stats.days} day{stats.days === 1 ? "" : "s"} · {stats.trades} round-trip
						{stats.trades === 1 ? "" : "s"}
					</span>
				</div>
				<EquitySpark points={pnlQ.data.points} />
			</section>

			<section className="rounded-[14px] border border-rule bg-card p-4">
				<h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ember-600">
					Round-trip breakdown
				</h2>
				{stats.trades === 0 ? (
					<p className="font-mono text-xs text-ink-4">
						No closed trades yet. Stats appear once you've bought and sold the same ticker.
					</p>
				) : (
					<table className="w-full text-left font-mono text-xs">
						<thead className="text-ink-4">
							<tr className="border-b border-rule">
								<th className="py-2">Ticker</th>
								<th className="py-2 text-right">Trips</th>
								<th className="py-2 text-right">Win rate</th>
								<th className="py-2 text-right">Avg return</th>
								<th className="py-2 text-right">Net P&L</th>
							</tr>
						</thead>
						<tbody>
							{stats.byTicker.map((row) => (
								<tr key={row.ticker} className="border-b border-rule/40">
									<td className="py-2 text-ink">{row.ticker}</td>
									<td className="py-2 text-right text-ink-2">{row.trips}</td>
									<td className="py-2 text-right text-ink-2">{row.winRatePct.toFixed(0)}%</td>
									<td className={`py-2 text-right ${row.avgReturnPct >= 0 ? "text-pos" : "text-neg"}`}>
										{fmtPct(row.avgReturnPct)}
									</td>
									<td className={`py-2 text-right ${row.netIdr >= 0 ? "text-pos" : "text-neg"}`}>
										{fmtIdrSigned(row.netIdr)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</section>

			<p className="font-mono text-[10px] text-ink-4">
				Paper trading only. Not financial advice. Analytics are for self-review and not guaranteed
				to match your broker's reporting.
			</p>
		</div>
	);
}

function Stat({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone?: "pos" | "neg";
}) {
	const toneClass = tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : "text-ink";
	return (
		<div className="rounded-[12px] border border-rule bg-card p-3">
			<div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-4">{label}</div>
			<div className={`mt-1 font-mono text-lg tabular-nums ${toneClass}`}>{value}</div>
		</div>
	);
}

function EquitySpark({ points }: { points: Array<{ t: string; equity_idr: number }> }) {
	if (points.length < 2) {
		return (
			<div className="font-mono text-xs text-ink-4">
				Not enough data points yet (need at least 2 daily marks).
			</div>
		);
	}
	const values = points.map((p) => p.equity_idr);
	const min = Math.min(...values);
	const max = Math.max(...values);
	const w = 600;
	const h = 120;
	const pad = 4;
	const range = max - min || 1;
	const path = points
		.map((p, i) => {
			const x = (i / (points.length - 1)) * (w - 2 * pad) + pad;
			const y = h - pad - ((p.equity_idr - min) / range) * (h - 2 * pad);
			return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
		})
		.join(" ");
	const last = values[values.length - 1];
	const first = values[0];
	const up = last >= first;
	return (
		<svg
			viewBox={`0 0 ${w} ${h}`}
			className="h-32 w-full"
			role="img"
			aria-label="Equity curve"
		>
			<path
				d={path}
				fill="none"
				stroke={up ? "var(--color-pos, #0a7)" : "var(--color-neg, #c33)"}
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

// --- Computation --------------------------------------------------------

interface TickerStat {
	ticker: string;
	trips: number;
	wins: number;
	winRatePct: number;
	avgReturnPct: number;
	netIdr: number;
}

interface Stats {
	totalReturnPct: number;
	cagr: number;
	sharpe: number | null;
	maxDrawdownPct: number;
	winRatePct: number;
	avgWinPct: number;
	avgLossPct: number;
	profitFactor: number | null;
	days: number;
	trades: number;
	byTicker: TickerStat[];
}

function computeStats(pnl: PaperPnl, fills: PaperFill[]): Stats {
	const points = pnl.points.filter((p) => Number.isFinite(p.equity_idr) && p.equity_idr > 0);
	const days = points.length;

	// Daily log returns for Sharpe.
	let sharpe: number | null = null;
	if (days >= 2) {
		const rets: number[] = [];
		for (let i = 1; i < points.length; i++) {
			const prev = points[i - 1].equity_idr;
			const cur = points[i].equity_idr;
			if (prev > 0 && cur > 0) rets.push(Math.log(cur / prev));
		}
		if (rets.length > 1) {
			const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
			const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
			const sd = Math.sqrt(variance);
			if (sd > 0) {
				const dailyRf = RISK_FREE_ANNUAL / TRADING_DAYS;
				sharpe = ((mean - dailyRf) / sd) * Math.sqrt(TRADING_DAYS);
			}
		}
	}

	// Max drawdown on the equity curve.
	let peak = points[0]?.equity_idr ?? 0;
	let maxDd = 0;
	for (const p of points) {
		if (p.equity_idr > peak) peak = p.equity_idr;
		if (peak > 0) {
			const dd = (p.equity_idr - peak) / peak;
			if (dd < maxDd) maxDd = dd;
		}
	}
	const maxDrawdownPct = maxDd * 100;

	// CAGR (only meaningful if spanning a non-trivial window).
	const first = points[0]?.equity_idr ?? 1;
	const last = points[points.length - 1]?.equity_idr ?? first;
	const years = Math.max(days / TRADING_DAYS, 1 / TRADING_DAYS);
	const cagr = first > 0 ? (last / first) ** (1 / years) - 1 : 0;

	// Round-trip stats from fills — per-ticker FIFO buys/sells.
	const trades = computeRoundTrips(fills);
	const wins = trades.filter((t) => t.pnlIdr > 0);
	const losses = trades.filter((t) => t.pnlIdr < 0);
	const avgWinPct =
		wins.length > 0 ? wins.reduce((a, b) => a + b.returnPct, 0) / wins.length : 0;
	const avgLossPct =
		losses.length > 0 ? losses.reduce((a, b) => a + b.returnPct, 0) / losses.length : 0;
	const winRatePct = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
	const grossWin = wins.reduce((a, b) => a + b.pnlIdr, 0);
	const grossLoss = Math.abs(losses.reduce((a, b) => a + b.pnlIdr, 0));
	const profitFactor = grossLoss > 0 ? grossWin / grossLoss : null;

	// Per-ticker roll-up.
	const byTickerMap = new Map<string, { trips: number; wins: number; sumReturnPct: number; netIdr: number }>();
	for (const t of trades) {
		const row = byTickerMap.get(t.ticker) ?? { trips: 0, wins: 0, sumReturnPct: 0, netIdr: 0 };
		row.trips += 1;
		if (t.pnlIdr > 0) row.wins += 1;
		row.sumReturnPct += t.returnPct;
		row.netIdr += t.pnlIdr;
		byTickerMap.set(t.ticker, row);
	}
	const byTicker: TickerStat[] = [...byTickerMap.entries()]
		.map(([ticker, row]) => ({
			ticker,
			trips: row.trips,
			wins: row.wins,
			winRatePct: row.trips > 0 ? (row.wins / row.trips) * 100 : 0,
			avgReturnPct: row.trips > 0 ? row.sumReturnPct / row.trips : 0,
			netIdr: row.netIdr,
		}))
		.sort((a, b) => b.netIdr - a.netIdr);

	return {
		totalReturnPct: pnl.total_return_pct,
		cagr,
		sharpe,
		maxDrawdownPct,
		winRatePct,
		avgWinPct,
		avgLossPct,
		profitFactor,
		days,
		trades: trades.length,
		byTicker,
	};
}

interface RoundTrip {
	ticker: string;
	pnlIdr: number;
	returnPct: number;
}

// Per-ticker FIFO lot matching. Sell fill consumes earliest buy lots until qty done.
function computeRoundTrips(fills: PaperFill[]): RoundTrip[] {
	const sorted = [...fills].sort(
		(a, b) => new Date(a.filled_at).getTime() - new Date(b.filled_at).getTime(),
	);
	const buys = new Map<string, Array<{ qty: number; price: number }>>();
	const trips: RoundTrip[] = [];
	for (const f of sorted) {
		if (f.side === "buy") {
			const q = buys.get(f.ticker) ?? [];
			q.push({ qty: f.qty_lots, price: f.price_idr });
			buys.set(f.ticker, q);
			continue;
		}
		// sell: consume earliest buys
		let qtyRemaining = f.qty_lots;
		let cost = 0;
		const q = buys.get(f.ticker) ?? [];
		while (qtyRemaining > 0 && q.length > 0) {
			const head = q[0];
			const take = Math.min(qtyRemaining, head.qty);
			cost += take * head.price;
			head.qty -= take;
			qtyRemaining -= take;
			if (head.qty <= 0) q.shift();
		}
		if (f.qty_lots > qtyRemaining) {
			const filledQty = f.qty_lots - qtyRemaining;
			const proceeds = filledQty * f.price_idr;
			const pnlIdr = proceeds - cost - f.fee_idr;
			const returnPct = cost > 0 ? ((proceeds - cost) / cost) * 100 : 0;
			trips.push({ ticker: f.ticker, pnlIdr, returnPct });
		}
		buys.set(f.ticker, q);
	}
	return trips;
}

// --- Formatting ---------------------------------------------------------

function fmtPct(n: number): string {
	if (!Number.isFinite(n)) return "—";
	return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtIdrSigned(n: number): string {
	if (!Number.isFinite(n)) return "—";
	const sign = n >= 0 ? "+" : "−";
	const abs = Math.abs(n);
	if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)} B`;
	if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)} M`;
	if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)} K`;
	return `${sign}${abs.toLocaleString("en-US")}`;
}

function tone(n: number): "pos" | "neg" | undefined {
	if (n > 0) return "pos";
	if (n < 0) return "neg";
	return undefined;
}
