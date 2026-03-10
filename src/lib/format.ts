const compactFormatter = new Intl.NumberFormat("en-US", {
	notation: "compact",
	maximumFractionDigits: 2,
});

const volumeFormatter = new Intl.NumberFormat("en-US", {
	notation: "compact",
	maximumFractionDigits: 1,
});

export function formatPrice(price: number, currency = "USD"): string {
	if (price >= 10_000) {
		return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
	}
	if (price >= 1) {
		return price.toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	}
	// Small prices (crypto, penny stocks)
	return price.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: currency === "USD" ? 4 : 2,
	});
}

export function formatChange(value: number): string {
	const sign = value >= 0 ? "+" : "";
	return `${sign}${formatPrice(Math.abs(value))}`;
}

export function formatPercent(value: number): string {
	const sign = value >= 0 ? "+" : "";
	return `${sign}${value.toFixed(2)}%`;
}

export function formatVolume(volume: number | null | undefined): string {
	if (volume == null || Number.isNaN(volume)) return "—";
	return volumeFormatter.format(volume);
}

export function formatMarketCap(value: number | null): string {
	if (value == null) return "—";
	return compactFormatter.format(value);
}

export function formatTime(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZone: "UTC",
	});
}
