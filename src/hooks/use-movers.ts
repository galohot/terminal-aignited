import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { MoversParams } from "../types/market";

export function useMovers(params: MoversParams) {
	return useQuery({
		queryKey: ["idx-movers", params],
		queryFn: () => api.idxMovers(params),
		staleTime: 60_000,
		refetchInterval: 60_000,
	});
}
