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
import { usePageTitle } from "../hooks/use-page-title";
import { useSearch } from "../hooks/use-search";
import { useSectorPerformance } from "../hooks/use-sector-performance";

export function IdxFlowPage() {
	usePageTitle("Flow Analysis");
	const [kode, setKode] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [showDropdown, setShowDropdown] = useState(true);
	const searchRef = useRef<HTMLDivElement>(null);

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
				<h1
					className="text-[clamp(2rem,4vw,2.5rem)] leading-[1.05] text-ink"
					style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.015em" }}
				>
					Flow <em className="text-ember-600">Analysis</em>
				</h1>
				<p className="mt-2 max-w-2xl text-sm text-ink-3">
					Wyckoff phases, MFI, and market flow for IDX stocks.
				</p>
			</div>

			{/* Stock Analysis Section */}
			<section className="mb-8">
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
						className="w-full rounded-lg border border-rule bg-card px-4 py-2.5 font-mono text-sm text-ink placeholder-ink-4 outline-none transition-colors focus:border-ember-500 focus:ring-2 focus:ring-ember-500/15 sm:max-w-md"
					/>
					{showDropdown && searchQuery.length >= 2 && searchResults.length > 0 && (
						<div className="absolute left-0 top-full z-20 mt-1 max-h-60 w-full overflow-auto rounded-[12px] border border-rule bg-card shadow-[0_10px_30px_rgba(20,23,53,0.12)] sm:max-w-md">
							{searchResults.slice(0, 10).map((result) => (
								<button
									key={result.symbol}
									type="button"
									onClick={() => handleSelect(result.symbol)}
									className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-paper-2"
								>
									<span className="font-mono text-xs font-semibold text-ember-600">
										{result.symbol.replace(".JK", "")}
									</span>
									<span className="truncate font-mono text-xs text-ink-2">{result.name}</span>
								</button>
							))}
						</div>
					)}
				</div>

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
						<div className="rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-8 text-center">
							<p className="font-mono text-sm text-ink-4">Failed to load data for {kode}</p>
							<p className="mt-1 font-mono text-xs text-ink-4">{flow.error.message}</p>
						</div>
					) : flow.history.length === 0 ? (
						<div className="rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-8 text-center">
							<p className="font-mono text-sm text-ink-4">
								No price history available for {kode}
							</p>
						</div>
					) : (
						<div className="grid gap-4 lg:grid-cols-[1fr_380px]">
							{/* Charts */}
							<div className="min-w-0">
								<div className="mb-2 flex items-center gap-3">
									<span className="font-mono text-sm font-semibold text-ink">{kode}</span>
									{flow.quote && (
										<span
											className={`font-mono text-sm ${
												flow.quote.change >= 0 ? "text-pos" : "text-neg"
											}`}
										>
											{flow.quote.price.toLocaleString()} (
											{flow.quote.change_percent >= 0 ? "+" : ""}
											{flow.quote.change_percent.toFixed(2)}%)
										</span>
									)}
								</div>
								<div className="rounded-[18px] border border-rule bg-card p-1">
									<FlowPriceChart data={flow.history} wyckoff={flow.wyckoff} height={380} />
								</div>
								<div className="mt-2 grid gap-2 sm:grid-cols-2">
									<div className="rounded-[18px] border border-rule bg-card p-1">
										<FlowMFIChart mfi={flow.mfi} height={120} />
									</div>
									<div className="rounded-[18px] border border-rule bg-card p-1">
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
													"flex items-start gap-2 rounded-[12px] border px-3 py-2",
													div.type === "bullish"
														? "border-pos/25 bg-pos/[0.05]"
														: "border-neg/25 bg-neg/[0.05]",
												)}
											>
												<span
													className={clsx(
														"mt-0.5 font-mono text-xs font-bold",
														div.type === "bullish" ? "text-pos" : "text-neg",
													)}
												>
													{div.type === "bullish" ? "▲" : "▼"}
												</span>
												<div>
													<span className="font-mono text-[11px] font-semibold text-ink">
														{div.type === "bullish" ? "Bullish" : "Bearish"} Divergence (
														{div.indicator})
													</span>
													<p className="mt-0.5 font-mono text-[10px] text-ink-4">
														{div.description}
													</p>
												</div>
											</div>
										))}
									</div>
								)}

								{/* Wyckoff phase table */}
								{flow.wyckoff.phases.length > 0 && (
									<div className="mt-3 overflow-x-auto rounded-[18px] border border-rule bg-card">
										<table className="w-full text-xs">
											<thead>
												<tr className="border-b border-rule bg-paper-2">
													<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-ink-4">
														Phase
													</th>
													<th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-ink-4">
														Period
													</th>
													<th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-ink-4">
														Days
													</th>
													<th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-ink-4">
														Change
													</th>
													<th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-ink-4">
														Confidence
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-rule">
												{flow.wyckoff.phases.map((seg, i) => {
													const days = seg.endIndex - seg.startIndex + 1;
													const isCurrent = i === flow.wyckoff.phases.length - 1;
													return (
														<tr
															key={seg.startDate}
															className={isCurrent ? "bg-paper-2" : "hover:bg-paper-2/60"}
														>
															<td className="whitespace-nowrap px-3 py-2">
																<span
																	className={`inline-block rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase ${phaseStyle(seg.phase)}`}
																>
																	{seg.phase}
																</span>
															</td>
															<td className="whitespace-nowrap px-3 py-2 font-mono text-ink-2">
																{formatShortDate(seg.startDate)} — {formatShortDate(seg.endDate)}
															</td>
															<td className="whitespace-nowrap px-3 py-2 text-right font-mono text-ink-4">
																{days}
															</td>
															<td
																className={`whitespace-nowrap px-3 py-2 text-right font-mono ${
																	seg.priceChange >= 0 ? "text-pos" : "text-neg"
																}`}
															>
																{seg.priceChange >= 0 ? "+" : ""}
																{seg.priceChange.toFixed(1)}%
															</td>
															<td className="whitespace-nowrap px-3 py-2 text-right font-mono text-ink-2">
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
								{flow.verdict && <FlowVerdictPanel verdict={flow.verdict} symbol={kode} />}
							</div>
						</div>
					)
				) : (
					<div className="rounded-[18px] border border-dashed border-rule bg-paper-2/60 p-12 text-center">
						<p className="font-mono text-sm text-ink-4">
							Search for an IDX stock to begin analysis
						</p>
						<p className="mt-2 font-mono text-xs text-ink-4">Try BBCA, BBRI, TLKM, ASII, BMRI</p>
					</div>
				)}
			</section>

			{/* Market Flow Section */}
			<section>
				<h2 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-ink-4">
					Market Flow
				</h2>
				<div className="grid gap-4 lg:grid-cols-2">
					<div>
						{sectorPerf.isLoading ? (
							<Skeleton className="h-[380px] w-full rounded-lg" />
						) : sectorPerf.error || !sectorPerf.data ? (
							<div className="flex h-[380px] items-center justify-center rounded-[18px] border border-dashed border-rule bg-paper-2/60">
								<p className="font-mono text-xs text-ink-4">Sector performance unavailable</p>
							</div>
						) : (
							<SectorHeatmap sectors={sectorPerf.data.sectors ?? []} />
						)}
					</div>

					<div>
						{brokerFlow.isLoading ? (
							<Skeleton className="h-[380px] w-full rounded-lg" />
						) : brokerFlow.error || !brokerFlow.data ? (
							<div className="flex h-[380px] items-center justify-center rounded-[18px] border border-dashed border-rule bg-paper-2/60">
								<p className="font-mono text-xs text-ink-4">Broker flow data unavailable</p>
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
			return "bg-cyan-100 text-cyan-800";
		case "markup":
			return "bg-pos/15 text-pos";
		case "distribution":
			return "bg-ember-500/15 text-ember-700";
		case "markdown":
			return "bg-neg/15 text-neg";
		default:
			return "bg-paper-2 text-ink-4";
	}
}

function formatShortDate(dateStr: string): string {
	const d = new Date(dateStr);
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
