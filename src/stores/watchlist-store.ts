import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WatchlistStore {
	symbols: string[];
	addSymbol: (symbol: string) => void;
	removeSymbol: (symbol: string) => void;
	reorder: (from: number, to: number) => void;
	hasSymbol: (symbol: string) => boolean;
}

export const useWatchlistStore = create<WatchlistStore>()(
	persist(
		(set, get) => ({
			symbols: ["^JKSE", "BBCA.JK", "AAPL", "BTC-USD", "GC=F"],
			addSymbol: (symbol) =>
				set((s) => ({
					symbols: s.symbols.includes(symbol) ? s.symbols : [...s.symbols, symbol],
				})),
			removeSymbol: (symbol) =>
				set((s) => ({ symbols: s.symbols.filter((sym) => sym !== symbol) })),
			reorder: (from, to) =>
				set((s) => {
					const arr = [...s.symbols];
					const [item] = arr.splice(from, 1);
					arr.splice(to, 0, item);
					return { symbols: arr };
				}),
			hasSymbol: (symbol) => get().symbols.includes(symbol),
		}),
		{ name: "terminal:watchlist" },
	),
);
