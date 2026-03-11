import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useDashboard() {
	return useQuery({
		queryKey: ["dashboard"],
		queryFn: () => api.dashboard(),
		refetchInterval: 30_000,
		staleTime: 10_000,
	});
}
