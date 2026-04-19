import { useQuery } from "@tanstack/react-query";

// Now served via market-api through the CF Worker proxy (previously hit fiskal-api directly)
const BASE = "/api/proxy";

async function fetchConsensus<T>(endpoint: string): Promise<T> {
	const res = await fetch(`${BASE}${endpoint}`);
	if (!res.ok) throw new Error(`Consensus API ${res.status}`);
	return res.json();
}

export interface ConsensusSummary {
	date: string;
	total: number;
	strong_buy: number;
	buy: number;
	neutral: number;
	sell: number;
	strong_sell: number;
}

export interface ConsensusSignal {
	ticker: string;
	consensus: string;
	score: number;
	bullish: number;
	bearish: number;
	neutral: number;
}

export interface ConsensusDetail {
	ticker: string;
	consensus: string;
	score: number;
	bullish_count: number;
	bearish_count: number;
	neutral_count: number;
	confidence: number;
	computed_at: string;
	strategies: {
		strategy: string;
		signal: string;
		strength: number;
		reason: string;
	}[];
}

export function useConsensusSummary() {
	return useQuery({
		queryKey: ["consensus", "summary"],
		queryFn: () => fetchConsensus<ConsensusSummary>("/consensus/summary"),
		staleTime: 5 * 60 * 1000,
	});
}

export function useConsensusTop(signal: "buy" | "sell" | "all", limit = 20) {
	return useQuery({
		queryKey: ["consensus", "top", signal, limit],
		queryFn: () =>
			fetchConsensus<{ data: ConsensusSignal[] }>(`/consensus/top?signal=${signal}&limit=${limit}`),
		staleTime: 5 * 60 * 1000,
	});
}

export function useConsensusDetail(ticker: string | null) {
	return useQuery({
		queryKey: ["consensus", "detail", ticker],
		queryFn: () => fetchConsensus<ConsensusDetail>(`/consensus/${ticker}`),
		enabled: !!ticker,
		staleTime: 5 * 60 * 1000,
	});
}
