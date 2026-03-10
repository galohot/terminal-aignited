import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { IdxCompaniesParams } from "../types/market";

export function useIdxCompanies(params: IdxCompaniesParams) {
	return useQuery({
		queryKey: ["idx-companies", params.search, params.sector, params.limit, params.offset],
		queryFn: () => api.idxCompanies(params),
		staleTime: 300_000,
	});
}
