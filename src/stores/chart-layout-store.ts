import { create } from "zustand";

export type LayoutMode = "single" | "split" | "quad" | "triple";

const LAYOUT_CYCLE: LayoutMode[] = ["single", "split", "triple", "quad"];

interface ChartLayoutStore {
	layout: LayoutMode;
	symbols: string[];
	compareMode: boolean;
	setLayout: (layout: LayoutMode) => void;
	cycleLayout: () => void;
	setSymbol: (index: number, symbol: string) => void;
	setCompareMode: (on: boolean) => void;
	toggleCompare: () => void;
}

export const useChartLayoutStore = create<ChartLayoutStore>((set) => ({
	layout: "single",
	symbols: ["", "", "", ""],
	compareMode: false,
	setLayout: (layout) => set({ layout }),
	cycleLayout: () =>
		set((s) => {
			const idx = LAYOUT_CYCLE.indexOf(s.layout);
			const next = LAYOUT_CYCLE[(idx + 1) % LAYOUT_CYCLE.length];
			return { layout: next };
		}),
	setSymbol: (index, symbol) =>
		set((s) => {
			const symbols = [...s.symbols];
			symbols[index] = symbol;
			return { symbols };
		}),
	setCompareMode: (on) => set({ compareMode: on }),
	toggleCompare: () => set((s) => ({ compareMode: !s.compareMode })),
}));

export function slotCount(layout: LayoutMode): number {
	switch (layout) {
		case "single":
			return 1;
		case "split":
			return 2;
		case "triple":
			return 3;
		case "quad":
			return 4;
	}
}
