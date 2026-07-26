import { create } from "zustand";

type PresentationModeStore = {
	enabled: boolean;
	setEnabled: (enabled: boolean) => void;
};

export const usePresentationModeStore = create<PresentationModeStore>((set) => ({
	enabled: false,
	setEnabled: (enabled) => set({ enabled }),
}));
