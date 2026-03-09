import { create } from "zustand";
import type { PriceUpdate } from "../types/ws";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface PriceData {
	price: number;
	change: number;
	changePercent: number;
	volume: number;
	timestamp: string;
}

interface RealtimeStore {
	prices: Record<string, PriceData>;
	status: ConnectionStatus;
	setStatus: (status: ConnectionStatus) => void;
	setSnapshot: (data: PriceUpdate[]) => void;
	updatePrice: (update: PriceUpdate) => void;
}

export const useRealtimeStore = create<RealtimeStore>((set) => ({
	prices: {},
	status: "disconnected",
	setStatus: (status) => set({ status }),
	setSnapshot: (data) =>
		set({
			prices: Object.fromEntries(
				data.map((d) => [
					d.symbol,
					{
						price: d.price,
						change: d.change,
						changePercent: d.change_percent,
						volume: d.volume,
						timestamp: d.timestamp ?? "",
					},
				]),
			),
		}),
	updatePrice: (update) =>
		set((state) => ({
			prices: {
				...state.prices,
				[update.symbol]: {
					price: update.price,
					change: update.change,
					changePercent: update.change_percent,
					volume: update.volume,
					timestamp: update.timestamp ?? "",
				},
			},
		})),
}));
