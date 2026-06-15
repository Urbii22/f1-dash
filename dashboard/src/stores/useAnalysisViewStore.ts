import { create } from "zustand";

export type AnalysisTab = "pace" | "positions" | "stints" | "strategy" | "insights" | "speed" | "quali";

type AnalysisViewStore = {
	activeTab: AnalysisTab;
	selectedDrivers: string[] | null;
	setActiveTab: (activeTab: AnalysisTab) => void;
	setSelectedDrivers: (selectedDrivers: string[] | null) => void;
};

export const useAnalysisViewStore = create<AnalysisViewStore>((set) => ({
	activeTab: "pace",
	selectedDrivers: null,
	setActiveTab: (activeTab) => set({ activeTab }),
	setSelectedDrivers: (selectedDrivers) => set({ selectedDrivers }),
}));
