import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useIdxEntityGroups() {
	return useQuery({
		queryKey: ["idx-entity-groups"],
		queryFn: () => api.idxEntityGroups(),
		staleTime: 600_000,
	});
}

export function useIdxEntityGroupHoldings(group: string) {
	return useQuery({
		queryKey: ["idx-entity-group-holdings", group],
		queryFn: () => api.idxEntityGroupHoldings(group),
		enabled: group.length > 0,
		staleTime: 300_000,
	});
}

export function useIdxTopConnectors(params?: { limit?: number; type?: string }) {
	return useQuery({
		queryKey: ["idx-top-connectors", params],
		queryFn: () => api.idxTopConnectors(params),
		staleTime: 300_000,
	});
}
