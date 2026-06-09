import { create } from "zustand";

type ReplaySpeed = 0.5 | 1 | 2 | 5;

type ReplayControlStore = {
	isPaused: boolean;
	speed: ReplaySpeed;
	seekOffsetMs: number;
	setPaused: (isPaused: boolean) => void;
	setSpeed: (speed: ReplaySpeed) => void;
	jumpBy: (deltaMs: number) => void;
	resetReplayControls: () => void;
};

export const useReplayControlStore = create<ReplayControlStore>((set) => ({
	isPaused: false,
	speed: 1,
	seekOffsetMs: 0,
	setPaused: (isPaused) => set({ isPaused }),
	setSpeed: (speed) => set({ speed }),
	jumpBy: (deltaMs) => set((state) => ({ seekOffsetMs: state.seekOffsetMs + deltaMs })),
	resetReplayControls: () => set({ isPaused: false, speed: 1, seekOffsetMs: 0 }),
}));
