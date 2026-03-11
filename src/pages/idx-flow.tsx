import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { BrokerFlowDashboard } from "../components/idx/broker-flow-dashboard";
import { FlowMFIChart } from "../components/idx/flow-mfi-chart";
import { FlowPriceChart } from "../components/idx/flow-price-chart";
import { FlowRSIChart } from "../components/idx/flow-rsi-chart";
import { FlowVerdictPanel } from "../components/idx/flow-verdict";
import { IdxNav } from "../components/idx/idx-nav";
import { SectorHeatmap } from "../components/idx/sector-heatmap";
import { Skeleton } from "../components/ui/loading";
import { useIdxBrokerFlow } from "../hooks/use-broker-flow";
import { useFlowAnalysis } from "../hooks/use-flow-analysis";
import { useSectorPerformance } from "../hooks/use-sector-performance";
import { usePageTitle } from "../hooks/use-page-title";
import { useSearch } from "../hooks/use-search";

export function IdxFlowPage() {
	usePageTitle("Flow Analysis");
	const [kode, setKode] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [showDropdown, setShowDropdown] = useState(true);
	const searchRef = useRef<HTMLDivElement>(null);

	// Close dropdown on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
				setShowDropdown(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const search = useSearch(searchQuery);
	const flow = useFlowAnalysis(kode);
	const sectorPerf = useSectorPerformance();
	const brokerFlow = useIdxBrokerFlow({ limit: 20 });

	// Filter search results to IDX stocks
	const searchResults = (search.data?.results ?? []).filter(
		(r) => r.symbol.endsWith(".JK") || r.exchange === "JKT",
	);

	const handleSelect = (symbol: string) => {
		const code = symbol.replace(".JK", "");
		setKode(code);
		setSearchQuery("");
	};

	return (
		<div className="mx-auto max-w-[1600px] p-4">
			<IdxNav />

			<div className="mb-6">
				<h1 className="font-mono text-lg font-semibold tracking-wide text-white">
					Flow Analysis
				</h1>
				<p className="mt-1 text-sm text-t-text-secondary">
					Wyckoff phases, MFI, and market flow for IDX stocks.
				</p>
			</div>

			{/* Stock Analysis Section */}
			<section className="mb-8">
				{/* Search */}
				<div className="relative mb-4" ref={searchRef}>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => {
							setSearchQuery(e.target.value);
							setShowDropdown(true);
						}}
						onFocus={() => setShowDropdown(true)}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								setShowDropdown(false);
								(e.target as HTMLInputElement).blur();
							}
						}}
						placeholder="Search IDX ticker (e.g. BBCA, TLKM, ASII)..."
						className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 font-mono text-sm text-white placeholder-t-text-muted outline-none transition-colors focus:border-t-amber/50 sm:max-w-md"
					/>
					{showDropdown && searchQuery.length >= 2 && searchResults.length > 0 && (
						<div className="absolute left-0 top-full z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-white/10 bg-[#0a0a0a] shadow-xl sm:max-w-md">
							{searchResults.slice(0, 10).map((result) => (
								<button
									key={result.symbol}
									type="button"
									onClick={() => handleSelect(result.symbol)}
									className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/[0.06]"
								>
									<span className="font-mono text-xs font-medium text-t-green">
										{result.symbol.replace(".JK", "")}
									</span>
									<span className="truncate font-mono text-xs text-t-text-secondary">
										{result.name}
									</span>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Analysis content */}
				{kode ? (
					flow.isLoading ? (
						<div className="grid gap-4 lg:grid-cols-[1fr_380px]">
							<div>
								<Skeleton className="mb-2 h-[400px] w-full rounded-lg" />
								<Skeleton className="h-[150px] w-full rounded-lg" />
							</div>
							<Skeleton className="h-[400px] w-full rounded-lg" />
						</div>
					) : flow.error ? (
						<div className="rounded-lg border border-dashed border-t-border p-8 text-center">
							<p className="font-mono text-sm text-t-text-muted">
								Failed to load data for {kode}
							</p>
							<p className="mt-1 font-mono text-xs text-t-text-muted">
								{flow.error.message}
							</p>
						</div>
					) : flow.history.length === 0 ? (
						<div className="rounded-lg border border-dashed border-t-border p-8 text-center">
							<p className="font-mono text-sm text-t-text-muted">
								No price history available for {kode}
							</p>
						</div>
					) : (
						<div className="grid gap-4 lg:grid-cols-[1fr_380px]">
							{/* Charts */}
							<div className="min-w-0">
								<div className="mb-2 flex items-center gap-3">
									<span className="font-mono text-sm font-medium text-white">
										{kode}
									</span>
									{flow.quote && (
										<span
											className={`font-mono text-sm ${
												flow.quote.change >= 0 ? "text-t-green" : "text-t-red"
											}`}
										>
											{flow.quote.price.toLocaleString()} (
											{flow.quote.change_percent >= 0 ? "+" : ""}
											{flow.quote.change_percent.toFixed(2)}%)
										</span>
									)}
								</div>
								<div className="rounded-lg border border-t-border bg-white/[0.01] p-1">
									<FlowPriceChart
										data={flow.history}
										wyckoff={flow.wyckoff}
										height={380}
									/>
								</div>
								<div className="mt-2 grid gap-2 sm:grid-cols-2">
									<div className="rounded-lg border border-t-border bg-white/[0.01] p-1">
										<FlowMFIChart mfi={flow.mfi} height={120} />
									</div>
									<div className="rounded-lg border border-t-border bg-white/[0.01] p-1">
										<FlowRSIChart rsi={flow.rsi} height={120} />
									</div>
								</div>

								{/* Divergence alerts */}
								{flow.divergences.divergences.length > 0 && (
									<div className="mt-3 space-y-1.5">
										{flow.divergences.divergences.map((div) => (
											<div
												key={`${div.indicator}-${div.type}`}
												className={clsx(
													"flex items-start gap-2 rounded-lg border px-3 py-2",
													div.type === "bullish"
														? "border-t-green/20 bg-t-green/5"
														: "border-t-red/20 bg-t-red/5",
												)}
											>
												<span
													className={clsx(
														"mt-0.5 font-mono text-xs font-bold",
														div.type === "bullish" ? "text-t-green" : "text-t-red",
													)}
												>
													{div.type === "bullish" ? "▲" : "▼"}
												</span>
												<div>
													<span className="font-mono text-[11px] font-medium text-white">
														{div.type === "bullish" ? "Bullish" : "Bearish"} Divergence ({div.indicator})
													</span>
													<p className="mt-0.5 font-mono text-[10px] text-t-text-muted">
														{div.description}
													</p>
												</div>
											</div>
										))}
									</div>
								)}

								{/* Wyckoff phase table */}
								{flow.wyckoff.phases.length > 0 && (
									<div className="mt-3 overflow-x-auto rounded-lg border border-t-border">
										<table className="w-full text-xs">
											<thead>
												<tr className="border-b border-white/10 bg-white/[0.02]">
													<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
														Phase
													</th>
													<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
														Period
													</th>
													<th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
														Days
													</th>
													<th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
														Change
													</th>
													<th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
														Confidence
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-white/5">
												{flow.wyckoff.phases.map((seg, i) => {
													const days = seg.endIndex - seg.startIndex + 1;
													const isCurrent = i === flow.wyckoff.phases.length - 1;
													return (
														<tr
															key={seg.startDate}
															className={
																isCurrent ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
															}
														>
															<td className="whitespace-nowrap px-3 py-2">
																<span
																	className={`inline-block rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase ${phaseStyle(seg.phase)}`}
																>
																	{seg.phase}
																</span>
															</td>
															<td className="whitespace-nowrap px-3 py-2 font-mono text-t-text-secondary">
																{formatShortDate(seg.startDate)} — {formatShortDate(seg.endDate)}
															</td>
															<td className="whitespace-nowrap px-3 py-2 text-right font-mono text-t-text-muted">
																{days}
															</td>
															<td
																className={`whitespace-nowrap px-3 py-2 text-right font-mono ${
																	seg.priceChange >= 0 ? "text-t-green" : "text-t-red"
																}`}
															>
																{seg.priceChange >= 0 ? "+" : ""}
																{seg.priceChange.toFixed(1)}%
															</td>
															<td className="whitespace-nowrap px-3 py-2 text-right font-mono text-t-text-secondary">
																{Math.round(seg.confidence * 100)}%
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								)}
							</div>

							{/* Verdict panel */}
							<div className="min-w-0">
								{flow.verdict && (
									<FlowVerdictPanel verdict={flow.verdict} symbol={kode} />
								)}
							</div>
						</div>
					)
				) : (
					<div className="rounded-lg border border-dashed border-t-border p-12 text-center">
						<p className="font-mono text-sm text-t-text-muted">
							Search for an IDX stock to begin analysis
						</p>
						<p className="mt-2 font-mono text-xs text-t-text-muted">
							Try BBCA, BBRI, TLKM, ASII, BMRI
						</p>
					</div>
				)}
			</section>

			{/* Market Flow Section */}
			<section>
				<h2 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-t-text-muted">
					Market Flow
				</h2>
				<div className="grid gap-4 lg:grid-cols-2">
					{/* Sector heatmap */}
					<div>
						{sectorPerf.isLoading ? (
							<Skeleton className="h-[380px] w-full rounded-lg" />
						) : sectorPerf.error || !sectorPerf.data ? (
							<div className="flex h-[380px] items-center justify-center rounded-lg border border-dashed border-t-border">
								<p className="font-mono text-xs text-t-text-muted">
									Sector performance unavailable
								</p>
							</div>
						) : (
							<SectorHeatmap sectors={sectorPerf.data.sectors ?? []} />
						)}
					</div>

					{/* Broker flow */}
					<div>
						{brokerFlow.isLoading ? (
							<Skeleton className="h-[380px] w-full rounded-lg" />
						) : brokerFlow.error || !brokerFlow.data ? (
							<div className="flex h-[380px] items-center justify-center rounded-lg border border-dashed border-t-border">
								<p className="font-mono text-xs text-t-text-muted">
									Broker flow data unavailable
								</p>
							</div>
						) : (
							<BrokerFlowDashboard data={brokerFlow.data} />
						)}
					</div>
				</div>
			</section>
		</div>
	);
}

function phaseStyle(phase: string): string {
	switch (phase) {
		case "accumulation":
			return "bg-blue-500/20 text-blue-400";
		case "markup":
			return "bg-green-500/20 text-green-400";
		case "distribution":
			return "bg-amber-500/20 text-amber-400";
		case "markdown":
			return "bg-red-500/20 text-red-400";
		default:
			return "bg-white/10 text-t-text-muted";
	}
}

function formatShortDate(dateStr: string): string {
	const d = new Date(dateStr);
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
