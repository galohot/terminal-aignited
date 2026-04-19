import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, NotebookPen, RefreshCw, Trash2, X } from "lucide-react";
import { type FormEvent, forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Link } from "react-router";
import { TierGate } from "../components/auth/tier-gate";
import { type ApiError, api, journal, type JournalEntry, type JournalKind } from "../lib/api";
import type { OrderSide, OrderType, PaperOrder, PaperPortfolio } from "../types/paper";

export function PortfolioPage() {
	return (
		<TierGate minTier="starter" featureName="Paper Portfolio">
			<Portfolio />
		</TierGate>
	);
}

function fmtIdr(n: number): string {
	if (!Number.isFinite(n)) return "—";
	const abs = Math.abs(n);
	if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} B`;
	if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M`;
	if (abs >= 1_000) return `${(n / 1_000).toFixed(1)} K`;
	return n.toLocaleString("en-US");
}

function fmtPct(n: number): string {
	return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function Portfolio() {
	const qc = useQueryClient();
	const journalFormRef = useRef<JournalFormHandle>(null);

	const portfolioQ = useQuery<PaperPortfolio, ApiError>({
		queryKey: ["paper", "portfolio"],
		queryFn: () => api.paperPortfolio(),
		refetchInterval: 15_000,
		retry: false,
	});

	const ordersQ = useQuery<PaperOrder[], ApiError>({
		queryKey: ["paper", "orders", "open"],
		queryFn: () => api.paperOrders("open"),
		refetchInterval: 15_000,
		retry: false,
		enabled: portfolioQ.isSuccess,
	});

	const fillsQ = useQuery({
		queryKey: ["paper", "fills", 20],
		queryFn: () => api.paperFills(20),
		refetchInterval: 30_000,
		retry: false,
		enabled: portfolioQ.isSuccess,
	});

	const initAccount = useMutation({
		mutationFn: () => api.paperInitAccount(),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["paper"] });
		},
	});

	const resetAccount = useMutation({
		mutationFn: () => api.paperResetAccount(),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["paper"] });
		},
	});

	const cancelOrder = useMutation({
		mutationFn: (id: number) => api.paperCancelOrder(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["paper"] });
		},
	});

	if (portfolioQ.isError) {
		const status = portfolioQ.error?.status;
		const msg = portfolioQ.error?.message ?? "";
		if (status === 404 || /ACCOUNT_NOT_FOUND/i.test(msg)) {
			return <InitAccount onInit={() => initAccount.mutate()} pending={initAccount.isPending} />;
		}
		return (
			<div className="p-6 font-mono text-sm text-neg">
				Failed to load portfolio: {portfolioQ.error?.message}
			</div>
		);
	}

	if (portfolioQ.isLoading || !portfolioQ.data) {
		return <div className="p-6 font-mono text-sm text-ink-4">Loading portfolio…</div>;
	}

	const p = portfolioQ.data;

	return (
		<div className="mx-auto max-w-[1400px] space-y-5 p-4">
			<PageHeader />

			<Header
				portfolio={p}
				onReset={() => {
					if (confirm("Reset account to starting cash? Positions and history stay.")) {
						resetAccount.mutate();
					}
				}}
				resetPending={resetAccount.isPending}
			/>

			<OrderTicket
				onPlaced={() => qc.invalidateQueries({ queryKey: ["paper"] })}
				cashIdr={p.cash_idr}
			/>

			<Section title="Positions" count={p.positions.length}>
				{p.positions.length === 0 ? (
					<EmptyRow>No open positions.</EmptyRow>
				) : (
					<PositionsTable portfolio={p} />
				)}
			</Section>

			<Section title="Open Orders" count={ordersQ.data?.length ?? 0}>
				{!ordersQ.data || ordersQ.data.length === 0 ? (
					<EmptyRow>No open orders.</EmptyRow>
				) : (
					<OrdersTable
						orders={ordersQ.data}
						onCancel={(id) => cancelOrder.mutate(id)}
						cancelPending={cancelOrder.isPending}
						cancellingId={cancelOrder.variables ?? null}
					/>
				)}
			</Section>

			<Section title="Recent Fills">
				{!fillsQ.data || fillsQ.data.length === 0 ? (
					<EmptyRow>No fills yet.</EmptyRow>
				) : (
					<FillsTable
						fills={fillsQ.data}
						onJournal={(fill) => {
							journalFormRef.current?.prefill({
								kind: fill.side === "buy" ? "entry" : "exit",
								order_id: fill.order_id,
								ticker: fill.ticker,
							});
						}}
					/>
				)}
			</Section>

			<JournalSection formRef={journalFormRef} />
		</div>
	);
}

