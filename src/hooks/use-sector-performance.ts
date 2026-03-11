import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useSectorPerformance() {
	return useQuery({
		queryKey: ["idx-sector-performance"],
		queryFn: () => api.idxSectorPerformance(),
		staleTime: 300_000,
	});
}
