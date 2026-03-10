import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useIdxCompanyFull(kode: string) {
	return useQuery({
		queryKey: ["idx-company-full", kode],
		queryFn: () => api.idxCompanyFull(kode),
		enabled: kode.length > 0,
		staleTime: 300_000,
	});
}

export function useIdxFinancialSummary(kode: string) {
	return useQuery({
		queryKey: ["idx-financial-summary", kode],
		queryFn: () => api.idxFinancialSummary(kode),
		enabled: kode.length > 0,
		staleTime: 300_000,
	});
}
