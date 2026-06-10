import { create } from "zustand";

type DriverSelectionStore = {
	selectedDriver: string | null;
	comparedDrivers: string[];
	setSelectedDriver: (driver: string | null) => void;
	toggleComparedDriver: (driver: string) => void;
	clearComparedDrivers: () => void;
};

export const useDriverSelectionStore = create<DriverSelectionStore>((set) => ({
	selectedDriver: null,
	comparedDrivers: [],
	setSelectedDriver: (selectedDriver) => set({ selectedDriver }),
	toggleComparedDriver: (driver) =>
		set((state) => {
			if (state.comparedDrivers.includes(driver)) {
				return { comparedDrivers: state.comparedDrivers.filter((item) => item !== driver) };
			}

			return { comparedDrivers: [...state.comparedDrivers, driver].slice(-2) };
		}),
	clearComparedDrivers: () => set({ comparedDrivers: [] }),
}));
