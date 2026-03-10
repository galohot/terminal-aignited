import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useIdxCompany(kode: string) {
	return useQuery({
		queryKey: ["idx-company", kode],
		queryFn: () => api.idxCompany(kode),
		enabled: kode.length > 0,
		staleTime: 300_000,
	});
}

export function useIdxFinancials(kode: string) {
	return useQuery({
		queryKey: ["idx-financials", kode],
		queryFn: () => api.idxFinancials(kode),
		enabled: kode.length > 0,
		staleTime: 300_000,
	});
}
