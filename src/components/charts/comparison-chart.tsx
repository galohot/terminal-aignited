import { createChart, type IChartApi, LineSeries } from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { HistoryPoint } from "../../types/market";

const COLORS = ["#17a568", "#1d5fc9", "#ff8a2a", "#d2344a", "#ffb020", "#0e3f90"];

interface ComparisonChartProps {
	datasets: { symbol: string; data: HistoryPoint[] }[];
	height?: number;
}

function normalizeToPercent(data: HistoryPoint[]): { time: string; value: number }[] {
	if (data.length === 0) return [];
	const base = data[0].close;
	if (base === 0) return [];
	return data.map((d) => ({
		time: d.date,
		value: ((d.close - base) / base) * 100,
	}));
}

export function ComparisonChart({ datasets, height = 400 }: ComparisonChartProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container || datasets.length === 0) return;

		const chart = createChart(container, {
			width: container.clientWidth,
			height,
			layout: {
				background: { color: "#ffffff" },
				textColor: "#55598a",
				fontFamily: "'JetBrains Mono', monospace",
				fontSize: 11,
			},
			grid: {
				vertLines: { color: "#f2ede4" },
				horzLines: { color: "#f2ede4" },
			},
			crosshair: { mode: 0 },
			rightPriceScale: {
				borderColor: "#e7e0d2",
			},
			timeScale: { borderColor: "#e7e0d2" },
		});
		chartRef.current = chart;

		for (let i = 0; i < datasets.length; i++) {
			const { data } = datasets[i];
			const normalized = normalizeToPercent(data);
			if (normalized.length === 0) continue;

			const series = chart.addSeries(LineSeries, {
				color: COLORS[i % COLORS.length],
				lineWidth: 2,
				priceFormat: {
					type: "custom",
					formatter: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
				},
			});
			series.setData(normalized);
		}

		chart.timeScale().fitContent();

		const observer = new ResizeObserver(() => {
			chart.applyOptions({ width: container.clientWidth });
		});
		observer.observe(container);

		return () => {
			observer.disconnect();
			chart.remove();
			chartRef.current = null;
		};
	}, [datasets, height]);

	return (
		<div className="h-full rounded-[18px] border border-rule bg-card">
			<div ref={containerRef} style={{ height }} className="w-full rounded-[18px]" />
			{datasets.length > 1 && (
				<div className="flex flex-wrap items-center gap-2 border-t border-rule px-4 py-3">
					{datasets.map((ds, i) => (
						<span
							key={ds.symbol}
							className="flex items-center gap-1.5 rounded-full border border-rule bg-paper-2 px-2.5 py-1 font-mono text-xs text-ink-2"
						>
							<span
								className="inline-block h-2 w-2 rounded-full"
								style={{ backgroundColor: COLORS[i % COLORS.length] }}
							/>
							{ds.symbol}
						</span>
					))}
				</div>
			)}
		</div>
	);
}
