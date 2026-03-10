import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { NewsParams } from "../types/market";

export function useNews(params: NewsParams) {
	return useQuery({
		queryKey: [
			"news",
			params.category ?? "all",
			params.ticker ?? "all",
			params.hours ?? 24,
			params.limit ?? 20,
		],
		queryFn: () => api.news(params),
		staleTime: 60_000,
		refetchInterval: 300_000,
	});
}