// --- Journal ---

interface JournalFormHandle {
	prefill: (p: { kind: JournalKind; order_id?: number | null; ticker?: string | null }) => void;
}

function JournalSection({ formRef }: { formRef: React.RefObject<JournalFormHandle | null> }) {
	const qc = useQueryClient();
	const entriesQ = useQuery({
		queryKey: ["journal", "entries"],
		queryFn: () => journal.list({ limit: 50 }),
		retry: false,
	});

	const createMut = useMutation({
		mutationFn: (input: Parameters<typeof journal.create>[0]) => journal.create(input),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["journal"] });
		},
	});

	const deleteMut = useMutation({
		mutationFn: (id: string) => journal.remove(id),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["journal"] });
		},
	});

	return (
		<Section title="Journal" count={entriesQ.data?.total}>
			<div className="space-y-4 p-4">
				<JournalForm
					ref={formRef}
					onSubmit={(input) => createMut.mutate(input)}
					pending={createMut.isPending}
					error={createMut.isError ? (createMut.error as Error)?.message : null}
				/>
				{entriesQ.isLoading && (
					<div className="font-mono text-xs text-ink-4">Loading entries…</div>
				)}
				{entriesQ.data && entriesQ.data.items.length === 0 && (
					<EmptyRow>
						No journal entries yet. Log a thesis, post-mortem, or note to build your track record.
					</EmptyRow>
				)}
				<div className="space-y-2">
					{entriesQ.data?.items.map((e) => (
						<JournalRow
							key={e.id}
							entry={e}
							onDelete={() => {
								if (confirm("Delete this entry?")) deleteMut.mutate(e.id);
							}}
							deleting={deleteMut.isPending && deleteMut.variables === e.id}
						/>
					))}
				</div>
			</div>
		</Section>
	);
}

interface JournalFormProps {
	onSubmit: (input: Parameters<typeof journal.create>[0]) => void;
	pending: boolean;
	error: string | null;
}

