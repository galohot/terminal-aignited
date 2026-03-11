import {
	type IChartApi,
	LineSeries,
	type LineSeriesOptions,
	createChart,
	type DeepPartial,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { MFIAnalysis } from "../../types/flow";

interface FlowMFIChartProps {
	mfi: MFIAnalysis;
	height?: number;
}

export function FlowMFIChart({ mfi, height = 150 }: FlowMFIChartProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container || mfi.values.length === 0) return;

		const chart = createChart(container, {
			width: container.clientWidth,
			height,
			layout: {
				background: { color: "#0a0a0a" },
				textColor: "#a3a3a3",
				fontFamily: "'JetBrains Mono', monospace",
				fontSize: 10,
			},
			grid: {
				vertLines: { color: "#1a1a1a" },
				horzLines: { color: "#1a1a1a" },
			},
			crosshair: { mode: 0 },
			rightPriceScale: {
				borderColor: "#262626",
				autoScale: false,
				scaleMargins: { top: 0.05, bottom: 0.05 },
			},
			timeScale: { borderColor: "#262626", visible: false },
		});
		chartRef.current = chart;

		// Set fixed scale for 0-100
		chart.priceScale("right").applyOptions({
			autoScale: false,
		});

		const lineOpts: DeepPartial<LineSeriesOptions> = {
			color: "#f59e0b",
			lineWidth: 2,
			priceFormat: { type: "custom", formatter: (v: number) => v.toFixed(0) },
		};
		const series = chart.addSeries(LineSeries, lineOpts);
		series.setData(
			mfi.values.map((p) => ({
				time: p.date as string,
				value: p.value,
			})),
		);

		// Overbought/oversold reference lines
		series.createPriceLine({
			price: 80,
			color: "#ef444480",
			lineWidth: 1,
			lineStyle: 2, // dashed
			axisLabelVisible: true,
			title: "OB",
		});
		series.createPriceLine({
			price: 20,
			color: "#22c55e80",
			lineWidth: 1,
			lineStyle: 2,
			axisLabelVisible: true,
			title: "OS",
		});
		series.createPriceLine({
			price: 50,
			color: "#ffffff20",
			lineWidth: 1,
			lineStyle: 2,
			axisLabelVisible: false,
			title: "",
		});

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
	}, [mfi, height]);

	return (
		<div>
			<div className="flex items-center justify-between px-1 pb-1">
				<span className="font-mono text-[10px] uppercase tracking-wider text-t-text-muted">
					MFI (14)
				</span>
				<span
					className={`font-mono text-xs font-medium ${
						mfi.signal === "overbought"
							? "text-t-red"
							: mfi.signal === "oversold"
								? "text-t-green"
								: "text-t-text-secondary"
					}`}
				>
					{mfi.current.toFixed(0)}
				</span>
			</div>
			<div ref={containerRef} style={{ height }} className="w-full" />
		</div>
	);
}
