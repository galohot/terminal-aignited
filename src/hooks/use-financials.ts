import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useFinancials(
	symbol: string,
	type: "income" | "balance" | "cashflow",
	period: "annual" | "quarterly",
) {
	return useQuery({
		queryKey: ["financials", symbol, type, period],
		queryFn: () => api.financials(symbol, type, period),
		staleTime: 5 * 60_000,
		enabled: !!symbol && !symbol.startsWith("^"),
	});
}
