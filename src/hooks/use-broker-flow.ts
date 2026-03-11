import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { IdxBrokerFlowParams } from "../types/flow";

export function useIdxBrokerFlow(params?: IdxBrokerFlowParams) {
	return useQuery({
		queryKey: ["idx-broker-flow", params],
		queryFn: () => api.idxBrokerFlow(params),
		staleTime: 300_000,
	});
}

export function useIdxBrokerFlowHistory(code: string, days = 30) {
	return useQuery({
		queryKey: ["idx-broker-flow-history", code, days],
		queryFn: () => api.idxBrokerFlowHistory(code, days),
		staleTime: 300_000,
		enabled: !!code,
	});
}