const JournalForm = forwardRef<JournalFormHandle, JournalFormProps>(function JournalForm(
	{ onSubmit, pending, error },
	ref,
) {
	const [kind, setKind] = useState<JournalKind>("note");
	const [ticker, setTicker] = useState("");
	const [orderId, setOrderId] = useState("");
	const [body, setBody] = useState("");
	const [tags, setTags] = useState("");
	const formEl = useRef<HTMLFormElement | null>(null);

	useImperativeHandle(ref, () => ({
		prefill: (p) => {
			setKind(p.kind);
			setTicker(p.ticker ?? "");
			setOrderId(p.order_id != null ? String(p.order_id) : "");
			formEl.current?.scrollIntoView({ behavior: "smooth", block: "center" });
		},
	}));

	const handle = (e: FormEvent) => {
		e.preventDefault();
		if (!body.trim()) return;
		const parsedOrderId = orderId.trim() ? parseInt(orderId, 10) : null;
		const tagArr = tags
			.split(",")
			.map((t) => t.trim().toLowerCase())
			.filter(Boolean);
		onSubmit({
			kind,
			body_md: body.trim(),
			ticker: ticker.trim() || null,
			order_id: Number.isFinite(parsedOrderId) ? parsedOrderId : null,
			tags: tagArr.length > 0 ? tagArr : undefined,
		});
		setBody("");
		setTags("");
	};

	return (
		<form
			ref={formEl}
			onSubmit={handle}
			className="rounded-xl border border-rule bg-paper-2 p-4"
		>
			<div className="mb-3 flex items-center gap-2">
				<NotebookPen className="h-4 w-4 text-ember-600" />
				<span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember-600">
					New entry
				</span>
			</div>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_120px_120px_1fr]">
				<select
					value={kind}
					onChange={(e) => setKind(e.target.value as JournalKind)}
					className="rounded-md border border-rule bg-card px-2 py-1.5 font-mono text-xs text-ink"
				>
					<option value="note">Note</option>
					<option value="entry">Entry</option>
					<option value="exit">Exit</option>
				</select>
				<input
					value={ticker}
					onChange={(e) => setTicker(e.target.value)}
					placeholder="Ticker (opt)"
					className="rounded-md border border-rule bg-card px-2 py-1.5 font-mono text-xs text-ink uppercase placeholder:text-ink-4"
					maxLength={8}
				/>
				<input
					value={orderId}
					onChange={(e) => setOrderId(e.target.value)}
					placeholder="Order # (opt)"
					inputMode="numeric"
					className="rounded-md border border-rule bg-card px-2 py-1.5 font-mono text-xs text-ink placeholder:text-ink-4"
				/>
				<input
					value={tags}
					onChange={(e) => setTags(e.target.value)}
					placeholder="tags (comma-sep)"
					className="rounded-md border border-rule bg-card px-2 py-1.5 font-mono text-xs text-ink placeholder:text-ink-4"
				/>
			</div>
			<textarea
				value={body}
				onChange={(e) => setBody(e.target.value)}
				placeholder="Thesis, reasoning, or post-mortem in markdown…"
				rows={4}
				className="mt-2 w-full resize-y rounded-md border border-rule bg-card px-3 py-2 font-mono text-[13px] text-ink leading-relaxed placeholder:text-ink-4"
			/>
			<div className="mt-2 flex items-center justify-between gap-3">
				<span className="font-mono text-[10px] text-ink-4">
					Markdown OK. Entry/Exit should reference an order; notes are free-form.
				</span>
				<button
					type="submit"
					disabled={pending || !body.trim()}
					className="rounded-full border border-ember-500 bg-ember-500 px-4 py-1 font-mono text-xs text-paper transition-colors hover:border-ember-600 hover:bg-ember-600 disabled:opacity-40"
				>
					{pending ? "Saving…" : "Log"}
				</button>
			</div>
			{error && <p className="mt-2 font-mono text-[11px] text-neg">{error}</p>}
		</form>
	);
});

