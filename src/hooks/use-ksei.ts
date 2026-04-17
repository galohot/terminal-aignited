import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

const KSEI_STALE = 300_000; // 5 min — data only changes on new KSEI snapshot

export function useKseiStats() {
	return useQuery({
		queryKey: ["ksei-stats"],
		queryFn: () => api.kseiStats(),
		staleTime: KSEI_STALE,
	});
}

export function useKseiRecords(params: Parameters<typeof api.kseiRecords>[0]) {
	return useQuery({
		queryKey: ["ksei-records", params],
		queryFn: () => api.kseiRecords(params),
		staleTime: KSEI_STALE,
	});
}

export function useKseiCompany(kode: string) {
	return useQuery({
		queryKey: ["ksei-company", kode],
		queryFn: () => api.kseiCompany(kode),
		enabled: !!kode,
		staleTime: KSEI_STALE,
	});
}

export function useKseiInvestor(name: string) {
	return useQuery({
		queryKey: ["ksei-investor", name],
		queryFn: () => api.kseiInvestor(name),
		enabled: !!name,
		staleTime: KSEI_STALE,
	});
}

export function useKseiTypeDistribution() {
	return useQuery({
		queryKey: ["ksei-type-distribution"],
		queryFn: () => api.kseiTypeDistribution(),
		staleTime: KSEI_STALE,
	});
}

export function useKseiLocalForeign() {
	return useQuery({
		queryKey: ["ksei-local-foreign"],
		queryFn: () => api.kseiLocalForeign(),
		staleTime: KSEI_STALE,
	});
}

export function useKseiConcentration() {
	return useQuery({
		queryKey: ["ksei-concentration"],
		queryFn: () => api.kseiConcentration(),
		staleTime: KSEI_STALE,
	});
}

export function useKseiHeatmap(top = 40) {
	return useQuery({
		queryKey: ["ksei-heatmap", top],
		queryFn: () => api.kseiHeatmap(top),
		staleTime: KSEI_STALE,
	});
}

export function useKseiChord() {
	return useQuery({
		queryKey: ["ksei-chord"],
		queryFn: () => api.kseiChord(),
		staleTime: KSEI_STALE,
	});
}

export function useKseiGraph(params: Parameters<typeof api.kseiGraph>[0]) {
	return useQuery({
		queryKey: ["ksei-graph", params],
		queryFn: () => api.kseiGraph(params),
		staleTime: KSEI_STALE,
	});
}

export function useKseiClusters() {
	return useQuery({
		queryKey: ["ksei-clusters"],
		queryFn: () => api.kseiClusters(),
		staleTime: KSEI_STALE,
	});
}

export function useKseiSankey() {
	return useQuery({
		queryKey: ["ksei-sankey"],
		queryFn: () => api.kseiSankey(),
		staleTime: KSEI_STALE,
	});
}

export function useKseiTreemap(kode: string) {
	return useQuery({
		queryKey: ["ksei-treemap", kode],
		queryFn: () => api.kseiTreemap(kode),
		enabled: !!kode,
		staleTime: KSEI_STALE,
	});
}

export function useKseiCompanies(params: Parameters<typeof api.kseiCompanies>[0]) {
	return useQuery({
		queryKey: ["ksei-companies", params],
		queryFn: () => api.kseiCompanies(params),
		staleTime: KSEI_STALE,
	});
}

export function useMacroOverview() {
	return useQuery({
		queryKey: ["macro-overview"],
		queryFn: () => api.macroOverview(),
		staleTime: 600_000, // 10 min — macro data changes rarely
	});
}

export function useKseiInvestors(params: Parameters<typeof api.kseiInvestors>[0]) {
	return useQuery({
		queryKey: ["ksei-investors", params],
		queryFn: () => api.kseiInvestors(params),
		staleTime: KSEI_STALE,
	});
}
