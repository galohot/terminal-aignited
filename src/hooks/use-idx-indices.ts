import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useIdxIndices() {
	return useQuery({
		queryKey: ["idx-indices"],
		queryFn: () => api.idxIndices(),
		staleTime: 60_000,
		refetchInterval: 300_000,
	});
}

export function useIdxIndexHistory(name: string, days = 30) {
	return useQuery({
		queryKey: ["idx-index-history", name, days],
		queryFn: () => api.idxIndexHistory(name, days),
		enabled: name.length > 0,
		staleTime: 300_000,
	});
}
