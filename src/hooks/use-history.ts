import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useHistory(symbol: string, period: string, interval: string) {
	return useQuery({
		queryKey: ["history", symbol, period, interval],
		queryFn: () => api.history(symbol, { period, interval }),
		staleTime: 60_000,
		enabled: !!symbol,
	});
}
