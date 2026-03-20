import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useMarketBreadth(days = 30) {
	return useQuery({
		queryKey: ["market-breadth", days],
		queryFn: () => api.idxMarketBreadth({ days }),
		staleTime: 300_000,
	});
}