function JournalRow({
	entry,
	onDelete,
	deleting,
}: {
	entry: JournalEntry;
	onDelete: () => void;
	deleting: boolean;
}) {
	const kindColor =
		entry.kind === "entry" ? "text-pos" : entry.kind === "exit" ? "text-neg" : "text-ink-3";
	return (
		<div className="rounded-lg border border-rule bg-card p-3">
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2">
					<BookOpen className="h-3.5 w-3.5 text-ink-4" />
					<span
						className={`font-mono text-[10px] uppercase tracking-[0.18em] ${kindColor}`}
					>
						{entry.kind}
					</span>
					{entry.ticker && (
						<span className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-2">
							{entry.ticker}
						</span>
					)}
					{entry.order_id != null && (
						<span className="font-mono text-[10px] text-ink-4">#{entry.order_id}</span>
					)}
					<span className="font-mono text-[10px] text-ink-4">
						{new Date(entry.created_at).toLocaleString("en-GB", {
							day: "2-digit",
							month: "short",
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
				</div>
				<button
					type="button"
					onClick={onDelete}
					disabled={deleting}
					className="text-ink-4 transition-colors hover:text-neg disabled:opacity-40"
					aria-label="Delete entry"
				>
					<Trash2 className="h-3.5 w-3.5" />
				</button>
			</div>
			<div className="mt-2 whitespace-pre-wrap font-mono text-[12px] text-ink-2 leading-relaxed">
				{entry.body_md}
			</div>
			{entry.tags.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-1">
					{entry.tags.map((t) => (
						<span
							key={t}
							className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[9px] text-ink-3"
						>
							#{t}
						</span>
					))}
				</div>
			)}
		</div>
	);
}

function PageHeader() {
	return (
		<div>
			<div className="mb-2 flex items-center gap-3">
				<span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ember-600">
					Paper Trading
				</span>
				<span className="h-px max-w-[80px] flex-1 bg-ember-400/40" />
			</div>
			<h1
				className="text-[clamp(1.8rem,3.5vw,2.25rem)] leading-[1.05] text-ink"
				style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
			>
				Your <em className="text-ember-600">Portfolio</em>
			</h1>
			<p className="mt-2 font-mono text-xs text-ink-4">
				Simulated IDX trading · 15s refresh · Market-hours matching
			</p>
			<div className="mt-3">
				<Link
					to="/portfolio/analytics"
					className="inline-flex items-center gap-2 rounded-full border border-ember-400/40 bg-ember-50 px-3 py-1 font-mono text-[11px] text-ember-700 transition-colors hover:bg-ember-100"
				>
					View performance analytics →
				</Link>
			</div>
		</div>
	);
}

function InitAccount({ onInit, pending }: { onInit: () => void; pending: boolean }) {
	return (
		<div className="mx-auto max-w-lg p-8 text-center">
			<h2
				className="mb-2 text-[clamp(1.5rem,3vw,2rem)] leading-[1.05] text-ink"
				style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
			>
				Open a <em className="text-ember-600">paper account</em>
			</h2>
			<p className="mb-6 font-mono text-sm text-ink-3">
				Start with 100,000,000 IDR paper cash. All trades are simulated against live IDX quotes.
			</p>
			<button
				type="button"
				onClick={onInit}
				disabled={pending}
				className="rounded-full border border-ember-500 bg-ember-500 px-5 py-2 font-mono text-sm text-paper transition-colors hover:bg-ember-600 hover:border-ember-600 disabled:opacity-40"
			>
				{pending ? "Opening…" : "Open account"}
			</button>
		</div>
	);
}

function Header({
	portfolio,
	onReset,
	resetPending,
}: {
	portfolio: PaperPortfolio;
	onReset: () => void;
	resetPending: boolean;
}) {
	const totalPnl = portfolio.total_realized_pnl_idr + portfolio.total_unrealized_pnl_idr;
	return (
		<div className="rounded-[18px] border border-rule bg-card p-5">
			<div className="mb-4 flex items-start justify-between gap-3">
				<div>
					<div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4">
						Total Equity
					</div>
					<div className="mt-1 font-mono text-2xl font-semibold tracking-tight text-ink">
						{fmtIdr(portfolio.total_equity_idr)} IDR
					</div>
				</div>
				<button
					type="button"
					onClick={onReset}
					disabled={resetPending}
					className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-card px-3 py-1 font-mono text-xs text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink disabled:opacity-40"
				>
					<RefreshCw className="h-3 w-3" />
					{resetPending ? "Resetting…" : "Reset"}
				</button>
			</div>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Stat label="Cash" value={`${fmtIdr(portfolio.cash_idr)} IDR`} />
				<Stat
					label="Return"
					value={fmtPct(portfolio.return_pct)}
					tone={portfolio.return_pct >= 0 ? "up" : "down"}
				/>
				<Stat
					label="Realized P&L"
					value={`${fmtIdr(portfolio.total_realized_pnl_idr)} IDR`}
					tone={portfolio.total_realized_pnl_idr >= 0 ? "up" : "down"}
				/>
				<Stat
					label="Unrealized P&L"
					value={`${fmtIdr(portfolio.total_unrealized_pnl_idr)} IDR`}
					tone={portfolio.total_unrealized_pnl_idr >= 0 ? "up" : "down"}
				/>
			</div>
			<div className="mt-3 font-mono text-[11px] text-ink-4">
				Starting cash: {fmtIdr(portfolio.starting_cash_idr)} IDR · Total P&L:{" "}
				<span className={totalPnl >= 0 ? "text-pos" : "text-neg"}>{fmtIdr(totalPnl)} IDR</span>
			</div>
		</div>
	);
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
	const color = tone === "up" ? "text-pos" : tone === "down" ? "text-neg" : "text-ink";
	return (
		<div>
			<div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4">{label}</div>
			<div className={`mt-0.5 font-mono text-sm ${color}`}>{value}</div>
		</div>
	);
}

function Section({
	title,
	count,
	children,
}: {
	title: string;
	count?: number;
	children: React.ReactNode;
}) {
	return (
		<div>
			<div className="mb-2 flex items-baseline gap-2">
				<h3 className="font-mono text-xs uppercase tracking-[0.22em] text-ink">{title}</h3>
				{count !== undefined && (
					<span className="font-mono text-[10px] text-ink-4">· {count}</span>
				)}
			</div>
			<div className="rounded-[18px] border border-rule bg-card">{children}</div>
		</div>
	);
}

function EmptyRow({ children }: { children: React.ReactNode }) {
	return <div className="p-4 font-mono text-xs text-ink-4">{children}</div>;
}

function PositionsTable({ portfolio }: { portfolio: PaperPortfolio }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-xs">
				<thead className="border-b border-rule bg-paper-2 text-ink-4">
					<tr>
						<Th className="text-left">Ticker</Th>
						<Th>Lots</Th>
						<Th>Shares</Th>
						<Th>Avg Cost</Th>
						<Th>Last</Th>
						<Th>Market Value</Th>
						<Th>Unrealized</Th>
						<Th>Realized</Th>
					</tr>
				</thead>
				<tbody>
					{portfolio.positions.map((pos) => {
						const tone = pos.unrealized_pnl_idr >= 0 ? "text-pos" : "text-neg";
						return (
							<tr
								key={pos.ticker}
								className="border-b border-rule/70 transition-colors last:border-b-0 hover:bg-paper-2/60"
							>
								<Td className="text-left font-mono text-ember-600">
									{pos.ticker}
									{pos.price_stale && (
										<span className="ml-1 text-ember-500" title="Stale price">
											*
										</span>
									)}
								</Td>
								<Td>{pos.qty_lots}</Td>
								<Td>{pos.qty_shares.toLocaleString()}</Td>
								<Td>{pos.avg_cost_idr.toLocaleString()}</Td>
								<Td>{pos.current_price_idr.toLocaleString()}</Td>
								<Td>{fmtIdr(pos.market_value_idr)}</Td>
								<Td className={tone}>
									{fmtIdr(pos.unrealized_pnl_idr)}
									<div className="text-[10px] opacity-70">{fmtPct(pos.unrealized_pnl_pct)}</div>
								</Td>
								<Td className={pos.realized_pnl_idr >= 0 ? "text-pos" : "text-neg"}>
									{fmtIdr(pos.realized_pnl_idr)}
								</Td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function OrdersTable({
	orders,
	onCancel,
	cancelPending,
	cancellingId,
}: {
	orders: PaperOrder[];
	onCancel: (id: number) => void;
	cancelPending: boolean;
	cancellingId: number | null;
}) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-xs">
				<thead className="border-b border-rule bg-paper-2 text-ink-4">
					<tr>
						<Th className="text-left">Ticker</Th>
						<Th>Side</Th>
						<Th>Type</Th>
						<Th>Lots</Th>
						<Th>Limit</Th>
						<Th>Placed</Th>
						<Th />
					</tr>
				</thead>
				<tbody>
					{orders.map((o) => (
						<tr
							key={o.id}
							className="border-b border-rule/70 transition-colors last:border-b-0 hover:bg-paper-2/60"
						>
							<Td className="text-left font-mono text-ember-600">{o.ticker}</Td>
							<Td className={o.side === "buy" ? "text-pos" : "text-neg"}>
								{o.side.toUpperCase()}
							</Td>
							<Td>{o.order_type}</Td>
							<Td>{o.qty_lots}</Td>
							<Td>{o.limit_price_idr ? o.limit_price_idr.toLocaleString() : "—"}</Td>
							<Td className="text-ink-4">
								{new Date(o.placed_at).toLocaleString("en-GB", { hour12: false })}
							</Td>
							<Td>
								<button
									type="button"
									onClick={() => onCancel(o.id)}
									disabled={cancelPending && cancellingId === o.id}
									className="inline-flex items-center gap-1 rounded-full border border-rule px-2 py-0.5 font-mono text-[11px] text-ink-3 transition-colors hover:border-neg/30 hover:bg-neg/10 hover:text-neg disabled:opacity-40"
								>
									<X className="h-3 w-3" />
									{cancelPending && cancellingId === o.id ? "…" : "Cancel"}
								</button>
							</Td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

interface FillRow {
	id: number;
	order_id: number;
	ticker: string;
	side: string;
	qty_lots: number;
	price_idr: number;
	fee_idr: number;
	filled_at: string;
}

function FillsTable({
	fills,
	onJournal,
}: {
	fills: FillRow[];
	onJournal?: (fill: FillRow) => void;
}) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-xs">
				<thead className="border-b border-rule bg-paper-2 text-ink-4">
					<tr>
						<Th className="text-left">Time</Th>
						<Th>Ticker</Th>
						<Th>Side</Th>
						<Th>Lots</Th>
						<Th>Price</Th>
						<Th>Fee</Th>
						{onJournal && <Th>Journal</Th>}
					</tr>
				</thead>
				<tbody>
					{fills.map((f) => (
						<tr
							key={f.id}
							className="border-b border-rule/70 transition-colors last:border-b-0 hover:bg-paper-2/60"
						>
							<Td className="text-left font-mono text-ink-3">
								{new Date(f.filled_at).toLocaleString("en-GB", { hour12: false })}
							</Td>
							<Td className="font-mono text-ember-600">{f.ticker}</Td>
							<Td className={f.side === "buy" ? "text-pos" : "text-neg"}>
								{f.side.toUpperCase()}
							</Td>
							<Td>{f.qty_lots}</Td>
							<Td>{f.price_idr.toLocaleString()}</Td>
							<Td>{f.fee_idr.toLocaleString()}</Td>
							{onJournal && (
								<Td>
									<button
										type="button"
										onClick={() => onJournal(f)}
										className="inline-flex items-center gap-1 rounded-full border border-rule px-2 py-0.5 text-[10px] text-ink-3 transition-colors hover:border-ember-500 hover:text-ember-600"
									>
										<NotebookPen className="h-3 w-3" />
										Log
									</button>
								</Td>
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function Th({
	children,
	className = "text-right",
}: {
	children?: React.ReactNode;
	className?: string;
}) {
	return (
		<th className={`px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] ${className}`}>
			{children}
		</th>
	);
}

function Td({
	children,
	className = "text-right",
}: {
	children?: React.ReactNode;
	className?: string;
}) {
	return <td className={`px-3 py-2 font-mono text-ink-2 ${className}`}>{children}</td>;
}

function OrderTicket({ onPlaced, cashIdr }: { onPlaced: () => void; cashIdr: number }) {
	const [ticker, setTicker] = useState("");
	const [side, setSide] = useState<OrderSide>("buy");
	const [orderType, setOrderType] = useState<OrderType>("market");
	const [qtyLots, setQtyLots] = useState("1");
	const [limitPrice, setLimitPrice] = useState("");
	const [flash, setFlash] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

	const placeOrder = useMutation({
		mutationFn: () =>
			api.paperPlaceOrder({
				ticker: ticker.toUpperCase().trim(),
				side,
				order_type: orderType,
				qty_lots: Number(qtyLots),
				limit_price_idr: orderType === "limit" ? Number(limitPrice) : undefined,
			}),
		onSuccess: (o) => {
			setFlash({
				kind: "ok",
				text: `${o.side.toUpperCase()} ${o.qty_lots} lot ${o.ticker} · ${o.status}`,
			});
			setQtyLots("1");
			setLimitPrice("");
			onPlaced();
		},
		onError: (e: ApiError) => {
			setFlash({ kind: "err", text: e.message });
		},
	});

	function onSubmit(e: FormEvent) {
		e.preventDefault();
		setFlash(null);
		if (!ticker.trim() || !qtyLots || Number(qtyLots) < 1) return;
		if (orderType === "limit" && (!limitPrice || Number(limitPrice) <= 0)) return;
		placeOrder.mutate();
	}

	const inputClass =
		"rounded-full border border-rule bg-card px-3 py-1.5 font-mono text-sm text-ink placeholder:text-ink-4 focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/15";

	return (
		<form onSubmit={onSubmit} className="rounded-[18px] border border-rule bg-card p-4">
			<div className="mb-3 flex items-baseline justify-between">
				<h3 className="font-mono text-xs uppercase tracking-[0.22em] text-ink">Order Ticket</h3>
				<span className="font-mono text-[10px] text-ink-4">Cash {fmtIdr(cashIdr)} IDR</span>
			</div>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
				<input
					type="text"
					value={ticker}
					onChange={(e) => setTicker(e.target.value.toUpperCase())}
					placeholder="BBCA"
					className={`col-span-2 uppercase ${inputClass}`}
					required
				/>
				<select
					value={side}
					onChange={(e) => setSide(e.target.value as OrderSide)}
					className={inputClass}
				>
					<option value="buy">BUY</option>
					<option value="sell">SELL</option>
				</select>
				<select
					value={orderType}
					onChange={(e) => setOrderType(e.target.value as OrderType)}
					className={inputClass}
				>
					<option value="market">Market</option>
					<option value="limit">Limit</option>
				</select>
				<input
					type="number"
					min="1"
					value={qtyLots}
					onChange={(e) => setQtyLots(e.target.value)}
					placeholder="Lots"
					className={inputClass}
					required
				/>
				<input
					type="number"
					min="0"
					step="1"
					value={limitPrice}
					onChange={(e) => setLimitPrice(e.target.value)}
					placeholder="Limit IDR"
					disabled={orderType !== "limit"}
					className={`${inputClass} disabled:opacity-40`}
				/>
			</div>
			<div className="mt-3 flex items-center gap-3">
				<button
					type="submit"
					disabled={placeOrder.isPending}
					className={`rounded-full px-4 py-1.5 font-mono text-sm font-medium text-paper transition-colors disabled:opacity-40 ${
						side === "buy" ? "bg-pos hover:bg-pos/90" : "bg-neg hover:bg-neg/90"
					}`}
				>
					{placeOrder.isPending
						? "Placing…"
						: `${side.toUpperCase()} ${qtyLots || "?"} lot ${ticker || "?"}`}
				</button>
				{flash && (
					<span className={`font-mono text-xs ${flash.kind === "ok" ? "text-pos" : "text-neg"}`}>
						{flash.text}
					</span>
				)}
			</div>
			<p className="mt-2 font-mono text-[10px] text-ink-4">
				1 lot = 100 shares · Fees: 0.15% buy / 0.25% sell + 3% VAT · Paper trading only.
			</p>
		</form>
	);
}
