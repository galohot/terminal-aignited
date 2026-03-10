interface ApacMarket {
	name: string;
	code: string;
	timezone: string;
	openHour: number;
	openMinute: number;
	closeHour: number;
	closeMinute: number;
	label: string;
}

export interface ApacSessionStatus {
	name: string;
	code: string;
	localTime: string;
	isOpen: boolean;
	label: string;
}

const APAC_MARKETS: ApacMarket[] = [
	{
		name: "Jakarta",
		code: "IDX",
		timezone: "Asia/Jakarta",
		openHour: 9,
		openMinute: 0,
		closeHour: 15,
		closeMinute: 0,
		label: "WIB",
	},
	{
		name: "Tokyo",
		code: "TSE",
		timezone: "Asia/Tokyo",
		openHour: 9,
		openMinute: 0,
		closeHour: 15,
		closeMinute: 0,
		label: "JST",
	},
	{
		name: "Hong Kong",
		code: "HKEX",
		timezone: "Asia/Hong_Kong",
		openHour: 9,
		openMinute: 30,
		closeHour: 16,
		closeMinute: 0,
		label: "HKT",
	},
	{
		name: "Singapore",
		code: "SGX",
		timezone: "Asia/Singapore",
		openHour: 9,
		openMinute: 0,
		closeHour: 17,
		closeMinute: 0,
		label: "SGT",
	},
	{
		name: "Seoul",
		code: "KRX",
		timezone: "Asia/Seoul",
		openHour: 9,
		openMinute: 0,
		closeHour: 15,
		closeMinute: 30,
		label: "KST",
	},
	{
		name: "Sydney",
		code: "ASX",
		timezone: "Australia/Sydney",
		openHour: 10,
		openMinute: 0,
		closeHour: 16,
		closeMinute: 0,
		label: "AEDT",
	},
	{
		name: "Bangkok",
		code: "SET",
		timezone: "Asia/Bangkok",
		openHour: 10,
		openMinute: 0,
		closeHour: 16,
		closeMinute: 30,
		label: "ICT",
	},
];

export function getApacSessions(): ApacSessionStatus[] {
	const now = new Date();

	return APAC_MARKETS.map((market) => {
		const parts = new Intl.DateTimeFormat("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			weekday: "short",
			hour12: false,
			timeZone: market.timezone,
		}).formatToParts(now);

		const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
		const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
		const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
		const localTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

		const isWeekend = weekday === "Sat" || weekday === "Sun";
		const totalMinutes = hour * 60 + minute;
		const openMinutes = market.openHour * 60 + market.openMinute;
		const closeMinutes = market.closeHour * 60 + market.closeMinute;
		const isOpen = !isWeekend && totalMinutes >= openMinutes && totalMinutes < closeMinutes;

		return {
			name: market.name,
			code: market.code,
			localTime: `${localTime} ${market.label}`,
			isOpen,
			label: market.label,
		};
	});
}
