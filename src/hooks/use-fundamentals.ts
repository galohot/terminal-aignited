import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useFundamentals(symbol: string) {
	return useQuery({
		queryKey: ["fundamentals", symbol],
		queryFn: () => api.fundamentals(symbol),
		staleTime: 300_000,
		enabled: !!symbol,
	});
}
