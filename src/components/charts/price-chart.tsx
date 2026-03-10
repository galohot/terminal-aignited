import {
	CandlestickSeries,
	type CandlestickSeriesOptions,
	createChart,
	type DeepPartial,
	HistogramSeries,
	type HistogramSeriesOptions,
	type IChartApi,
	type ISeriesApi,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { PriceData } from "../../stores/realtime-store";
import type { HistoryPoint } from "../../types/market";

interface PriceChartProps {
	data: HistoryPoint[];
	height?: number;
	realtimePrice?: PriceData;
}

export function PriceChart({ data, height = 400, realtimePrice }: PriceChartProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);
	const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
	const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

	// Create chart and set historical data
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
		candleSeriesRef.current = candleSeries;

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
		volumeSeriesRef.current = volumeSeries;

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
			candleSeriesRef.current = null;
			volumeSeriesRef.current = null;
		};
	}, [data, height]);

	// Update the last candle with realtime price
	useEffect(() => {
		if (!realtimePrice || !candleSeriesRef.current || !volumeSeriesRef.current || data.length === 0)
			return;

		const lastPoint = data[data.length - 1];
		const time = lastPoint.date as string;

		candleSeriesRef.current.update({
			time,
			open: lastPoint.open,
			high: Math.max(lastPoint.high, realtimePrice.price),
			low: Math.min(lastPoint.low, realtimePrice.price),
			close: realtimePrice.price,
		});

		const isUp = realtimePrice.price >= lastPoint.open;
		volumeSeriesRef.current.update({
			time,
			value: realtimePrice.volume || lastPoint.volume,
			color: isUp ? "#22c55e40" : "#ef444440",
		});
	}, [realtimePrice, data]);

	return <div ref={containerRef} style={{ height }} className="w-full" />;
}
