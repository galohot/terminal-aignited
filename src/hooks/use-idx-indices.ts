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
