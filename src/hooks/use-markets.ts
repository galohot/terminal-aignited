import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useMarkets() {
	return useQuery({
		queryKey: ["markets"],
		queryFn: () => api.markets(),
		refetchInterval: 30_000,
		staleTime: 10_000,
	});
}
