import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useIdxBrokers() {
	return useQuery({
		queryKey: ["idx-brokers"],
		queryFn: () => api.idxBrokers(),
		staleTime: 600_000,
	});
}
