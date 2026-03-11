import {
	CandlestickSeries,
	type CandlestickSeriesOptions,
	createChart,
	type DeepPartial,
	HistogramSeries,
	type HistogramSeriesOptions,
	type IChartApi,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { HistoryPoint } from "../../types/market";
import type { WyckoffAnalysis } from "../../types/flow";

const PHASE_COLORS: Record<string, string> = {
	accumulation: "#3b82f6", // blue
	markup: "#22c55e",       // green
	distribution: "#f59e0b", // amber
	markdown: "#ef4444",     // red
};

interface FlowPriceChartProps {
	data: HistoryPoint[];
	wyckoff: WyckoffAnalysis;
	height?: number;
}

export function FlowPriceChart({ data, wyckoff, height = 400 }: FlowPriceChartProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container || data.length === 0) return;

		const chart = createChart(container, {
			width: container.clientWidth,
			height,
			layout: {
				background: { color: "#0a0a0a" },
				textColor: "#a3a3a3",
				fontFamily: "'JetBrains Mono', monospace",
				fontSize: 11,
			},
			grid: {
				vertLines: { color: "#1a1a1a" },
				horzLines: { color: "#1a1a1a" },
			},
			crosshair: { mode: 0 },
			rightPriceScale: { borderColor: "#262626" },
			timeScale: { borderColor: "#262626" },
		});
		chartRef.current = chart;

		// Candlestick series
		const candleOpts: DeepPartial<CandlestickSeriesOptions> = {
			upColor: "#22c55e",
			downColor: "#ef4444",
			borderVisible: false,
			wickUpColor: "#22c55e",
			wickDownColor: "#ef4444",
		};
		const candleSeries = chart.addSeries(CandlestickSeries, candleOpts);
		candleSeries.setData(
			data.map((d) => ({
				time: d.date as string,
				open: d.open,
				high: d.high,
				low: d.low,
				close: d.close,
			})),
		);

		// Volume series — colored by Wyckoff phase
		const phaseMap = new Map<number, string>();
		for (const seg of wyckoff.phases) {
			for (let i = seg.startIndex; i <= seg.endIndex && i < data.length; i++) {
				phaseMap.set(i, seg.phase);
			}
		}

		const volumeOpts: DeepPartial<HistogramSeriesOptions> = {
			priceFormat: { type: "volume" },
			priceScaleId: "volume",
		};
		const volumeSeries = chart.addSeries(HistogramSeries, volumeOpts);
		chart.priceScale("volume").applyOptions({
			scaleMargins: { top: 0.8, bottom: 0 },
		});
		volumeSeries.setData(
			data.map((d, i) => {
				const phase = phaseMap.get(i);
				const baseColor = phase ? PHASE_COLORS[phase] : (d.close >= d.open ? "#22c55e" : "#ef4444");
				return {
					time: d.date as string,
					value: d.volume,
					color: baseColor + "50", // 30% opacity
				};
			}),
		);

		// Add phase transition price lines on the candle series
		for (const seg of wyckoff.phases) {
			if (seg.startIndex > 0 && seg.startIndex < data.length) {
				candleSeries.createPriceLine({
					price: data[seg.startIndex].close,
					color: (PHASE_COLORS[seg.phase] ?? "#6b7280") + "60",
					lineWidth: 1,
					lineStyle: 2,
					axisLabelVisible: false,
					title: seg.phase.slice(0, 3).toUpperCase(),
				});
			}
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
	}, [data, wyckoff, height]);

	return <div ref={containerRef} style={{ height }} className="w-full" />;
}
