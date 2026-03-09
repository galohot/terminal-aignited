import { formatPercent, formatPrice } from "../../lib/format";

interface PriceChangeProps {
	value: number;
	percent: number;
	showValue?: boolean;
}

export function PriceChange({ value, percent, showValue = true }: PriceChangeProps) {
	const color = value >= 0 ? "text-t-green" : "text-t-red";
	const arrow = value >= 0 ? "▲" : "▼";
	return (
		<span className={`font-mono ${color}`}>
			{arrow} {showValue && <>{formatPrice(Math.abs(value))} </>}({formatPercent(percent)})
		</span>
	);
}
