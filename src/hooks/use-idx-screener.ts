import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { IdxScreenerParams } from "../types/market";

export function useIdxScreener(params: IdxScreenerParams) {
	return useQuery({
		queryKey: ["idx-screener", params],
		queryFn: () => api.idxScreener(params),
		staleTime: 300_000,
	});
}

export function useIdxSectors() {
	return useQuery({
		queryKey: ["idx-sectors"],
		queryFn: () => api.idxSectors(),
		staleTime: 600_000,
	});
}
