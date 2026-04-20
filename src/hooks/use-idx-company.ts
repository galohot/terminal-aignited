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

export function useIdxBrokerSummary(kode: string) {
	return useQuery({
		queryKey: ["idx-broker-summary", kode],
		queryFn: () => api.idxBrokerSummary(kode),
		enabled: kode.length > 0,
		staleTime: 300_000,
	});
}

export function useIdxInsiderTransactions(kode: string) {
	return useQuery({
		queryKey: ["idx-insider-transactions", kode],
		queryFn: () => api.idxInsiderTransactions(kode),
		enabled: kode.length > 0,
		staleTime: 300_000,
	});
}

export function useIdxForeignFlow(kode: string, days = 30) {
	return useQuery({
		queryKey: ["idx-foreign-flow", kode, days],
		queryFn: () => api.idxForeignFlow(kode, days),
		enabled: kode.length > 0,
		staleTime: 300_000,
	});
}

export function useIdxDisclosures(kode?: string, limit = 20) {
	return useQuery({
		queryKey: ["idx-disclosures", kode, limit],
		queryFn: () => api.idxDisclosures({ kode, limit }),
		staleTime: 300_000,
	});
}

export function useIdxPeersScored(kode: string, limit = 10) {
	return useQuery({
		queryKey: ["idx-peers-scored", kode, limit],
		queryFn: () => api.idxPeersScored(kode, limit),
		enabled: kode.length > 0,
		staleTime: 300_000,
	});
}
