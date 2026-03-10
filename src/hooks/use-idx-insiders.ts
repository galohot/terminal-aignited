import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useIdxInsiderSearch(name: string) {
	return useQuery({
		queryKey: ["idx-insider-search", name],
		queryFn: () => api.idxInsiderSearch(name),
		enabled: name.length >= 2,
		staleTime: 300_000,
	});
}
