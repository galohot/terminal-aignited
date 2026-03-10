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

interface PriceChartProps {
	data: HistoryPoint[];
	height?: number;
}

export function PriceChart({ data, height = 400 }: PriceChartProps) {
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

		const volumeOpts: DeepPartial<HistogramSeriesOptions> = {
			priceFormat: { type: "volume" },
			priceScaleId: "volume",
		};
		const volumeSeries = chart.addSeries(HistogramSeries, volumeOpts);
		chart.priceScale("volume").applyOptions({
			scaleMargins: { top: 0.8, bottom: 0 },
		});
		volumeSeries.setData(
			data.map((d) => ({
				time: d.date as string,
				value: d.volume,
				color: d.close >= d.open ? "#22c55e40" : "#ef444440",
			})),
		);

		chart.timeScale().fitContent();

		const handleResize = () => {
			chart.applyOptions({ width: container.clientWidth });
		};
		const observer = new ResizeObserver(handleResize);
		observer.observe(container);

		return () => {
			observer.disconnect();
			chart.remove();
			chartRef.current = null;
		};
	}, [data, height]);

	return <div ref={containerRef} style={{ height }} className="w-full" />;
}
