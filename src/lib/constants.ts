export const PERIOD_OPTIONS = [
	{ label: "1D", period: "1d", interval: "5m" },
	{ label: "5D", period: "5d", interval: "5m" },
	{ label: "1M", period: "1mo", interval: "1d" },
	{ label: "3M", period: "3mo", interval: "1d" },
	{ label: "6M", period: "6mo", interval: "1d" },
	{ label: "1Y", period: "1y", interval: "1d" },
	{ label: "2Y", period: "2y", interval: "1wk" },
	{ label: "5Y", period: "5y", interval: "1wk" },
	{ label: "MAX", period: "max", interval: "1mo" },
] as const;

export const DEFAULT_PERIOD_INDEX = 5; // 1Y
