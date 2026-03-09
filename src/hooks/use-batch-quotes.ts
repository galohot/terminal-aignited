import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useBatchQuotes(symbols: string[]) {
	return useQuery({
		queryKey: ["batch-quotes", [...symbols].sort().join(",")],
		queryFn: () => api.batchQuotes(symbols),
		enabled: symbols.length > 0,
		refetchInterval: 30_000,
	});
}
