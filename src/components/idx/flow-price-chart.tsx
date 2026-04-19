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
import type { WyckoffAnalysis } from "../../types/flow";
import type { HistoryPoint } from "../../types/market";

const PHASE_COLORS: Record<string, string> = {
	accumulation: "#1d5fc9",
	markup: "#17a568",
	distribution: "#ff8a2a",
	markdown: "#d2344a",
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
			rightPriceScale: { borderColor: "#e7e0d2" },
			timeScale: { borderColor: "#e7e0d2" },
		});
		chartRef.current = chart;

		// Candlestick series
		const candleOpts: DeepPartial<CandlestickSeriesOptions> = {
			upColor: "#17a568",
			downColor: "#d2344a",
			borderVisible: false,
			wickUpColor: "#17a568",
			wickDownColor: "#d2344a",
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
				const baseColor = phase ? PHASE_COLORS[phase] : d.close >= d.open ? "#17a568" : "#d2344a";
				return {
					time: d.date as string,
					value: d.volume,
					color: baseColor + "50",
				};
			}),
		);

		// Add phase transition price lines on the candle series
		for (const seg of wyckoff.phases) {
			if (seg.startIndex > 0 && seg.startIndex < data.length) {
				candleSeries.createPriceLine({
					price: data[seg.startIndex].close,
					color: (PHASE_COLORS[seg.phase] ?? "#8b8fb0") + "60",
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
