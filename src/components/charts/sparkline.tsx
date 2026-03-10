import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useRealtimeStore } from "../../stores/realtime-store";

interface SparklineProps {
	symbol: string;
	width?: number;
	height?: number;
	positive?: boolean;
}

export function Sparkline({ symbol, width = 80, height = 24, positive = true }: SparklineProps) {
	const { data } = useQuery({
		queryKey: ["sparkline", symbol],
		queryFn: () => api.history(symbol, { period: "5d", interval: "1d" }),
		staleTime: 300_000,
		enabled: !!symbol,
	});

	const realtimePrice = useRealtimeStore((s) => s.prices[symbol]);

	const points = data?.data;
	if (!points || points.length < 2) {
		return (
			<svg
				width={width}
				height={height}
				className="shrink-0"
				role="img"
				aria-label={`${symbol} sparkline`}
			>
				<title>{symbol} price trend</title>
			</svg>
		);
	}

	// Use historical closes, optionally append today's realtime price
	const closes = points.map((p) => p.close);
	if (realtimePrice) {
		closes[closes.length - 1] = realtimePrice.price;
	}

	const min = Math.min(...closes);
	const max = Math.max(...closes);
	const range = max - min || 1;

	const pad = 2;
	const innerW = width - pad * 2;
	const innerH = height - pad * 2;

	const pathData = closes
		.map((v, i) => {
			const x = pad + (i / (closes.length - 1)) * innerW;
			const y = pad + innerH - ((v - min) / range) * innerH;
			return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");

	const color = positive ? "#22c55e" : "#ef4444";

	return (
		<svg
			width={width}
			height={height}
			className="shrink-0"
			role="img"
			aria-label={`${symbol} sparkline`}
		>
			<title>{symbol} 5-day trend</title>
			<path
				d={pathData}
				fill="none"
				stroke={color}
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
