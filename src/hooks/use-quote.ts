import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useQuote(symbol: string) {
	return useQuery({
		queryKey: ["quote", symbol],
		queryFn: () => api.quote(symbol),
		refetchInterval: 30_000,
		staleTime: 10_000,
		enabled: !!symbol,
	});
}
