import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useHeatmap() {
	return useQuery({
		queryKey: ["idx-heatmap"],
		queryFn: () => api.idxHeatmap(),
		staleTime: 60_000,
		refetchInterval: 60_000,
	});
}
